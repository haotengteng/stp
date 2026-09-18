package com.stp.monitor;

import com.stp.monitor.config.MqttProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(MqttProperties.class)
@EnableScheduling
public class StpMonitorApplication {

    public static void main(String[] args) {
        SpringApplication.run(StpMonitorApplication.class, args);
    }
}
