package com.stp.monitor.service;

import lombok.Data;

@Data
public class MonitorRuntimeConfig {

    private Long id;

    private String monitorId;

    private String monitorName;

    private String deviceId;

    private String deviceName;

    private Integer status;

    private String valueType;

    private String monitorValue;
}
