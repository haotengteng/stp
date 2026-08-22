package com.stp.monitor.vo;

import lombok.Data;

import java.util.List;

@Data
public class DashboardOverviewVo {

    private Long totalDevices;

    private Long totalMonitors;

    private Long enabledMonitors;

    private Long disabledMonitors;

    private Long alarmCountToday;

    private Long alarmUnhandled;

    private List<MonitorLatestVo> latestMonitorValues;
}
