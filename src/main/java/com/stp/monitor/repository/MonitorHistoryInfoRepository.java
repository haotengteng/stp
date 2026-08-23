package com.stp.monitor.repository;

import com.stp.monitor.entity.MonitorHistoryInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MonitorHistoryInfoRepository extends JpaRepository<MonitorHistoryInfo, Long> {

    List<MonitorHistoryInfo> findTop20ByMonitorIdOrderByCreateTimeDesc(String monitorId);

    List<MonitorHistoryInfo> findByMonitorIdAndCreateTimeAfterOrderByCreateTimeAsc(String monitorId, LocalDateTime createTime);

    /**
     * 多条件分页查询：支持监控点ID + 时间范围筛选
     * 所有参数均可选，为 null 时忽略该条件
     */
    @Query("SELECT m FROM MonitorHistoryInfo m WHERE " +
           "(:monitorId IS NULL OR m.monitorId LIKE %:monitorId%) AND " +
           "(:startTime IS NULL OR m.createTime >= :startTime) AND " +
           "(:endTime IS NULL OR m.createTime <= :endTime) " +
           "ORDER BY m.createTime DESC")
    Page<MonitorHistoryInfo> findByFilters(@Param("monitorId") String monitorId,
                                           @Param("startTime") LocalDateTime startTime,
                                           @Param("endTime") LocalDateTime endTime,
                                           Pageable pageable);
}
