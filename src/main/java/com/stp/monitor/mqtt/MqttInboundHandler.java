package com.stp.monitor.mqtt;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stp.monitor.entity.AlarmRecord;
import com.stp.monitor.entity.MonitorHistoryInfo;
import com.stp.monitor.service.AlarmRecordService;
import com.stp.monitor.service.MonitorConfigCache;
import com.stp.monitor.service.MonitorHistoryInfoService;
import com.stp.monitor.service.MonitorRuntimeConfig;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MqttInboundHandler {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MonitorConfigCache monitorConfigCache;

    @Autowired
    private MonitorHistoryInfoService monitorHistoryInfoService;

    @Autowired
    private AlarmRecordService alarmRecordService;

    /** 组合寄存器监控点：值为无符号16位，按 bit 拆分为多个子监控点 */
    private static final Set<String> REGISTER_MONITOR_IDS = Set.of(
            "REGISTER_40001", "REGISTER_40002", "REGISTER_40003",
            "REGISTER_40004", "REGISTER_40005", "REGISTER_40006");

    /**
     * 处理 /UploadTopicNB 接收到的 JSON 消息
     * 解析以 monitorId 为 key、value 为采集值的 JSON，补齐监控点名称后写入历史表
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handle(@Payload String payload,
            @Header(value = "mqtt_topic", required = false) String topic) {
        log.info("收到 MQTT 消息，topic={}，payload={}", topic, payload);
        parseAndSave(payload);
    }

    private void parseAndSave(String payload) {
        if (!StringUtils.hasText(payload)) {
            return;
        }
        try {
            Map<String, Object> data = objectMapper.readValue(payload, new TypeReference<Map<String, Object>>() {
            });
            data.forEach((monitorId, value) -> {
                String monitorValue = value != null ? value.toString() : "";
                if (!StringUtils.hasText(monitorValue)) {
                    return;
                }
                // 边缘网关轮询PLC失败，value 为 error，不处理
                if ("error".equals(monitorValue)) {
                    return;
                }
                // 边缘网关未设置监控点 ID 与采集值相同，不处理
                if (monitorId.equals(monitorValue)) {
                    return;
                }
                // REGISTER_40001~40006 为无符号16位组合寄存器，拆分为多个子监控点(组合位)值
                if (isRegisterMonitorId(monitorId)) {
                    parseRegister(monitorId, monitorValue);
                    return;
                }
                MonitorRuntimeConfig config = monitorConfigCache.getByMonitorId(monitorId);
                if (config == null) {
                    log.warn("未找到监控点配置，monitorId={}", monitorId);
                    return;
                }
                // 更新缓存并保存历史记录
                updateAndSaveConfig(config, monitorValue);
            });
        } catch (Exception e) {
            log.error("MQTT 消息解析或保存失败，payload={}", payload, e);
        }
    }

    /**
     * 解析组合寄存器值：REGISTER_40001~40006 的值为无符号16位整数，
     * 根据位号在其对应的寄存器码表中取各 DeviceBit 的 monitorId，
     * 逐个计算 bit 值(0/1)并更新缓存、保存历史记录。
     */
    private void parseRegister(String registerId, String monitorValue) {
        int raw;
        try {
            raw = Integer.parseUnsignedInt(monitorValue);
        } catch (NumberFormatException e) {
            log.warn("组合寄存器值非无符号整数，monitorId={}，value={}", registerId, monitorValue);
            return;
        }
        Integer address = registerAddressOf(registerId);
        List<ModbusRegisterParser.DeviceBit> bitMapping = address == null ? null : ModbusRegisterParser.REGISTER_MAP.get(address);
        if (bitMapping == null) {
            log.warn("寄存器无对应码表，monitorId={}", registerId);
            return;
        }
        for (ModbusRegisterParser.DeviceBit bit : bitMapping) {
            MonitorRuntimeConfig config = monitorConfigCache.getByMonitorId(bit.getMonitorId());
            if (config == null) {
                continue;
            }
            int bitValue = (raw >> bit.getBitPosition()) & 1;
            updateAndSaveConfig(config, String.valueOf(bitValue));
        }
    }

    /** 将 REGISTER_40001 形式的监控点 ID 解析为寄存器地址(40001) */
    private Integer registerAddressOf(String registerId) {
        try {
            return Integer.parseInt(registerId.replace("REGISTER_", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * 统一更新缓存并保存历史记录，同时处理 LIGHT 指示灯 0/1 跳变告警
     */
    private void updateAndSaveConfig(MonitorRuntimeConfig config, String monitorValue) {
        // 当前值与缓存中的值一致时跳过，避免重复更新缓存、重复保存历史记录
        if (monitorValue.equals(config.getMonitorValue())) {
            return;
        }
        // 记录更新前的值，用于 LIGHT 指示灯 0/1 跳变判断
        String prevValue = config.getMonitorValue();
        handleLightTransition(config, prevValue, monitorValue);

        monitorConfigCache.updateMonitorValue(config.getMonitorId(), monitorValue);
        config.setMonitorValue(monitorValue);

        MonitorHistoryInfo history = new MonitorHistoryInfo();
        history.setMonitorId(config.getMonitorId());
        history.setMonitorName(config.getMonitorName());
        history.setMonitorValue(monitorValue);
        monitorHistoryInfoService.save(history);
        log.info("MQTT 数据已保存，monitorId={}，value={}", config.getMonitorId(), monitorValue);
    }

    private boolean isRegisterMonitorId(String monitorId) {
        return REGISTER_MONITOR_IDS.contains(monitorId);
    }

    /**
     * LIGHT 指示灯监控点跳变处理：
     * 0 → 1 时插入一条未处理告警；1 → 0 时将同监控点全部未处理告警置为已处理。
     */
    private void handleLightTransition(MonitorRuntimeConfig config, String prevValue, String newValue) {
        if (!"LIGHT".equals(config.getShowType())) {
            return;
        }
        boolean rising = "0".equals(prevValue) && "1".equals(newValue);
        boolean falling = "1".equals(prevValue) && "0".equals(newValue);
        if (rising) {
            AlarmRecord record = new AlarmRecord();
            record.setMonitorId(config.getMonitorId());
            record.setMonitorName(config.getMonitorName());
            // 0-未处理
            record.setStatus(0);
            record.setMessage(config.getMonitorName() + " 触发告警");
            alarmRecordService.save(record);
            log.info("LIGHT 监控点触发告警，monitorId={}，value=1", config.getMonitorId());
        } else if (falling) {
            List<AlarmRecord> unhandled = alarmRecordService.findByMonitorIdAndStatus(config.getMonitorId(), 0);
            unhandled.forEach(record -> {
                // 1-已处理
                record.setStatus(1);
                alarmRecordService.save(record);
            });
            log.info("LIGHT 监控点恢复，monitorId={}，已自动处理 {} 条告警", config.getMonitorId(), unhandled.size());
        }
    }
}
