package com.stp.monitor.controller;

import com.stp.monitor.auth.AuthTokenManager;
import com.stp.monitor.common.Result;
import com.stp.monitor.entity.UserInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 登录态相关接口：校验当前令牌、退出登录
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthTokenManager authTokenManager;

    /**
     * 校验当前令牌，返回登录用户信息（不含密码）
     */
    @GetMapping("/me")
    public Result<UserInfo> me(HttpServletRequest request) {
        String token = extractToken(request);
        UserInfo user = authTokenManager.getUser(token);
        if (user == null) {
            return Result.fail(401, "未登录或登录已过期");
        }
        return Result.success(user);
    }

    /**
     * 退出登录：使当前令牌失效
     */
    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request) {
        authTokenManager.remove(extractToken(request));
        return Result.success();
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }
}
