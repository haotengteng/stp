package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.DeviceInfoRequest;
import com.stp.monitor.entity.DeviceInfo;
import com.stp.monitor.service.DeviceInfoService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/device")
public class DeviceInfoController {

    @Autowired
    private DeviceInfoService deviceInfoService;

    @GetMapping("/page")
    public Result<Page<DeviceInfo>> page(@RequestParam(defaultValue = "1") int pageNum,
                                         @RequestParam(defaultValue = "10") int pageSize) {
        Page<DeviceInfo> page = deviceInfoService.findAll(PageRequest.of(pageNum - 1, pageSize));
        return Result.success(page);
    }

    @GetMapping("/{id}")
    public Result<DeviceInfo> getById(@PathVariable Long id) {
        return Result.success(deviceInfoService.findById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody DeviceInfoRequest request) {
        DeviceInfo entity = new DeviceInfo();
        BeanUtils.copyProperties(request, entity);
        deviceInfoService.save(entity);
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody DeviceInfoRequest request) {
        DeviceInfo entity = deviceInfoService.findById(id);
        if (entity == null) {
            return Result.fail("设备不存在");
        }
        BeanUtils.copyProperties(request, entity);
        deviceInfoService.save(entity);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        deviceInfoService.deleteById(id);
        return Result.success();
    }
}
