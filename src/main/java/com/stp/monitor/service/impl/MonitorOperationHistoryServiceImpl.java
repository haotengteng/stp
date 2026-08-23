package com.stp.monitor.service.impl;

import com.stp.monitor.entity.MonitorOperationHistory;
import com.stp.monitor.repository.MonitorOperationHistoryRepository;
import com.stp.monitor.service.MonitorOperationHistoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class MonitorOperationHistoryServiceImpl implements MonitorOperationHistoryService {

    @Autowired
    private MonitorOperationHistoryRepository monitorOperationHistoryRepository;

    @Override
    public MonitorOperationHistory save(MonitorOperationHistory monitorOperationHistory) {
        return monitorOperationHistoryRepository.save(monitorOperationHistory);
    }

    @Override
    public MonitorOperationHistory findById(Long id) {
        return monitorOperationHistoryRepository.findById(id).orElse(null);
    }

    @Override
    public Page<MonitorOperationHistory> findAll(Pageable pageable) {
        return monitorOperationHistoryRepository.findAll(pageable);
    }

    @Override
    public void deleteById(Long id) {
        monitorOperationHistoryRepository.deleteById(id);
    }

    @Override
    public List<MonitorOperationHistory> findByOperationId(String operationId) {
        return monitorOperationHistoryRepository.findByOperationId(operationId);
    }

    @Override
    @Transactional
    public void updateByOperationId(String operationId, List<Map<String, String>> wDataList) {
        List<MonitorOperationHistory> historyList = monitorOperationHistoryRepository.findByOperationId(operationId);
        if (historyList.isEmpty()) {
            log.warn("未找到operationId={}对应的操作历史记录", operationId);
            return;
        }

        for (MonitorOperationHistory history : historyList) {
            String monitorIdData = history.getMonitorId();

            for (Map<String, String> wData : wDataList) {
                String monitorId = wData.get("name");
                String err = wData.get("err");
                String value = wData.get("value");

                if (monitorId != null && monitorId.equals(monitorIdData)) {
                    history.setValue(value);
                    history.setStatus(err);
                    log.info("更新操作记录: id={}, monitorId={}, value={}",
                            history.getId(), monitorIdData, value);
                    break;
                }
            }
        }

        monitorOperationHistoryRepository.saveAll(historyList);
        log.info("已批量更新operationId={}的{}条操作历史记录", operationId, historyList.size());
    }
}
