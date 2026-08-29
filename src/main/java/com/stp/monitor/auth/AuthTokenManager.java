package com.stp.monitor.auth;

import com.stp.monitor.entity.UserInfo;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 内存令牌管理：token -> 登录用户（已脱敏，不含密码）
 * 令牌仅在服务运行期间有效，服务重启后全部失效，需重新登录
 */
@Component
public class AuthTokenManager {

    private final Map<String, UserInfo> tokens = new ConcurrentHashMap<>();

    /**
     * 创建令牌并关联登录用户
     */
    public String create(UserInfo user) {
        String token = UUID.randomUUID().toString().replace("-", "");
        tokens.put(token, user);
        return token;
    }

    /**
     * 校验令牌是否有效
     */
    public boolean isValid(String token) {
        return token != null && tokens.containsKey(token);
    }

    /**
     * 获取令牌对应的用户，无效返回 null
     */
    public UserInfo getUser(String token) {
        return isValid(token) ? tokens.get(token) : null;
    }

    /**
     * 使令牌失效（退出登录）
     */
    public void remove(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }
}
