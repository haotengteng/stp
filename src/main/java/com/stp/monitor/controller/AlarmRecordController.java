package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.AlarmRecordRequest;
import com.stp.monitor.entity.AlarmRecord;
import com.stp.monitor.service.AlarmRecordService;
import com.stp.monitor.vo.AlarmStatisticsVo;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/alarm")
public class AlarmRecordController {

    @Autowired
    private AlarmRecordService alarmRecordService;

    @GetMapping("/page")
    public Result<Page<AlarmRecord>> page(@RequestParam(defaultValue = "1") int pageNum,
                                         @RequestParam(defaultValue = "10") int pageSize) {
        Page<AlarmRecord> page = alarmRecordService.findAll(PageRequest.of(pageNum - 1, pageSize));
        return Result.success(page);
    }

    @GetMapping("/{id}")
    public Result<AlarmRecord> getById(@PathVariable Long id) {
        return Result.success(alarmRecordService.findById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody AlarmRecordRequest request) {
        AlarmRecord entity = new AlarmRecord();
        BeanUtils.copyProperties(request, entity);
        alarmRecordService.save(entity);
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody AlarmRecordRequest request) {
        AlarmRecord entity = new AlarmRecord();
        BeanUtils.copyProperties(request, entity);
        entity.setId(id);
        alarmRecordService.save(entity);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        alarmRecordService.deleteById(id);
        return Result.success();
    }

    @PostMapping("/{id}/process")
    public Result<Void> process(@PathVariable Long id, @RequestParam Integer status) {
        if (status == null || (status != 1 && status != 2)) {
            return Result.fail("状态只能为 1（已处理）或 2（已忽略）");
        }
        alarmRecordService.process(id, status);
        return Result.success();
    }

    @GetMapping("/statistics")
    public Result<AlarmStatisticsVo> statistics() {
        AlarmStatisticsVo vo = new AlarmStatisticsVo();
        vo.setTotal(alarmRecordService.findAll(PageRequest.of(0, Integer.MAX_VALUE)).getTotalElements());
        vo.setUnhandled(alarmRecordService.countByStatus(0));
        vo.setProcessed(alarmRecordService.countByStatus(1));
        vo.setIgnored(alarmRecordService.countByStatus(2));
        return Result.success(vo);
    }

    @GetMapping("/today-count")
    public Result<Long> todayCount() {
        LocalDateTime start = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime end = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        return Result.success(alarmRecordService.countToday(start, end));
    }
}
