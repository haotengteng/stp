package com.stp.monitor.repository;

import com.stp.monitor.entity.DeviceInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceInfoRepository extends JpaRepository<DeviceInfo, Long> {

    List<DeviceInfo> findByDeviceNameContainingOrDeviceIdContaining(String deviceName, String deviceId);
}
