package com.stp.monitor.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MonitorLatestVo {

    private String monitorId;

    private String monitorName;

    private String deviceId;

    private String deviceName;

    private String latestValue;

    private LocalDateTime updateTime;
}
