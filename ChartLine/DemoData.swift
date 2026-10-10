import Foundation

/// Every record in this file is synthetic. No real person, provider or employer is represented.
enum DemoData {
    static func date(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 9, _ min: Int = 0) -> Date {
        Calendar.current.date(from: DateComponents(year: y, month: m, day: d, hour: h, minute: min)) ?? .now
    }

    static let patient = Patient(
        name: "Jordan Reyes",
        mrn: "CL-000-48213",
        dateOfBirth: date(1981, 6, 14),
        sex: "Male",
        employer: "Northwind Logistics",
        primaryCare: "Dr. Priya Anand",
        plan: "Northwind PPO Gold"
    )

    private static func series(_ kind: LabKind, _ readings: [(Int, Int, Double)]) -> LabSeries {
        LabSeries(kind: kind, points: readings.map { LabPoint(date: date($0.0, $0.1, 12), value: $0.2) })
    }

    static let labs: [LabSeries] = [
        series(.a1c, [
            (2022, 3, 5.4), (2022, 10, 5.5), (2023, 4, 5.7), (2023, 11, 5.8),
            (2024, 6, 6.0), (2025, 1, 6.1), (2025, 8, 6.3), (2026, 3, 6.4),
        ]),
        series(.systolicBP, [
            (2022, 3, 118), (2022, 10, 121), (2023, 4, 120), (2023, 11, 125),
            (2024, 6, 127), (2025, 1, 131), (2025, 8, 133), (2026, 3, 136),
        ]),
        series(.ldl, [
            (2022, 3, 104), (2023, 4, 98), (2024, 6, 101), (2025, 8, 99), (2026, 3, 97),
        ]),
        series(.triglycerides, [
            (2022, 3, 128), (2022, 10, 134), (2023, 4, 139), (2023, 11, 147),
            (2024, 6, 152), (2025, 1, 158), (2025, 8, 166), (2026, 3, 174),
        ]),
    ]

    static let encounters: [Encounter] = [
        Encounter(date: date(2026, 3, 12), provider: "Dr. Priya Anand", type: "Annual physical",
                  summary: "A1C 6.4%, BP 136/86. Discussed diet and activity. Recheck in 6 months.", category: .encounters),
        Encounter(date: date(2025, 8, 12), provider: "Dr. Priya Anand", type: "Follow-up",
                  summary: "Prediabetes counseling. Started home BP log.", category: .encounters),
        Encounter(date: date(2025, 5, 3), provider: "Lakeside Urgent Care", type: "Urgent care",
                  summary: "Ankle sprain, grade I. RICE protocol.", category: .encounters),
        Encounter(date: date(2025, 2, 20), provider: "Dana Whitfield, LCSW", type: "Counseling session",
                  summary: "Work-related stress. Sleep hygiene plan.", category: .mentalHealth),
        Encounter(date: date(2024, 11, 8), provider: "Dana Whitfield, LCSW", type: "Counseling intake",
                  summary: "Adjustment disorder screening.", category: .mentalHealth),
        Encounter(date: date(2024, 6, 12), provider: "Dr. Priya Anand", type: "Annual physical",
                  summary: "A1C 6.0% — prediabetes. Referred to nutrition class.", category: .encounters),
    ]

    static let medications: [Medication] = [
        Medication(name: "Lisinopril", dose: "10 mg daily", started: date(2026, 3, 12), prescriber: "Dr. Priya Anand"),
        Medication(name: "Metformin ER", dose: "500 mg with dinner", started: date(2025, 8, 12), prescriber: "Dr. Priya Anand"),
        Medication(name: "Sertraline", dose: "50 mg daily", started: date(2024, 11, 20), prescriber: "Dr. Priya Anand"),
    ]

    static let providers: [String: [Provider]] = [
        "Endocrinology": [
            Provider(name: "Dr. Marcus Oyelaran", specialty: "Endocrinology", location: "Lakeside Medical Pavilion, Suite 300", rating: 4.9),
            Provider(name: "Dr. Helen Cho", specialty: "Endocrinology", location: "Riverbend Diabetes Center", rating: 4.8),
        ],
        "Cardiology": [
            Provider(name: "Dr. Samuel Brandt", specialty: "Cardiology", location: "Lakeside Heart & Vascular", rating: 4.8),
            Provider(name: "Dr. Aisha Kareem", specialty: "Cardiology", location: "Northgate Cardiology Group", rating: 4.9),
        ],
        "Lipid & Metabolic Clinic": [
            Provider(name: "Dr. Nina Castellanos", specialty: "Lipid & Metabolic Clinic", location: "Lakeside Medical Pavilion, Suite 210", rating: 4.8),
            Provider(name: "Leah Moreno, RDN", specialty: "Lipid & Metabolic Clinic", location: "Virtual visit", rating: 4.9),
        ],
    ]

