package com.egaz.visitors.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.List;

/**
 * Inalingana na jedwali `experts` kwenye visitors_db.
 */
@Entity
@Table(name = "experts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Expert {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "fullname", length = 255, nullable = false)
    private String fullname;

    @Column(name = "department", length = 255)
    private String department;

    // Upande wa "1" wa relationship: mtaalamu mmoja anaweza kuwa na visitors wengi.
    // mappedBy="expert" inarejea field "expert" iliyopo kwenye Visitor.java.
    @OneToMany(mappedBy = "expert")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Visitor> visitors;
}
