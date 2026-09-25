package com.egaz.visitors.service;

import com.egaz.visitors.dto.ExpertRequest;
import com.egaz.visitors.dto.ExpertResponse;
import com.egaz.visitors.entity.Expert;
import com.egaz.visitors.exception.ConflictException;
import com.egaz.visitors.exception.ResourceNotFoundException;
import com.egaz.visitors.repository.ExpertRepository;
import com.egaz.visitors.repository.VisitorRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExpertService {
    private final ExpertRepository repository;
    private final VisitorRepository visitorRepository;

    public ExpertService(ExpertRepository repository, VisitorRepository visitorRepository) {
        this.repository = repository;
        this.visitorRepository = visitorRepository;
    }

    @Transactional(readOnly = true)
    public List<ExpertResponse> findAll() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ExpertResponse findById(String id) { return toResponse(get(id)); }

    public ExpertResponse create(ExpertRequest request) {
        validate(request);
        Expert e = new Expert();
        e.setId(UUID.randomUUID().toString());
        e.setFullname(request.fullname().trim());
        e.setDepartment(clean(request.department()));
        return toResponse(repository.save(e));
    }

    public ExpertResponse update(String id, ExpertRequest request) {
        validate(request);
        Expert e = get(id);
        e.setFullname(request.fullname().trim());
        e.setDepartment(clean(request.department()));
        return toResponse(repository.save(e));
    }

    public void delete(String id) {
        Expert e = get(id);
        if (visitorRepository.countByExpert_Id(id) > 0) {
            throw new ConflictException("Cannot delete expert while visitors are assigned to this expert");
        }
        repository.delete(e);
    }

    private Expert get(String id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Expert not found: " + id));
    }

    private void validate(ExpertRequest r) {
        if (r == null || r.fullname() == null || r.fullname().trim().isEmpty())
            throw new IllegalArgumentException("fullname is required");
    }

    private String clean(String value) { return value == null || value.trim().isEmpty() ? null : value.trim(); }
    private ExpertResponse toResponse(Expert e) { return new ExpertResponse(e.getId(), e.getFullname(), e.getDepartment()); }
}
