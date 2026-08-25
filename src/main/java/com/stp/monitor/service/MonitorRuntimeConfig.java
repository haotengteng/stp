package com.stp.monitor.service;

import lombok.Data;

@Data
public class MonitorRuntimeConfig {

    private Long id;

    private String monitorId;

    private String monitorName;

    private String deviceId;

    private String deviceName;

    private String permission;

    private String status;

    private String valueType;

    /** 值描述(JSON)，如 {"1":"故障","0":"正常"} */
    private String valueDesc;

    /** 显示方式：LIGHT-指示灯，SWITCH-开关，空-默认显示值 */
    private String showType;

    private String monitorValue;
}
