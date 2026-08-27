package com.stp.monitor.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "monitor_operation_history")
public class MonitorOperationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monitor_id")
    private String monitorId;

    @Column(name = "monitor_name")
    private String monitorName;

    @Column(name = "pre_value")
    private String preValue;

    @Column(name = "value")
    private String value;

    @Column(name = "status")
    private String status;

    @Column(name = "operator")
    private String operator;

    @Column(name = "operation_id")
    private String operationId;

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
        if (operationId == null) {
            operationId = UUID.randomUUID().toString().replace("-", "");
        }
    }

    @PreUpdate
    public void preUpdate() {
        updateTime = LocalDateTime.now();
    }
}
