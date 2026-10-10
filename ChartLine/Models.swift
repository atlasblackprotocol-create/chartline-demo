import Foundation

// MARK: - Clinical data

enum LabKind: String, CaseIterable, Identifiable, Hashable {
    case a1c, systolicBP, ldl, triglycerides

    var id: String { rawValue }

    var name: String {
        switch self {
        case .a1c: "Hemoglobin A1C"
        case .systolicBP: "Systolic Blood Pressure"
        case .ldl: "LDL Cholesterol"
        case .triglycerides: "Triglycerides"
        }
    }

    var shortName: String {
        switch self {
        case .a1c: "A1C"
        case .systolicBP: "Systolic BP"
        case .ldl: "LDL"
        case .triglycerides: "Triglycerides"
        }
    }

    var unit: String {
        switch self {
        case .a1c: "%"
        case .systolicBP: "mmHg"
        case .ldl: "mg/dL"
        case .triglycerides: "mg/dL"
        }
    }

    /// Top of the healthy reference range.
    var normalUpper: Double {
        switch self {
        case .a1c: 5.7
        case .systolicBP: 120
        case .ldl: 100
        case .triglycerides: 150
        }
    }

    /// Level at which the value becomes clinically significant.
    var concernThreshold: Double {
        switch self {
        case .a1c: 6.5
        case .systolicBP: 130
        case .ldl: 160
        case .triglycerides: 200
        }
    }

    var concernLabel: String {
        switch self {
        case .a1c: "diabetes range"
        case .systolicBP: "Stage 1 hypertension"
        case .ldl: "high LDL"
        case .triglycerides: "high range"
        }
    }

    var category: DataCategory {
        switch self {
        case .a1c, .ldl, .triglycerides: .labs
        case .systolicBP: .vitals
        }
    }

    var specialty: String {
        switch self {
        case .a1c: "Endocrinology"
        case .systolicBP, .ldl: "Cardiology"
        case .triglycerides: "Lipid & Metabolic Clinic"
        }
    }

    func format(_ value: Double) -> String {
        switch self {
        case .a1c: String(format: "%.1f", value)
        case .systolicBP, .ldl, .triglycerides: String(format: "%.0f", value)
        }
    }
}

struct LabPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}

struct LabSeries: Identifiable {
    var id: LabKind { kind }
    let kind: LabKind
    let points: [LabPoint]

    var latest: LabPoint? { points.max { $0.date < $1.date } }
}

struct Encounter: Identifiable {
    let id = UUID()
    let date: Date
    let provider: String
    let type: String
    let summary: String
    let category: DataCategory
}

struct Medication: Identifiable {
    let id = UUID()
    let name: String
    let dose: String
    let started: Date
    let prescriber: String
}

struct Patient {
    let name: String
    let mrn: String
    let dateOfBirth: Date
    let sex: String
    let employer: String
    let primaryCare: String
    let plan: String
}

// MARK: - Consent

enum DataCategory: String, CaseIterable, Identifiable, Hashable {
    case labs, vitals, medications, encounters, mentalHealth, reproductive, substanceUse

    var id: String { rawValue }

    var title: String {
        switch self {
        case .labs: "Lab Results"
        case .vitals: "Vitals"
        case .medications: "Medications"
        case .encounters: "Visit History"
        case .mentalHealth: "Behavioral Health"
        case .reproductive: "Reproductive Health"
        case .substanceUse: "Substance Use Treatment"
        }
    }

    var icon: String {
        switch self {
        case .labs: "testtube.2"
        case .vitals: "heart.text.square"
        case .medications: "pills"
        case .encounters: "stethoscope"
        case .mentalHealth: "brain.head.profile"
        case .reproductive: "figure.2.and.child.holdinghands"
        case .substanceUse: "cross.vial"
        }
    }

    var isSensitive: Bool {
        switch self {
        case .mentalHealth, .reproductive, .substanceUse: true
        default: false
        }
    }

    var protectionNote: String? {
        switch self {
        case .mentalHealth: "Psychotherapy notes require separate authorization"
        case .reproductive: "Protected under the HIPAA reproductive health privacy rule"
        case .substanceUse: "Protected under 42 CFR Part 2"
        default: nil
        }
    }
}

enum Recipient: String, CaseIterable, Identifiable, Hashable {
    case primaryCare, specialist, pharmacy, employerWellness, research

    var id: String { rawValue }

    var title: String {
        switch self {
        case .primaryCare: "Primary Care Team"
        case .specialist: "Referred Specialists"
        case .pharmacy: "Pharmacy"
        case .employerWellness: "Employer Wellness Program"
        case .research: "Research Network"
        }
    }

    var subtitle: String {
        switch self {
        case .primaryCare: "Dr. Priya Anand · Lakeside Family Medicine"
        case .specialist: "Only providers you book with through ChartLine"
        case .pharmacy: "Harbor Pharmacy #0412"
        case .employerWellness: "Northwind Logistics · aggregate, de-identified only"
        case .research: "De-identified, IRB-approved studies only"
        }
    }

    var icon: String {
        switch self {
        case .primaryCare: "person.crop.circle.badge.checkmark"
        case .specialist: "stethoscope.circle"
        case .pharmacy: "cross.case"
        case .employerWellness: "building.2"
        case .research: "chart.bar.doc.horizontal"
        }
    }

    /// Categories that can ever be shared with this recipient.
    var allowedCategories: [DataCategory] {
        switch self {
        case .primaryCare, .specialist: DataCategory.allCases
        case .pharmacy: [.medications]
        case .employerWellness: [.labs, .vitals, .encounters]
        case .research: [.labs, .vitals, .medications, .encounters]
        }
    }

    var isAggregateOnly: Bool {
        self == .employerWellness || self == .research
    }
}

struct AuditEvent: Identifiable {
    let id = UUID()
    let date: Date
    let actor: String
    let action: String
    let icon: String
}

// MARK: - Trends & scheduling

enum Severity: Int, Comparable {
    case watch = 1, elevated, high

    static func < (lhs: Severity, rhs: Severity) -> Bool { lhs.rawValue < rhs.rawValue }

    var label: String {
        switch self {
        case .watch: "Watch"
        case .elevated: "Rising risk"
        case .high: "Action needed"
        }
    }
}

struct TrendFlag: Identifiable {
    var id: LabKind { kind }
    let kind: LabKind
    let severity: Severity
    let slopePerYear: Double
    let latest: Double
    let projected: Double
    let readings: Int
    let headline: String
    let detail: String
}

struct Provider: Identifiable, Hashable {
    var id: String { name }
    let name: String
    let specialty: String
    let location: String
    let rating: Double
}

struct Appointment: Identifiable {
    let id = UUID()
    let date: Date
    let provider: Provider
    let reason: String
    let linkedFlag: LabKind?
    var sharedTrend: Bool
}

// MARK: - Workforce (employer aggregate)

enum RiskBand: String, CaseIterable, Identifiable {
    case normal = "Normal", elevated = "Elevated", high = "High"
    var id: String { rawValue }
}

struct YearMetrics {
    var annualPhysical: Bool
    var a1c: RiskBand
    var bloodPressure: RiskBand
    var risingFlag: Bool
    var flaggedQuarter: Int
    var followUpBooked: Bool
    var erVisits: Int
}

struct Employee: Identifiable {
    let id: Int
    let department: String
    let consented: Bool
    let years: [Int: YearMetrics]
}
