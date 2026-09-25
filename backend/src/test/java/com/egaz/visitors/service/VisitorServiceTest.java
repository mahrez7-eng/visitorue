package com.egaz.visitors.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.egaz.visitors.dto.VisitorRequest;
import com.egaz.visitors.dto.VisitorResponse;
import com.egaz.visitors.entity.Expert;
import com.egaz.visitors.entity.Visitor;
import com.egaz.visitors.repository.ExpertRepository;
import com.egaz.visitors.repository.VisitorRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VisitorServiceTest {

    @Mock
    private VisitorRepository visitorRepository;

    @Mock
    private ExpertRepository expertRepository;

    private VisitorService visitorService;

    @BeforeEach
    void setUp() {
        visitorService = new VisitorService(visitorRepository, expertRepository);
    }

    @Test
    void create_reactivatesExistingCheckedOutVisitorInsteadOfCreatingDuplicate() {
        Visitor existing = new Visitor();
        existing.setId("existing-id");
        existing.setFullName("Jane Doe");
        existing.setPhone("+255700000000");
        existing.setIdNumber("123456");
        existing.setPurpose("Meeting");
        existing.setCheckInDate(LocalDateTime.now().minusDays(2));
        existing.setCheckOutDate(LocalDateTime.now().minusDays(1));

        when(visitorRepository.findFirstByIdNumberIgnoreCaseOrderByCheckInDateDesc("123456"))
            .thenReturn(Optional.of(existing));
        when(visitorRepository.save(any(Visitor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VisitorRequest request = new VisitorRequest(
            "Jane Doe",
            "jane@example.com",
            "+255700000000",
            "EGAZ",
            "NIDA",
            "123456",
            null,
            "N/A",
            "Meeting",
            "Reception",
            null
        );

        VisitorResponse response = visitorService.create(request);

        assertNotNull(response);
        assertEquals("existing-id", response.id());
        assertEquals("Jane Doe", response.fullName());
        assertEquals("Meeting", response.purpose());
        assertEquals(null, response.checkOutDate());
    }
}
