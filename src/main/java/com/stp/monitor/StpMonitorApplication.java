package com.stp.monitor;

import com.stp.monitor.config.MqttProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(MqttProperties.class)
public class StpMonitorApplication {

    public static void main(String[] args) {
        SpringApplication.run(StpMonitorApplication.class, args);
    }
}
