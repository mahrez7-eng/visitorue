package com.egaz.visitors.dto;

import com.egaz.visitors.entity.Role;

public record UserRequest(String fullname, String username, String password, Role role) {
}
