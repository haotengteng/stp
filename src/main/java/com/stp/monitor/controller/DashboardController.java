package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.entity.AlarmRecord;
import com.stp.monitor.entity.MonitorConfig;
import com.stp.monitor.entity.MonitorHistoryInfo;
import com.stp.monitor.service.AlarmRecordService;
import com.stp.monitor.service.DeviceInfoService;
import com.stp.monitor.service.MonitorConfigService;
import com.stp.monitor.service.MonitorHistoryInfoService;
import com.stp.monitor.vo.DashboardOverviewVo;
import com.stp.monitor.vo.MonitorLatestVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DeviceInfoService deviceInfoService;

    @Autowired
    private MonitorConfigService monitorConfigService;

    @Autowired
    private MonitorHistoryInfoService monitorHistoryInfoService;

    @Autowired
    private AlarmRecordService alarmRecordService;

    @GetMapping("/overview")
    public Result<DashboardOverviewVo> overview() {
        DashboardOverviewVo vo = new DashboardOverviewVo();
        long totalDevices = deviceInfoService.findAll(PageRequest.of(0, Integer.MAX_VALUE)).getTotalElements();
        vo.setTotalDevices(totalDevices);

        List<MonitorConfig> configs = monitorConfigService.findAll(PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        long totalMonitors = configs.size();
        long enabledMonitors = configs.stream().filter(c -> c.getStatus() != null && "ON".equals(c.getStatus())).count();
        vo.setTotalMonitors(totalMonitors);
        vo.setEnabledMonitors(enabledMonitors);
        vo.setDisabledMonitors(totalMonitors - enabledMonitors);

        LocalDateTime start = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime end = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        vo.setAlarmCountToday(alarmRecordService.countToday(start, end));
        vo.setAlarmUnhandled(alarmRecordService.countByStatus(0));

        List<MonitorLatestVo> latestList = new ArrayList<>();
        for (MonitorConfig config : configs) {
            // 禁用(OFF)状态的监控点不在实时监控页面展示
            if (config.getStatus() == null || !"ON".equals(config.getStatus())) {
                continue;
            }
            List<MonitorHistoryInfo> historyList = monitorHistoryInfoService.findLatestByMonitorId(config.getMonitorId());
            MonitorHistoryInfo latest = historyList.isEmpty() ? null : historyList.get(0);
            MonitorLatestVo latestVo = new MonitorLatestVo();
            latestVo.setMonitorId(config.getMonitorId());
            latestVo.setMonitorName(config.getMonitorName());
            latestVo.setDeviceId(config.getDeviceId());
            latestVo.setDeviceName(config.getDeviceName());
            latestVo.setValueType(config.getValueType());
            latestVo.setValueDesc(config.getValueDesc());
            latestVo.setShowType(config.getShowType());
            latestVo.setPermission(config.getPermission());
            if (latest != null) {
                latestVo.setLatestValue(latest.getMonitorValue());
                latestVo.setUpdateTime(latest.getCreateTime());
            }
            latestList.add(latestVo);
        }
        vo.setLatestMonitorValues(latestList);
        return Result.success(vo);
    }

    @GetMapping("/realtime")
    public Result<List<MonitorHistoryInfo>> realtime(@RequestParam(defaultValue = "50") int size) {
        List<MonitorHistoryInfo> list = monitorHistoryInfoService
                .findAll(PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createTime")))
                .getContent();
        return Result.success(list);
    }

    @GetMapping("/alarms")
    public Result<List<AlarmRecord>> latestAlarms(@RequestParam(defaultValue = "20") int size) {
        List<AlarmRecord> list = alarmRecordService
                .findAll(PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createTime")))
                .getContent();
        return Result.success(list);
    }
}
