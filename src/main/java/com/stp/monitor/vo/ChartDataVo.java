package com.stp.monitor.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChartDataVo {

    private String monitorValue;

    private LocalDateTime createTime;
}
