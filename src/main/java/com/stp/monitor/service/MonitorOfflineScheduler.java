package com.stp.monitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 定时扫描监控点值更新状态：超过 {@link #OFFLINE_THRESHOLD_MINUTES} 分钟未更新时，
 * 将其 monitorValue 置为 null，前端据此判定监控点未连接、禁止操作
 */
@Slf4j
@Component
public class MonitorOfflineScheduler {

    /** 值未更新的离线判定阈值（分钟） */
    private static final long OFFLINE_THRESHOLD_MINUTES = 5;

    @Autowired
    private MonitorConfigCache monitorConfigCache;

    /** 每 30 秒扫描一次 */
    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    public void sweepOfflineMonitors() {
        int cleared = monitorConfigCache.clearStaleValues(OFFLINE_THRESHOLD_MINUTES);
        if (cleared > 0) {
            log.info("{} 个监控点超过 {} 分钟未更新值，已置为离线", cleared, OFFLINE_THRESHOLD_MINUTES);
        }
    }
}
