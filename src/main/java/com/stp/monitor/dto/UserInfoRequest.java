package com.stp.monitor.dto;

import lombok.Data;

@Data
public class UserInfoRequest {

    private String userId;

    private String username;

    private String password;
}
