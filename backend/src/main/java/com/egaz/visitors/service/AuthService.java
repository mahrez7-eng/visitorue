package com.egaz.visitors.service;

import com.egaz.visitors.dto.LoginRequest;
import com.egaz.visitors.dto.LoginResponse;
import com.egaz.visitors.entity.User;
import com.egaz.visitors.exception.ResourceNotFoundException;
import com.egaz.visitors.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class  AuthService {
    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        if (request == null || request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("username and password are required");
        }
        User user = userRepository.findByUsername(request.username().trim())
            .orElseThrow(() -> new ResourceNotFoundException("Invalid username or password"));
        if (!request.password().equals(user.getPassword())) {
            throw new ResourceNotFoundException("Invalid username or password");
        }
        return new LoginResponse(user.getId(), user.getFullname(), user.getUsername(), user.getRole());
    }
}
