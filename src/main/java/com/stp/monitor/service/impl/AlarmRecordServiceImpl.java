package com.stp.monitor.service.impl;

import com.stp.monitor.entity.AlarmRecord;
import com.stp.monitor.repository.AlarmRecordRepository;
import com.stp.monitor.service.AlarmRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AlarmRecordServiceImpl implements AlarmRecordService {

    @Autowired
    private AlarmRecordRepository alarmRecordRepository;

    @Override
    public AlarmRecord save(AlarmRecord alarmRecord) {
        return alarmRecordRepository.save(alarmRecord);
    }

    @Override
    public AlarmRecord findById(Long id) {
        return alarmRecordRepository.findById(id).orElse(null);
    }

    @Override
    public Page<AlarmRecord> findAll(Pageable pageable) {
        return alarmRecordRepository.findAll(pageable);
    }

    @Override
    public void deleteById(Long id) {
        alarmRecordRepository.deleteById(id);
    }

    @Override
    public AlarmRecord process(Long id, Integer status) {
        AlarmRecord record = alarmRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("告警记录不存在"));
        record.setStatus(status);
        return alarmRecordRepository.save(record);
    }

    @Override
    public long countByStatus(Integer status) {
        return alarmRecordRepository.countByStatus(status);
    }

    @Override
    public long countToday(LocalDateTime start, LocalDateTime end) {
        return alarmRecordRepository.countByCreateTimeBetween(start, end);
    }
}
