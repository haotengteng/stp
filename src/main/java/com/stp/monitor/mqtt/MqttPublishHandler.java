package com.stp.monitor.mqtt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stp.monitor.entity.MonitorOperationHistory;
import com.stp.monitor.service.MonitorConfigCache;
import com.stp.monitor.service.MonitorOperationHistoryService;
import com.stp.monitor.service.MonitorRuntimeConfig;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@ConditionalOnProperty(prefix = "mqtt", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MqttPublishHandler {

    @Autowired
    @Qualifier("mqttOutputChannel")
    private MessageChannel mqttOutputChannel;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MonitorConfigCache monitorConfigCache;

    @Autowired
    private MonitorOperationHistoryService monitorOperationHistoryService;

    /**
     * 向默认下发 topic（/DownloadTopicNB）发送 JSON 消息，preValue 取缓存当前值
     */
    public void publish(String monitorId, String value) {
        publish(monitorId, value, null, null);
    }

    /**
     * 向默认下发 topic（/DownloadTopicNB）发送 JSON 消息
     *
     * @param preValue 操作前值，为空时回退取缓存当前值
     * @param operator 操作人
     */
    public void publish(String monitorId, String value, String preValue, String operator) {
        String operationId = generateOperationId();
        saveOperationHistory(monitorId, value, preValue, operator, operationId);

        String[] resolved = resolvePublishMonitor(monitorId, value);
        String payload = buildControlJson(resolved[0], resolved[1], operationId);
        mqttOutputChannel.send(MessageBuilder.withPayload(payload).build());
        log.info("MQTT 下发消息，monitorId={}，publishMonitorId={}，payload={}", monitorId, resolved[0], payload);
    }

    /**
     * 向指定 topic 发送 JSON 消息
     */
    public void publish(String topic, String monitorId, String value) {
        String operationId = generateOperationId();
        saveOperationHistory(monitorId, value, null, null, operationId);

        String[] resolved = resolvePublishMonitor(monitorId, value);
        String payload = buildControlJson(resolved[0], resolved[1], operationId);
        mqttOutputChannel.send(MessageBuilder
                .withPayload(payload)
                .setHeader(MqttHeaders.TOPIC, topic)
                .build());
        log.info("MQTT 下发消息，topic={}，monitorId={}，publishMonitorId={}，payload={}", topic, monitorId, resolved[0], payload);
    }

    /**
     * 若监控点属于组合寄存器(REGISTER_40001~40006)中的某一 bit 位，
     * 则从缓存读取该寄存器所有 bit 当前值组装出完整的 16 位值，
     * 并改为使用寄存器名作为下发 monitorId；非组合位返回原值原样下发。
     *
     * @return [下发的 monitorId, 下发的 value]
     */
    private String[] resolvePublishMonitor(String monitorId, String value) {
        Integer registerAddress = ModbusRegisterParser.getRegisterAddressByMonitorId(monitorId);
        if (registerAddress == null) {
            return new String[]{monitorId, value};
        }
        int raw = readRegisterValue(registerAddress);
        int bitPosition = ModbusRegisterParser.CODE_INDEX.get(monitorId).getBitPosition();
        if ("1".equals(value)) {
            raw |= (1 << bitPosition);
        } else {
            raw &= ~(1 << bitPosition);
        }
        return new String[]{"REGISTER_" + registerAddress, String.valueOf(raw)};
    }

    /** 从缓存读取指定寄存器各 bit 位当前值，组装成 16 位整数值 */
    private int readRegisterValue(Integer registerAddress) {
        int raw = 0;
        List<ModbusRegisterParser.DeviceBit> bits = ModbusRegisterParser.REGISTER_MAP.get(registerAddress);
        if (bits == null) {
            return raw;
        }
        for (ModbusRegisterParser.DeviceBit bit : bits) {
            MonitorRuntimeConfig cfg = monitorConfigCache.getByMonitorId(bit.getMonitorId());
            if (cfg != null && "1".equals(cfg.getMonitorValue())) {
                raw |= (1 << bit.getBitPosition());
            }
        }
        return raw;
    }

    /**
     * 构建设备控制 JSON 报文
     *
     * @param name        控制项名称，如 1-XTZD
     * @param value       控制值，如 1
     * @param operationId 操作流水号
     * @return JSON 字符串
     */
    private String buildControlJson(String name, String value, String operationId) {
        Map<String, Object> wData = new HashMap<>();
        wData.put("name", name);
        wData.put("value", convertValue(name, value));

        Map<String, Object> rwProt = new HashMap<>();
        rwProt.put("Ver", "1.0.1");
        rwProt.put("dir", "down");
        rwProt.put("id", operationId);
        rwProt.put("w_data", Collections.singletonList(wData));

        Map<String, Object> root = new HashMap<>();
        root.put("rw_prot", rwProt);

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("生成控制 JSON 失败", e);
        }
    }

    private String generateOperationId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private void saveOperationHistory(String monitorId, String value, String preValue, String operator, String operationId) {
        MonitorRuntimeConfig config = monitorConfigCache.getByMonitorId(monitorId);
        MonitorOperationHistory history = new MonitorOperationHistory();
        history.setMonitorId(monitorId);
        history.setMonitorName(config != null ? config.getMonitorName() : monitorId);
        history.setPreValue(preValue != null ? preValue : (config != null ? config.getMonitorValue() : null));
        history.setValue(value);
        history.setStatus("1"); // 命令下发成功，最终结果由 MQTT 回执更新
        history.setOperator(operator);
        history.setOperationId(operationId);
        monitorOperationHistoryService.save(history);
        log.info("MQTT 操作记录已保存，monitorId={}，operationId={}，operator={}", monitorId, operationId, operator);
    }

    /**
     * 根据监控点配置的 valueType（INT-布尔型，FLOAT-浮点型）将字符串 value 转换为 Integer 或 Float
     *
     * @param monitorId 监控点ID
     * @param value     原始字符串值
     * @return 转换后的数值对象
     */
    private Object convertValue(String monitorId, String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        // 组合寄存器下发的值为组装后的整数字符串，保持字符串下发
        if (ModbusRegisterParser.isRegisterMonitorId(monitorId)) {
            return value;
        }
        MonitorRuntimeConfig config = monitorConfigCache.getByMonitorId(monitorId);
        if (config == null || !StringUtils.hasText(config.getValueType())) {
            return value;
        }
        try {
            if ("FLOAT".equalsIgnoreCase(config.getValueType())) {
                return Float.parseFloat(value);
            }
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            log.warn("MQTT 下发值转换失败，monitorId={}，valueType={}，value={}", monitorId, config.getValueType(), value);
            return value;
        }
    }
}
