package com.stp.monitor.dto;

import lombok.Data;

@Data
public class MonitorConfigRequest {

    private String monitorId;

    private String monitorName;

    private String deviceId;

    private String deviceName;

    private String permission;

    private String status;

    private String valueType;
}
