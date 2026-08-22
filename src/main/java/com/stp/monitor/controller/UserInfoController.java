package com.stp.monitor.controller;

import com.stp.monitor.common.Result;
import com.stp.monitor.dto.UserInfoRequest;
import com.stp.monitor.entity.UserInfo;
import com.stp.monitor.service.UserInfoService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserInfoController {

    @Autowired
    private UserInfoService userInfoService;

    @GetMapping("/page")
    public Result<Page<UserInfo>> page(@RequestParam(defaultValue = "1") int pageNum,
                                       @RequestParam(defaultValue = "10") int pageSize) {
        Page<UserInfo> page = userInfoService.findAll(PageRequest.of(pageNum - 1, pageSize));
        return Result.success(page);
    }

    @GetMapping("/{id}")
    public Result<UserInfo> getById(@PathVariable Long id) {
        return Result.success(userInfoService.findById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody UserInfoRequest request) {
        UserInfo entity = new UserInfo();
        BeanUtils.copyProperties(request, entity);
        userInfoService.save(entity);
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody UserInfoRequest request) {
        UserInfo entity = new UserInfo();
        BeanUtils.copyProperties(request, entity);
        entity.setId(id);
        userInfoService.save(entity);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userInfoService.deleteById(id);
        return Result.success();
    }

    @PostMapping("/login")
    public Result<UserInfo> login(@RequestParam String username, @RequestParam String password) {
        UserInfo user = userInfoService.login(username, password);
        if (user == null) {
            return Result.fail("用户名或密码错误");
        }
        return Result.success(user);
    }
}
