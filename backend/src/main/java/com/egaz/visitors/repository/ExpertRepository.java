package com.egaz.visitors.repository;

import com.egaz.visitors.entity.Expert;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpertRepository extends JpaRepository<Expert, String> {
}
