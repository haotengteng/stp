package com.stp.monitor.service.impl;

import com.stp.monitor.entity.UserInfo;
import com.stp.monitor.repository.UserInfoRepository;
import com.stp.monitor.service.UserInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class UserInfoServiceImpl implements UserInfoService {

    @Autowired
    private UserInfoRepository userInfoRepository;

    @Override
    public UserInfo save(UserInfo userInfo) {
        return userInfoRepository.save(userInfo);
    }

    @Override
    public UserInfo findById(Long id) {
        return userInfoRepository.findById(id).orElse(null);
    }

    @Override
    public Page<UserInfo> findAll(Pageable pageable) {
        return userInfoRepository.findAll(pageable);
    }

    @Override
    public void deleteById(Long id) {
        userInfoRepository.deleteById(id);
    }

    @Override
    public UserInfo login(String username, String password) {
        return userInfoRepository.findByUsernameAndPassword(username, password).orElse(null);
    }
}
