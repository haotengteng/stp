package com.stp.monitor.service;

import com.stp.monitor.entity.AlarmRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface AlarmRecordService {

    AlarmRecord save(AlarmRecord alarmRecord);

    AlarmRecord findById(Long id);

    Page<AlarmRecord> findAll(Pageable pageable);

    void deleteById(Long id);

    AlarmRecord process(Long id, Integer status);

    long countByStatus(Integer status);

    long countToday(LocalDateTime start, LocalDateTime end);
}
