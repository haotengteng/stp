package com.stp.monitor.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "monitor_config")
public class MonitorConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monitor_id")
    private String monitorId;

    @Column(name = "monitor_name")
    private String monitorName;

    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "device_name")
    private String deviceName;

    @Column(name = "permission")
    private String permission;

    @Column(name = "status")
    private String status;

    /** 数值类型：INT-布尔型，FLOAT-浮点型 */
    @Column(name = "value_type")
    private String valueType;

    /** 值描述(JSON)，如 {"1":"故障","0":"正常"}，仅对 INT 类型有效 */
    @Column(name = "value_desc")
    private String valueDesc;

    /** 显示方式：LIGHT-指示灯，SWITCH-开关，空-默认显示值 */
    @Column(name = "show_type")
    private String showType;

    /** 组合位（bit 位号） */
    @Column(name = "combine_bit")
    private Integer combineBit;

    @Column(name = "create_time")
    private LocalDateTime createTime;

    @Column(name = "update_time")
    private LocalDateTime updateTime;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createTime == null) {
            createTime = now;
        }
        if (updateTime == null) {
            updateTime = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updateTime = LocalDateTime.now();
    }
}
