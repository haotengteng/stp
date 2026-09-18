package com.stp.monitor.service;

import com.stp.monitor.entity.MonitorConfig;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Comparator;
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
        Map<String, MonitorRuntimeConfig> oldMap = configMap;
        Map<String, MonitorRuntimeConfig> newMap = list.stream()
                .collect(Collectors.toMap(MonitorConfig::getMonitorId, this::toRuntimeConfig, (a, b) -> b));
        // 保留已存在的实时值（MQTT 上送的最新值），避免 reload 清空后统计/展示丢失
        newMap.forEach((id, cfg) -> {
            MonitorRuntimeConfig old = oldMap.get(id);
            if (old != null) {
                cfg.setMonitorValue(old.getMonitorValue());
                cfg.setUpdateTime(old.getUpdateTime());
            }
        });
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
            config.setUpdateTime(LocalDateTime.now());
        }
    }

    /**
     * 仅刷新监控点的心跳时间（值未变化时调用，表示设备仍在线上）
     */
    public void touchMonitor(String monitorId) {
        MonitorRuntimeConfig config = configMap.get(monitorId);
        if (config != null) {
            config.setUpdateTime(LocalDateTime.now());
        }
    }

    /**
     * 将超过指定时长（分钟）未更新值的监控点 monitorValue 置为 null（视为未连接/离线），
     * 返回被清理的监控点数量
     */
    public int clearStaleValues(long minutes) {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(minutes);
        int cleared = 0;
        for (MonitorRuntimeConfig config : configMap.values()) {
            LocalDateTime updateTime = config.getUpdateTime();
            if (updateTime != null && updateTime.isBefore(threshold) && config.getMonitorValue() != null) {
                config.setMonitorValue(null);
                cleared++;
            }
        }
        return cleared;
    }

    public MonitorRuntimeConfig getByMonitorId(String monitorId) {
        return configMap.get(monitorId);
    }

    public List<MonitorRuntimeConfig> getAll() {
        // 按 id 升序返回，保证下拉框等场景顺序稳定
        return configMap.values().stream()
                .sorted(Comparator.comparing(MonitorRuntimeConfig::getId,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toUnmodifiableList());
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
