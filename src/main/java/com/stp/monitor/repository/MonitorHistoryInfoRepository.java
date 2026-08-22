package com.stp.monitor.repository;

import com.stp.monitor.entity.MonitorHistoryInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MonitorHistoryInfoRepository extends JpaRepository<MonitorHistoryInfo, Long> {

    List<MonitorHistoryInfo> findTop20ByMonitorIdOrderByCreateTimeDesc(String monitorId);

    List<MonitorHistoryInfo> findByMonitorIdAndCreateTimeAfterOrderByCreateTimeAsc(String monitorId, LocalDateTime createTime);
}
