package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.MonitorControlRequest;
import com.stp.monitor.mqtt.MqttPublishHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mqtt")
@ConditionalOnProperty(prefix = "mqtt", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MqttController {

    @Autowired
    private MqttPublishHandler mqttPublishService;

    /**
     * 向默认下发 topic /DownloadTopicNB 发送 JSON 消息
     */
    @PostMapping("/publish")
    public Result<Void> publish(@RequestBody MonitorControlRequest payload) {
        mqttPublishService.publish(payload.getMonitorId(),payload.getValue());
        return Result.success();
    }

}
