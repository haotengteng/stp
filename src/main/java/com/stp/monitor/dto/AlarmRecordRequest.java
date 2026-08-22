package com.stp.monitor.dto;

import lombok.Data;

@Data
public class AlarmRecordRequest {

    private String monitorId;

    private String monitorName;

    private String message;

    private Integer status;
}
