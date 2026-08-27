package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.MonitorOperationRequest;
import com.stp.monitor.entity.MonitorOperationHistory;
import com.stp.monitor.mqtt.MqttPublishHandler;
import com.stp.monitor.service.MonitorConfigCache;
import com.stp.monitor.service.MonitorOperationHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/monitor-operation")
public class MonitorOperationHistoryController {

    @Autowired
    private MonitorOperationHistoryService operationHistoryService;

    @Autowired
    private MonitorConfigCache monitorConfigCache;

    @Autowired
    private MqttPublishHandler mqttPublishHandler;

    @GetMapping("/page")
    public Result<Page<MonitorOperationHistory>> page(@RequestParam(defaultValue = "1") int pageNum,
                                                     @RequestParam(defaultValue = "10") int pageSize) {
        Page<MonitorOperationHistory> page = operationHistoryService.findAll(
                PageRequest.of(pageNum - 1, pageSize, Sort.by(Sort.Direction.DESC, "createTime")));
        return Result.success(page);
    }

    @GetMapping("/{id}")
    public Result<MonitorOperationHistory> getById(@PathVariable Long id) {
        return Result.success(operationHistoryService.findById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody MonitorOperationRequest request) {
        // 更新监控点当前值缓存
        monitorConfigCache.updateMonitorValue(request.getMonitorId(), request.getValue());
        // 下发控制指令并保存操作历史（preValue 取前端切换前值，避免无历史数据时为空）
        mqttPublishHandler.publish(request.getMonitorId(), request.getValue(), request.getPreValue(), request.getOperator());
        return Result.success();
    }
}
