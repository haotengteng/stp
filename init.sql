SET NAMES utf8mb4;

CREATE TABLE `user_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` VARCHAR(64) NOT NULL COMMENT '用户ID',
  `username` VARCHAR(64) NOT NULL COMMENT '用户名',
  `password` VARCHAR(128) NOT NULL COMMENT '密码',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';

CREATE TABLE `device_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `device_id` VARCHAR(64) NOT NULL COMMENT '设备ID',
  `device_name` VARCHAR(128) NOT NULL COMMENT '设备名称',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备信息表';

CREATE TABLE `monitor_history_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `monitor_id` VARCHAR(64) NOT NULL COMMENT '监控点ID',
  `monitor_name` VARCHAR(128) NOT NULL COMMENT '监控点名称',
  `monitor_value` VARCHAR(255) DEFAULT NULL COMMENT '监控点数值',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_monitor_id` (`monitor_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控点历史信息表';

CREATE TABLE `monitor_config` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `monitor_id` VARCHAR(64) NOT NULL COMMENT '监控点ID',
  `monitor_name` VARCHAR(128) NOT NULL COMMENT '监控点名称',
  `device_id` VARCHAR(64) NOT NULL COMMENT '设备ID',
  `device_name` VARCHAR(128) NOT NULL COMMENT '设备名称',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `value_type` VARCHAR(20) NOT NULL DEFAULT 'INT' COMMENT '数值类型：INT-整数，FLOAT-浮点',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_monitor_id` (`monitor_id`),
  KEY `idx_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控点配置表';

CREATE TABLE `monitor_operation_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `monitor_id` VARCHAR(64) NOT NULL COMMENT '监控点ID',
  `monitor_name` VARCHAR(128) NOT NULL COMMENT '监控点名称',
  `pre_value` VARCHAR(255) DEFAULT NULL COMMENT '操作前的值',
  `value` VARCHAR(255) DEFAULT NULL COMMENT '操作后的值',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '操作状态：0-失败，1-成功',
  `operation_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '操作流水号',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_monitor_id` (`monitor_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控点操作历史表';

CREATE TABLE `alarm_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `monitor_id` VARCHAR(64) NOT NULL COMMENT '监控点ID',
  `monitor_name` VARCHAR(128) NOT NULL COMMENT '监控点名称',
  `message` VARCHAR(512) DEFAULT NULL COMMENT '告警消息内容',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-未处理，1-已处理，2-已忽略',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_monitor_id` (`monitor_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='告警记录表';
