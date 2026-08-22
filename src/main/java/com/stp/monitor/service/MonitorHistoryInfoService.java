package com.stp.monitor.service;

import com.stp.monitor.entity.MonitorHistoryInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface MonitorHistoryInfoService {

    MonitorHistoryInfo save(MonitorHistoryInfo monitorHistoryInfo);

    MonitorHistoryInfo findById(Long id);

    Page<MonitorHistoryInfo> findAll(Pageable pageable);

    void deleteById(Long id);

    List<MonitorHistoryInfo> findLatestByMonitorId(String monitorId);

    List<MonitorHistoryInfo> findChartData(String monitorId, LocalDateTime startTime);
}
