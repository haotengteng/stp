package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.MonitorHistoryRequest;
import com.stp.monitor.entity.MonitorHistoryInfo;
import com.stp.monitor.service.MonitorHistoryInfoService;
import com.stp.monitor.vo.ChartDataVo;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/monitor-history")
public class MonitorHistoryInfoController {

    @Autowired
    private MonitorHistoryInfoService monitorHistoryInfoService;

    @GetMapping("/page")
    public Result<Page<MonitorHistoryInfo>> page(@RequestParam(defaultValue = "1") int pageNum,
                                                 @RequestParam(defaultValue = "10") int pageSize) {
        Page<MonitorHistoryInfo> page = monitorHistoryInfoService.findAll(PageRequest.of(pageNum - 1, pageSize));
        return Result.success(page);
    }

    @GetMapping("/latest")
    public Result<List<MonitorHistoryInfo>> latest(@RequestParam String monitorId) {
        return Result.success(monitorHistoryInfoService.findLatestByMonitorId(monitorId));
    }

    @GetMapping("/chart")
    public Result<List<ChartDataVo>> chart(@RequestParam String monitorId,
                                           @RequestParam(defaultValue = "24") int hours) {
        LocalDateTime startTime = LocalDateTime.now().minusHours(hours);
        List<MonitorHistoryInfo> list = monitorHistoryInfoService.findChartData(monitorId, startTime);
        List<ChartDataVo> result = list.stream().map(item -> {
            ChartDataVo vo = new ChartDataVo();
            vo.setMonitorValue(item.getMonitorValue());
            vo.setCreateTime(item.getCreateTime());
            return vo;
        }).collect(Collectors.toList());
        return Result.success(result);
    }

    @PostMapping
    public Result<Void> save(@RequestBody MonitorHistoryRequest request) {
        MonitorHistoryInfo entity = new MonitorHistoryInfo();
        BeanUtils.copyProperties(request, entity);
        monitorHistoryInfoService.save(entity);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        monitorHistoryInfoService.deleteById(id);
        return Result.success();
    }
}
