package com.stp.monitor.service.impl;

import com.stp.monitor.entity.DeviceInfo;
import com.stp.monitor.repository.DeviceInfoRepository;
import com.stp.monitor.service.DeviceInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class DeviceInfoServiceImpl implements DeviceInfoService {

    @Autowired
    private DeviceInfoRepository deviceInfoRepository;

    @Override
    public DeviceInfo save(DeviceInfo deviceInfo) {
        return deviceInfoRepository.save(deviceInfo);
    }

    @Override
    public DeviceInfo findById(Long id) {
        return deviceInfoRepository.findById(id).orElse(null);
    }

    @Override
    public Page<DeviceInfo> findAll(Pageable pageable) {
        return deviceInfoRepository.findAll(pageable);
    }

    @Override
    public void deleteById(Long id) {
        deviceInfoRepository.deleteById(id);
    }
}
