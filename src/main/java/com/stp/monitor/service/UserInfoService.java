package com.stp.monitor.service;

import com.stp.monitor.entity.UserInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserInfoService {

    UserInfo save(UserInfo userInfo);

    UserInfo findById(Long id);

    Page<UserInfo> findAll(Pageable pageable);

    void deleteById(Long id);

    UserInfo login(String username, String password);
}
