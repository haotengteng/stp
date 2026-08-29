package com.stp.monitor.vo;

import com.stp.monitor.entity.UserInfo;
import lombok.Data;

/**
 * 登录返回结果：用户信息（不含密码）+ 访问令牌
 */
@Data
public class LoginVo {

    private UserInfo user;

    private String token;
}
