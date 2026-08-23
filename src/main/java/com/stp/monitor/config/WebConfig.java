package com.stp.monitor.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 前端页面路由配置
 * 将根路径重定向到登录页，前端静态资源由 Spring Boot 默认静态资源处理器提供
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 根路径重定向到登录页
        registry.addRedirectViewController("/", "/login.html");
    }
}
