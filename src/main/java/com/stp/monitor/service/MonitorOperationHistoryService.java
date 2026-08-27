package com.stp.monitor.service;

import com.stp.monitor.entity.MonitorOperationHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface MonitorOperationHistoryService {

    MonitorOperationHistory save(MonitorOperationHistory monitorOperationHistory);

    MonitorOperationHistory findById(Long id);

    Page<MonitorOperationHistory> findAll(Pageable pageable);

    List<MonitorOperationHistory> findByOperationId(String operationId);

    void updateByOperationId(String operationId, List<Map<String, String>> wDataList);
}
