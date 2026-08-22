package com.stp.monitor.vo;

import lombok.Data;

@Data
public class AlarmStatisticsVo {

    private Long total;

    private Long unhandled;

    private Long processed;

    private Long ignored;
}
