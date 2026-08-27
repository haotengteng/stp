package com.stp.monitor.dto;

import lombok.Data;

@Data
public class MonitorOperationRequest {

    private String monitorId;

    private String monitorName;

    private String preValue;

    private String value;

    private Integer status;

    private String operator;

    private String operationId;
}
