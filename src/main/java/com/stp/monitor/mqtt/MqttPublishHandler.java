package com.stp.monitor.mqtt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stp.monitor.entity.MonitorOperationHistory;
import com.stp.monitor.service.MonitorConfigCache;
import com.stp.monitor.service.MonitorOperationHistoryService;
import com.stp.monitor.service.MonitorRuntimeConfig;

import lombok.var;
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
     * 向默认下发 topic（/DownloadTopicNB）发送 JSON 消息
     */
    public void publish(String monitorId, String value) {
        String operationId = generateOperationId();
        String payload = buildControlJson(monitorId, value, operationId);
        saveOperationHistory(monitorId, value, operationId);
        mqttOutputChannel.send(MessageBuilder.withPayload(payload).build());
        log.info("MQTT 下发消息，payload={}", payload);
    }

    /**
     * 向指定 topic 发送 JSON 消息
     */
    public void publish(String topic, String monitorId, String value) {
        String operationId = generateOperationId();
        String payload = buildControlJson(monitorId, value, operationId);
        saveOperationHistory(monitorId, value, operationId);
        mqttOutputChannel.send(MessageBuilder
                .withPayload(payload)
                .setHeader(MqttHeaders.TOPIC, topic)
                .build());
        log.info("MQTT 下发消息，topic={}，payload={}", topic, payload);
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

    private void saveOperationHistory(String monitorId, String value, String operationId) {
        MonitorRuntimeConfig config = monitorConfigCache.getByMonitorId(monitorId);
        MonitorOperationHistory history = new MonitorOperationHistory();
        history.setMonitorId(monitorId);
        history.setMonitorName(config != null ? config.getMonitorName() : monitorId);
        history.setPreValue(config != null ? config.getMonitorValue() : null);
        history.setValue(value);
        history.setOperationId(operationId);
        monitorOperationHistoryService.save(history);
        log.info("MQTT 操作记录已保存，monitorId={}，operationId={}", monitorId, operationId);
    }

    /**
     * 根据监控点配置的 valueType 将字符串 value 转换为 Integer 或 Float
     *
     * @param monitorId 监控点ID
     * @param value     原始字符串值
     * @return 转换后的数值对象
     */
    private Object convertValue(String monitorId, String value) {
        if (!StringUtils.hasText(value)) {
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
