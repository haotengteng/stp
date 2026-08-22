package com.stp.monitor.service;

import com.stp.monitor.entity.MonitorConfig;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Component
public class MonitorConfigCache {

    @Autowired
    private MonitorConfigService monitorConfigService;

    private volatile Map<String, MonitorRuntimeConfig> configMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        reload();
        log.info("monitor_config 缓存加载完成，共 {} 条", configMap.size());
    }

    /**
     * 从数据库重新加载全部 monitor_config 到内存，monitorValue 初始为空
     */
    public synchronized void reload() {
        List<MonitorConfig> list = monitorConfigService.findAll();
        Map<String, MonitorRuntimeConfig> newMap = list.stream()
                .collect(Collectors.toMap(MonitorConfig::getMonitorId, this::toRuntimeConfig, (a, b) -> b));
        configMap = new ConcurrentHashMap<>(newMap);
        log.info("monitor_config 缓存已刷新，共 {} 条", configMap.size());
    }

    /**
     * 根据 MQTT 上送数据更新指定监控点的当前值
     */
    public void updateMonitorValue(String monitorId, String monitorValue) {
        MonitorRuntimeConfig config = configMap.get(monitorId);
        if (config != null) {
            config.setMonitorValue(monitorValue);
        }
    }

    public MonitorRuntimeConfig getByMonitorId(String monitorId) {
        return configMap.get(monitorId);
    }

    public List<MonitorRuntimeConfig> getAll() {
        return Collections.unmodifiableList(List.copyOf(configMap.values()));
    }

    public int size() {
        return configMap.size();
    }

    private MonitorRuntimeConfig toRuntimeConfig(MonitorConfig config) {
        MonitorRuntimeConfig runtimeConfig = new MonitorRuntimeConfig();
        BeanUtils.copyProperties(config, runtimeConfig);
        return runtimeConfig;
    }
}
