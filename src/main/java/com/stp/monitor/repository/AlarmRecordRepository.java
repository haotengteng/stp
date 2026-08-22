package com.stp.monitor.repository;

import com.stp.monitor.entity.AlarmRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlarmRecordRepository extends JpaRepository<AlarmRecord, Long> {

    List<AlarmRecord> findTop20ByOrderByCreateTimeDesc();

    long countByStatus(Integer status);

    long countByCreateTimeBetween(LocalDateTime start, LocalDateTime end);
}
