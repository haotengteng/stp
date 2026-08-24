package com.stp.monitor.service.impl;

import com.stp.monitor.entity.MonitorConfig;
import com.stp.monitor.entity.MonitorOperationHistory;
import com.stp.monitor.repository.MonitorConfigRepository;
import com.stp.monitor.repository.MonitorOperationHistoryRepository;
import com.stp.monitor.service.MonitorConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MonitorConfigServiceImpl implements MonitorConfigService {

    @Autowired
    private MonitorConfigRepository monitorConfigRepository;

    @Autowired
    private MonitorOperationHistoryRepository operationHistoryRepository;

    @Override
    public MonitorConfig save(MonitorConfig monitorConfig) {
        return monitorConfigRepository.save(monitorConfig);
    }

    @Override
    public MonitorConfig findById(Long id) {
        return monitorConfigRepository.findById(id).orElse(null);
    }

    @Override
    public List<MonitorConfig> findAll() {
        return monitorConfigRepository.findAll();
    }

    @Override
    public Page<MonitorConfig> findAll(Pageable pageable) {
        return monitorConfigRepository.findAll(pageable);
    }

    @Override
    public void deleteById(Long id) {
        monitorConfigRepository.deleteById(id);
    }

    @Override
    public List<MonitorConfig> findByDeviceId(String deviceId) {
        return monitorConfigRepository.findByDeviceId(deviceId);
    }

    @Override
    public List<MonitorConfig> findByStatus(String status) {
        return monitorConfigRepository.findByStatus(status);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean switchStatus(String monitorId, String status) {
        if (!"ON".equals(status) && !"OFF".equals(status)) {
            throw new IllegalArgumentException("状态只能为 ON（启用）或 OFF（禁用）");
        }
        MonitorConfig config = monitorConfigRepository.findByMonitorId(monitorId)
                .orElseThrow(() -> new IllegalArgumentException("监控点不存在：" + monitorId));
        String preStatus = config.getStatus();
        config.setStatus(status);
        monitorConfigRepository.save(config);

        MonitorOperationHistory history = new MonitorOperationHistory();
        history.setMonitorId(monitorId);
        history.setMonitorName(config.getMonitorName());
        history.setPreValue(preStatus);
        history.setValue(status);
        history.setStatus("1"); // 操作成功
        operationHistoryRepository.save(history);

        return true;
    }
}
