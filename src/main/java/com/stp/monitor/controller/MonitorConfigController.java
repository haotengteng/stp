package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.MonitorConfigRequest;
import com.stp.monitor.entity.MonitorConfig;
import com.stp.monitor.service.MonitorConfigCache;
import com.stp.monitor.service.MonitorConfigService;
import com.stp.monitor.service.MonitorRuntimeConfig;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/monitor-config")
public class MonitorConfigController {

    @Autowired
    private MonitorConfigService monitorConfigService;

    @Autowired
    private MonitorConfigCache monitorConfigCache;

    @GetMapping("/page")
    public Result<Page<MonitorConfig>> page(@RequestParam(defaultValue = "1") int pageNum,
                                          @RequestParam(defaultValue = "10") int pageSize) {
        Page<MonitorConfig> page = monitorConfigService.findAll(PageRequest.of(pageNum - 1, pageSize));
        return Result.success(page);
    }

    @GetMapping("/list-by-device")
    public Result<List<MonitorConfig>> listByDevice(@RequestParam String deviceId) {
        return Result.success(monitorConfigService.findByDeviceId(deviceId));
    }

    @GetMapping("/cache")
    public Result<List<MonitorRuntimeConfig>> cache() {
        monitorConfigCache.reload();
        return Result.success(monitorConfigCache.getAll());
    }

    @GetMapping("/{id}")
    public Result<MonitorConfig> getById(@PathVariable Long id) {
        return Result.success(monitorConfigService.findById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody MonitorConfigRequest request) {
        MonitorConfig entity = new MonitorConfig();
        BeanUtils.copyProperties(request, entity);
        monitorConfigService.save(entity);
        monitorConfigCache.reload();
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody MonitorConfigRequest request) {
        MonitorConfig entity = monitorConfigService.findById(id);
        if (entity == null) {
            return Result.fail("监控点不存在");
        }
        BeanUtils.copyProperties(request, entity);
        monitorConfigService.save(entity);
        monitorConfigCache.reload();
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        monitorConfigService.deleteById(id);
        monitorConfigCache.reload();
        return Result.success();
    }

    @PostMapping("/{monitorId}/switch")
    public Result<Void> switchStatus(@PathVariable String monitorId, @RequestParam String status) {
        monitorConfigService.switchStatus(monitorId, status);
        monitorConfigCache.reload();
        return Result.success();
    }

    @PostMapping("/reload")
    public Result<Void> reload() {
        monitorConfigCache.reload();
        return Result.success();
    }

    /**
     * 以所有监控点 monitor_id 为 key，value 同为 monitor_id，生成 JSON 结构
     */
    @GetMapping("/init-json")
    public Result<Map<String, String>> initJson() {
        Map<String, String> result = monitorConfigService.findAll().stream()
                .collect(Collectors.toMap(MonitorConfig::getMonitorId, MonitorConfig::getMonitorId, (a, b) -> a));
        return Result.success(result);
    }
}
