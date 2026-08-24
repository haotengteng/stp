package com.stp.monitor.service;

import com.stp.monitor.entity.MonitorConfig;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MonitorConfigService {

    MonitorConfig save(MonitorConfig monitorConfig);

    MonitorConfig findById(Long id);

    List<MonitorConfig> findAll();

    Page<MonitorConfig> findAll(Pageable pageable);

    void deleteById(Long id);

    List<MonitorConfig> findByDeviceId(String deviceId);

    List<MonitorConfig> findByStatus(String status);

    boolean switchStatus(String monitorId, String status);
}
