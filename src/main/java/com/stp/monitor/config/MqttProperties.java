package com.stp.monitor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "mqtt")
public class MqttProperties {

    private boolean enabled = true;

    private String brokerUrl = "tcp://localhost:1883";

    private String clientId = "stp-monitor-client";

    private String username;

    private String password;

    private String subscribeTopic = "/UploadTopicNB";

    private String respTopic = "/RespTopicNB";

    private String publishTopic = "/DownloadTopicNB";

    private int qos = 1;

    private int completionTimeout = 5000;
}
