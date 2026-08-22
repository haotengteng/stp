package com.stp.monitor.repository;

import com.stp.monitor.entity.MonitorConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MonitorConfigRepository extends JpaRepository<MonitorConfig, Long> {

    Optional<MonitorConfig> findByMonitorId(String monitorId);

    List<MonitorConfig> findByDeviceId(String deviceId);

    List<MonitorConfig> findByStatus(Integer status);
}
