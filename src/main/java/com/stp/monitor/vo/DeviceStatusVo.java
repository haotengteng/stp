package com.stp.monitor.vo;

import lombok.Data;

import java.util.List;

/**
 * 设备状态统计：仅统计 show_type=LIGHT 的监控点
 */
@Data
public class DeviceStatusVo {

    /** 正常运行数量（monitorValue=0） */
    private long running;

    /** 故障数量（monitorValue=1） */
    private long fault;

    /** 未知数量（无 monitorValue 或无法解析） */
    private long unknown;

    /** 正常运行监控点按 device_id 分组统计 */
    private List<Group> groups;

    @Data
    public static class Group {
        private String deviceId;
        private String deviceName;
        private long count;
    }
}
