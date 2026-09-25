package com.egaz.visitors.dto;

import com.egaz.visitors.entity.Role;
import java.time.LocalDateTime;

public record UserResponse(String id, String fullname, String username, Role role, LocalDateTime createdAt) {
}
