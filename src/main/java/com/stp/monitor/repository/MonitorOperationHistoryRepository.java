package com.stp.monitor.repository;

import com.stp.monitor.entity.MonitorOperationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonitorOperationHistoryRepository extends JpaRepository<MonitorOperationHistory, Long> {

    List<MonitorOperationHistory> findTop20ByMonitorIdOrderByCreateTimeDesc(String monitorId);

    List<MonitorOperationHistory> findByOperationId(String operationId);
}
