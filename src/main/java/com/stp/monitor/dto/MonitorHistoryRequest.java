package com.stp.monitor.dto;

import lombok.Data;

@Data
public class MonitorHistoryRequest {

    private String monitorId;

    private String monitorName;

    private String monitorValue;
}