    static let initialGrants: [Recipient: Set<DataCategory>] = [
        .primaryCare: Set(DataCategory.allCases),
        .specialist: [.labs, .vitals, .medications],
        .pharmacy: [.medications],
        .employerWellness: [.labs, .vitals, .encounters],
        .research: [],
    ]

    static let initialAudit: [AuditEvent] = [
        AuditEvent(date: date(2026, 9, 18, 14, 2), actor: "Dr. Priya Anand", action: "Viewed lab results", icon: "eye"),
        AuditEvent(date: date(2026, 9, 1, 3, 0), actor: "Northwind Wellness (aggregate)", action: "Included in de-identified Q3 roll-up", icon: "building.2"),
        AuditEvent(date: date(2026, 3, 12, 10, 41), actor: "Harbor Pharmacy", action: "Received Lisinopril prescription", icon: "pills"),
        AuditEvent(date: date(2026, 1, 4, 9, 15), actor: "Jordan Reyes", action: "Declined research data sharing", icon: "hand.raised"),
        AuditEvent(date: date(2025, 1, 10, 8, 30), actor: "Jordan Reyes", action: "Enrolled in Northwind wellness program (aggregate only)", icon: "checkmark.seal"),
    ]

    // MARK: Synthetic workforce

    static let employerName = "Northwind Logistics"

    private struct YearProfile {
        let physical: Double
        let a1cElevated: Double, a1cHigh: Double
        let bpElevated: Double, bpHigh: Double
        let rising: Double
        let followUp: Double
        let quarters: Int
    }

    private static let profiles: [Int: YearProfile] = [
        2024: YearProfile(physical: 0.49, a1cElevated: 0.24, a1cHigh: 0.10, bpElevated: 0.28, bpHigh: 0.15, rising: 0.16, followUp: 0.34, quarters: 4),
        2025: YearProfile(physical: 0.64, a1cElevated: 0.23, a1cHigh: 0.09, bpElevated: 0.26, bpHigh: 0.12, rising: 0.14, followUp: 0.63, quarters: 4),
        2026: YearProfile(physical: 0.52, a1cElevated: 0.22, a1cHigh: 0.08, bpElevated: 0.24, bpHigh: 0.11, rising: 0.10, followUp: 0.72, quarters: 3),
    ]

    static let departments: [(String, Int)] = [
        ("Operations", 142), ("Warehouse", 121), ("Sales", 68),
        ("Engineering", 54), ("Administration", 20), ("Executive", 9),
    ]

    static func workforce() -> [Employee] {
        var rng = SeededRandom(seed: 20_260_923)
        var employees: [Employee] = []
        var nextID = 1
        for (department, headcount) in departments {
            for _ in 0..<headcount {
                let consented = rng.chance(0.67)
                var years: [Int: YearMetrics] = [:]
                for year in profiles.keys.sorted() {
                    guard let p = profiles[year] else { continue }
                    func band(_ elevated: Double, _ high: Double) -> RiskBand {
                        let r = rng.next()
                        return r < high ? .high : (r < high + elevated ? .elevated : .normal)
                    }
                    let a1c = band(p.a1cElevated, p.a1cHigh)
                    let bp = band(p.bpElevated, p.bpHigh)
                    let atRisk = a1c != .normal || bp != .normal
                    let rising = rng.chance(atRisk ? p.rising * 2.2 : p.rising * 0.3)
                    let followUp = rising && rng.chance(p.followUp)
                    let erRate = rising && !followUp ? 0.35 : 0.08
                    years[year] = YearMetrics(
                        annualPhysical: rng.chance(p.physical),
                        a1c: a1c,
                        bloodPressure: bp,
                        risingFlag: rising,
                        flaggedQuarter: 1 + Int(rng.next() * Double(p.quarters)),
                        followUpBooked: followUp,
                        erVisits: rng.chance(erRate) ? 1 : 0
                    )
                }
                employees.append(Employee(id: nextID, department: department, consented: consented, years: years))
                nextID += 1
            }
        }
        return employees
    }
}

/// Deterministic SplitMix64 so the demo report is identical on every launch.
struct SeededRandom {
    private var state: UInt64
    init(seed: UInt64) { state = seed }

    mutating func next() -> Double {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        z ^= z >> 31
        return Double(z >> 11) / Double(1 << 53)
    }

    mutating func chance(_ p: Double) -> Bool { next() < p }
}
