package com.stp.monitor.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "mqtt", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MqttConnectionManager {

    @Autowired
    private List<MqttPahoMessageDrivenChannelAdapter> mqttInbounds;

    private ScheduledExecutorService reconnectExecutor;

    @PostConstruct
    public void init() {
        reconnectExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "mqtt-reconnect");
            t.setDaemon(true);
            return t;
        });
        reconnectExecutor.scheduleWithFixedDelay(this::tryConnect, 0, 10, TimeUnit.SECONDS);
    }

    private void tryConnect() {
        boolean allRunning = mqttInbounds.stream().allMatch(MqttPahoMessageDrivenChannelAdapter::isRunning);
        if (allRunning) {
            reconnectExecutor.shutdown();
            return;
        }
        for (MqttPahoMessageDrivenChannelAdapter adapter : mqttInbounds) {
            if (!adapter.isRunning()) {
                try {
                    adapter.start();
                    log.info("MQTT 入站适配器已启动：{}", adapter.getBeanName());
                } catch (Exception e) {
                    log.warn("MQTT 入站适配器 [{}] 启动失败：{}，10 秒后重试",
                            adapter.getBeanName(), e.getMessage());
                    return;
                }
            }
        }
        reconnectExecutor.shutdown();
    }

    @PreDestroy
    public void destroy() {
        if (reconnectExecutor != null) {
            reconnectExecutor.shutdownNow();
        }
        for (MqttPahoMessageDrivenChannelAdapter adapter : mqttInbounds) {
            if (adapter.isRunning()) {
                adapter.stop();
            }
        }
    }
}
