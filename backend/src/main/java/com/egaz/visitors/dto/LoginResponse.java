package com.egaz.visitors.dto;

import com.egaz.visitors.entity.Role;

public record LoginResponse(String id, String fullname, String username, Role role) {
}
