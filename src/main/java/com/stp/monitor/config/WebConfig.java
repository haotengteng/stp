package com.stp.monitor.config;

import com.stp.monitor.auth.AuthInterceptor;
import com.stp.monitor.auth.AuthTokenManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 前端页面路由配置 + 接口鉴权拦截器
 * 将根路径重定向到登录页，前端静态资源由 Spring Boot 默认静态资源处理器提供
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private AuthTokenManager authTokenManager;

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 根路径重定向到登录页
        registry.addRedirectViewController("/", "/login.html");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 所有 /api/** 请求需携带有效令牌（登录接口除外）
        registry.addInterceptor(new AuthInterceptor(authTokenManager))
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/user/login");
    }
}
