package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.MonitorOperationRequest;
import com.stp.monitor.entity.MonitorOperationHistory;
import com.stp.monitor.service.MonitorOperationHistoryService;
import org.springframework.beans.BeanUtils;
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
        MonitorOperationHistory entity = new MonitorOperationHistory();
        BeanUtils.copyProperties(request, entity);
        operationHistoryService.save(entity);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        operationHistoryService.deleteById(id);
        return Result.success();
    }
}
