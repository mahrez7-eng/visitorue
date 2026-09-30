package com.egaz.visitors.service;

import com.egaz.visitors.dto.CheckoutRequest;
import com.egaz.visitors.dto.VisitorRequest;
import com.egaz.visitors.dto.VisitorResponse;
import com.egaz.visitors.entity.Expert;
import com.egaz.visitors.entity.Visitor;
import com.egaz.visitors.exception.ResourceNotFoundException;
import com.egaz.visitors.repository.ExpertRepository;
import com.egaz.visitors.repository.VisitorRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VisitorService {
    private static final Duration AUTO_CHECKOUT_AFTER = Duration.ofMinutes(220);
    private static final String AUTO_CHECKOUT_REFERENCE = "System help you to checkout the visitor";
    private static final String DEFAULT_VISITOR_COMPANY = "E-Government of Zanzibar";

    private final VisitorRepository repository;
    private final ExpertRepository expertRepository;

    public VisitorService(VisitorRepository repository, ExpertRepository expertRepository) {
        this.repository = repository;
        this.expertRepository = expertRepository;
    }

    @Transactional(readOnly = true)
    public List<VisitorResponse> findAll(String expertId, Boolean active, LocalDate from, LocalDate to) {
        List<Visitor> visitors;
        if (expertId != null && !expertId.isBlank()) {
            visitors = repository.findByExpert_IdOrderByCheckInDateDesc(expertId);
        } else if (Boolean.TRUE.equals(active)) {
            visitors = repository.findByCheckOutDateIsNullOrderByCheckInDateDesc();
        } else if (from != null || to != null) {
            LocalDateTime start = from != null ? from.atStartOfDay() : LocalDateTime.of(1970,1,1,0,0);
            LocalDateTime end = to != null ? to.atTime(LocalTime.MAX) : LocalDateTime.of(9999,12,31,23,59,59);
            if (start.isAfter(end)) throw new IllegalArgumentException("from must not be after to");
            visitors = repository.findByCheckInDateBetweenOrderByCheckInDateDesc(start, end);
        } else {
            visitors = repository.findAllByOrderByCheckInDateDesc();
        }
        return visitors.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public VisitorResponse findById(String id) { return toResponse(get(id)); }

    @Transactional(readOnly = true)
    public VisitorResponse findByIdentity(String idNumber) {
        if (blank(idNumber)) return null;
        return repository.findFirstByIdNumberIgnoreCaseOrderByCheckInDateDesc(idNumber.trim())
            .map(this::toResponse)
            .orElse(null);
    }

    public VisitorResponse create(VisitorRequest request) {
        validate(request);
        String idNumber = clean(request.idNumber());
        Visitor existing = idNumber != null ? repository.findFirstByIdNumberIgnoreCaseOrderByCheckInDateDesc(idNumber).orElse(null) : null;

        if (existing != null) {
            apply(existing, request, false);
            existing.setCompany(DEFAULT_VISITOR_COMPANY);
            existing.setCheckInDate(LocalDateTime.now());
            existing.setCheckOutDate(null);
            return toResponse(repository.save(existing));
        }

        Visitor v = new Visitor();
        v.setId(UUID.randomUUID().toString());
        apply(v, request, true);
        v.setCompany(DEFAULT_VISITOR_COMPANY);
        return toResponse(repository.save(v));
    }

    public VisitorResponse update(String id, VisitorRequest request) {
        validate(request);
        Visitor v = get(id);
        apply(v, request, false);
        return toResponse(repository.save(v));
    }

    public VisitorResponse checkout(String id, CheckoutRequest request) {
        Visitor v = get(id);
        if (v.getCheckOutDate() != null)
            throw new IllegalArgumentException("Visitor has already checked out");
        LocalDateTime checkout = request != null && request.checkOutDate() != null
            ? request.checkOutDate() : LocalDateTime.now();
        if (checkout.isBefore(v.getCheckInDate()))
            throw new IllegalArgumentException("checkOutDate cannot be before checkInDate");
        v.setCheckOutDate(checkout);
        v.setCheckoutReference(resolveCheckoutReference(request));
        return toResponse(repository.save(v));
    }

    @Scheduled(cron = "0 * * * * *")
    public void autoCheckoutExpiredVisitors() {
        autoCheckoutExpiredVisitors(LocalDateTime.now());
    }

    void autoCheckoutExpiredVisitors(LocalDateTime now) {
        LocalDateTime cutoff = now.minus(AUTO_CHECKOUT_AFTER);
        List<Visitor> activeVisitors = repository.findByCheckOutDateIsNullOrderByCheckInDateDesc();

        for (Visitor visitor : activeVisitors) {
            LocalDateTime checkIn = visitor.getCheckInDate();
            if (checkIn == null || checkIn.isAfter(cutoff)) {
                continue;
            }
            visitor.setCheckOutDate(checkIn.plus(AUTO_CHECKOUT_AFTER));
            visitor.setCheckoutReference(AUTO_CHECKOUT_REFERENCE);
            repository.save(visitor);
        }
    }

    public void delete(String id) { repository.delete(get(id)); }

    private Visitor get(String id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Visitor not found: " + id));
    }

    private void validate(VisitorRequest r) {
        if (r == null || blank(r.fullName()) || blank(r.phone()) || blank(r.purpose()))
            throw new IllegalArgumentException("fullName, phone and purpose are required");
    }

    private void apply(Visitor v, VisitorRequest r, boolean creating) {
        v.setFullName(r.fullName().trim());
        v.setEmail(clean(r.email()));
        v.setPhone(r.phone().trim());
        v.setCompany(clean(r.company()));
        v.setIdType(clean(r.idType()));
        v.setIdNumber(clean(r.idNumber()));
        v.setPersonToVisit(clean(r.personToVisit()));
        v.setPurpose(r.purpose().trim());
        v.setRecordedBy(clean(r.recordedBy()));
        if (r.expertId() != null && !r.expertId().isBlank()) {
            Expert expert = expertRepository.findById(r.expertId())
                .orElseThrow(() -> new ResourceNotFoundException("Expert not found: " + r.expertId()));
            v.setExpert(expert);
        } else {
            v.setExpert(null);
        }
        if (creating) v.setCheckInDate(r.checkInDate() != null ? r.checkInDate() : LocalDateTime.now());
    }

    private String clean(String s) { return s == null || s.trim().isEmpty() ? null : s.trim(); }
    private boolean blank(String s) { return s == null || s.trim().isEmpty(); }

    private String resolveCheckoutReference(CheckoutRequest request) {
        return request == null ? null : clean(request.reference());
    }

    private VisitorResponse toResponse(Visitor v) {
        Expert e = v.getExpert();
        return new VisitorResponse(v.getId(), v.getFullName(), v.getEmail(), v.getPhone(), v.getCompany(),
            v.getIdType(), v.getIdNumber(), e != null ? e.getId() : null, e != null ? e.getFullname() : null,
            v.getPersonToVisit(), v.getPurpose(), v.getRecordedBy(), v.getCheckInDate(), v.getCheckOutDate(), v.getCheckoutReference());
    }
}
