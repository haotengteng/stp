package com.stp.monitor.mqtt;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stp.monitor.entity.MonitorHistoryInfo;
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
                String monitorValue = value != null ? value.toString() : null;
                monitorConfigCache.updateMonitorValue(monitorId, monitorValue);
                MonitorRuntimeConfig config = monitorConfigCache.getByMonitorId(monitorId);
                if (config == null) {
                    log.warn("未找到监控点配置，monitorId={}", monitorId);
                    return;
                }
                config.setMonitorValue(monitorValue);
                
                MonitorHistoryInfo history = new MonitorHistoryInfo();
                history.setMonitorId(monitorId);
                history.setMonitorName(config.getMonitorName());
                history.setMonitorValue(monitorValue);
                monitorHistoryInfoService.save(history);
                log.info("MQTT 数据已保存，monitorId={}，value={}", monitorId, monitorValue);
            });
        } catch (Exception e) {
            log.error("MQTT 消息解析或保存失败，payload={}", payload, e);
        }
    }
}
