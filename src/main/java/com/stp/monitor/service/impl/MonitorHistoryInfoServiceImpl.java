package com.stp.monitor.service.impl;

import com.stp.monitor.entity.MonitorHistoryInfo;
import com.stp.monitor.repository.MonitorHistoryInfoRepository;
import com.stp.monitor.service.MonitorHistoryInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MonitorHistoryInfoServiceImpl implements MonitorHistoryInfoService {

    @Autowired
    private MonitorHistoryInfoRepository monitorHistoryInfoRepository;

    @Override
    public MonitorHistoryInfo save(MonitorHistoryInfo monitorHistoryInfo) {
        return monitorHistoryInfoRepository.save(monitorHistoryInfo);
    }

    @Override
    public MonitorHistoryInfo findById(Long id) {
        return monitorHistoryInfoRepository.findById(id).orElse(null);
    }

    @Override
    public Page<MonitorHistoryInfo> findAll(Pageable pageable) {
        return monitorHistoryInfoRepository.findAll(pageable);
    }

    @Override
    public void deleteById(Long id) {
        monitorHistoryInfoRepository.deleteById(id);
    }

    @Override
    public List<MonitorHistoryInfo> findLatestByMonitorId(String monitorId) {
        return monitorHistoryInfoRepository.findTop20ByMonitorIdOrderByCreateTimeDesc(monitorId);
    }

    @Override
    public List<MonitorHistoryInfo> findChartData(String monitorId, LocalDateTime startTime) {
        return monitorHistoryInfoRepository.findByMonitorIdAndCreateTimeAfterOrderByCreateTimeAsc(monitorId, startTime);
    }
}
