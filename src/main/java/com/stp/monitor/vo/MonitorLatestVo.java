package com.stp.monitor.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MonitorLatestVo {

    private String monitorId;

    private String monitorName;

    private String deviceId;

    private String deviceName;

    /** 数值类型：INT-布尔型，FLOAT-浮点型 */
    private String valueType;

    /** 值描述(JSON)，仅 INT 类型使用 */
    private String valueDesc;

    /** 显示方式：LIGHT-指示灯，SWITCH-开关，空-默认显示值 */
    private String showType;

    /** 权限：r-只读，rw-可读可写 */
    private String permission;

    private String latestValue;

    private LocalDateTime updateTime;
}
