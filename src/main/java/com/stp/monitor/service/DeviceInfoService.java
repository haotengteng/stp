package com.stp.monitor.service;

import com.stp.monitor.entity.DeviceInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DeviceInfoService {

    DeviceInfo save(DeviceInfo deviceInfo);

    DeviceInfo findById(Long id);

    Page<DeviceInfo> findAll(Pageable pageable);

    List<DeviceInfo> findAll();

    void deleteById(Long id);
}
