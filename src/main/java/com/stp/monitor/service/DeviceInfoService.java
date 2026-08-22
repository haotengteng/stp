package com.stp.monitor.service;

import com.stp.monitor.entity.DeviceInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DeviceInfoService {

    DeviceInfo save(DeviceInfo deviceInfo);

    DeviceInfo findById(Long id);

    Page<DeviceInfo> findAll(Pageable pageable);

    void deleteById(Long id);
}
