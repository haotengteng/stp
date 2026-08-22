package com.stp.monitor.mqtt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stp.monitor.service.MonitorOperationHistoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class MqttRespHandler {

    @Autowired
    private MonitorOperationHistoryService monitorOperationHistoryService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @ServiceActivator(inputChannel = "mqttRespInputChannel")
    public void handle(@Payload String payload,
                       @Header(value = "mqtt_topic", required = false) String topic) {
        log.info("收到响应 MQTT 消息，topic={}，payload={}", topic, payload);

        try {
            JsonNode rootNode = objectMapper.readTree(payload);
            JsonNode rwProtNode = rootNode.get("rw_prot");
            if (rwProtNode == null) {
                log.warn("消息中缺少 rw_prot 字段");
                return;
            }

            String operationId = rwProtNode.get("id").asText();
            log.info("解析到 operationId={}", operationId);

            JsonNode wDataNode = rwProtNode.get("w_data");
            if (wDataNode == null || !wDataNode.isArray()) {
                log.warn("消息中缺少 w_data 数组");
                return;
            }

            List<Map<String, String>> wDataList = new ArrayList<>();
            for (JsonNode item : wDataNode) {
                Map<String, String> itemMap = new HashMap<>();
                itemMap.put("name", item.has("name") ? item.get("name").asText() : null);
                itemMap.put("value", item.has("value") ? item.get("value").asText() : null);
                itemMap.put("err", item.has("err") ? item.get("err").asText() : null);
                wDataList.add(itemMap);
            }

            log.info("解析到 w_data 数组大小={}", wDataList.size());

            monitorOperationHistoryService.updateByOperationId(operationId, wDataList);

        } catch (Exception e) {
            log.error("处理MQTT响应消息失败", e);
        }
    }
}
