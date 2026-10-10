import Foundation
import Observation

@Observable
final class AppStore {
    let patient = DemoData.patient
    let labs = DemoData.labs
    let encounters = DemoData.encounters
    let medications = DemoData.medications
    let workforce = DemoData.workforce()

    var grants = DemoData.initialGrants
    var audit = DemoData.initialAudit
    var appointments: [Appointment] = []

    let flags: [TrendFlag] = DemoData.labs
        .compactMap(TrendEngine.analyze)
        .sorted { $0.severity > $1.severity }

    // MARK: Consent

    func hasConsent(_ recipient: Recipient, _ category: DataCategory) -> Bool {
        grants[recipient, default: []].contains(category)
    }

    func setConsent(_ recipient: Recipient, _ category: DataCategory, _ granted: Bool) {
        guard hasConsent(recipient, category) != granted else { return }
        if granted {
            grants[recipient, default: []].insert(category)
        } else {
            grants[recipient, default: []].remove(category)
        }
        log(
            actor: patient.name,
            action: "\(granted ? "Granted" : "Revoked") \(category.title) → \(recipient.title)",
            icon: granted ? "checkmark.shield" : "xmark.shield"
        )
    }

    func revokeAll(_ recipient: Recipient) {
        guard !grants[recipient, default: []].isEmpty else { return }
        grants[recipient] = []
        log(actor: patient.name, action: "Revoked all sharing → \(recipient.title)", icon: "xmark.shield.fill")
    }

    var inEmployerAggregate: Bool { !grants[.employerWellness, default: []].isEmpty }

    private func log(actor: String, action: String, icon: String) {
        audit.insert(AuditEvent(date: .now, actor: actor, action: action, icon: icon), at: 0)
    }

    // MARK: Records

    /// The employee handed a copy of their own record to someone outside ChartLine.
    func logReportShared(_ options: HealthReportOptions, via destination: String) {
        let recipient = options.preparedFor.trimmingCharacters(in: .whitespacesAndNewlines)
        let to = recipient.isEmpty ? "" : " for \(recipient)"
        log(
            actor: patient.name,
            action: "Shared health report\(to) via \(destination): \(options.sectionTitles.joined(separator: ", "))",
            icon: "square.and.arrow.up"
        )
    }

    func series(_ kind: LabKind) -> LabSeries? { labs.first { $0.kind == kind } }

    // MARK: Appointments

    func appointment(for kind: LabKind) -> Appointment? {
        appointments.first { $0.linkedFlag == kind }
    }

    func book(provider: Provider, date: Date, reason: String, flag: LabKind?, shareTrend: Bool) {
        appointments.append(Appointment(date: date, provider: provider, reason: reason, linkedFlag: flag, sharedTrend: shareTrend))
        appointments.sort { $0.date < $1.date }
        log(
            actor: patient.name,
            action: "Booked \(provider.specialty) with \(provider.name) for \(date.formatted(date: .abbreviated, time: .shortened))",
            icon: "calendar.badge.plus"
        )
        if shareTrend, let flag {
            setConsent(.specialist, flag.category, true)
            log(actor: "ChartLine", action: "Shared \(flag.shortName) trend packet with \(provider.name)", icon: "paperplane")
        }
    }

    func cancel(_ appointment: Appointment) {
        appointments.removeAll { $0.id == appointment.id }
        log(actor: patient.name, action: "Cancelled visit with \(appointment.provider.name)", icon: "calendar.badge.minus")
    }

    // MARK: Employer report

    func employerReport(year: Int) -> EmployerReport {
        var cohort = workforce
        // The demo patient is also a Northwind employee. They appear in the roll-up
        // only while they consent to the wellness program.
        cohort.append(Employee(
            id: 0,
            department: "Operations",
            consented: inEmployerAggregate,
            years: [
                2024: YearMetrics(annualPhysical: true, a1c: .elevated, bloodPressure: .elevated, risingFlag: true, flaggedQuarter: 2, followUpBooked: false, erVisits: 0),
                2025: YearMetrics(annualPhysical: false, a1c: .elevated, bloodPressure: .high, risingFlag: true, flaggedQuarter: 3, followUpBooked: false, erVisits: 1),
                2026: YearMetrics(annualPhysical: true, a1c: .elevated, bloodPressure: .high, risingFlag: true, flaggedQuarter: 1,
                                  followUpBooked: !appointments.filter { $0.linkedFlag != nil }.isEmpty, erVisits: 0),
            ]
        ))
        return EmployerReport(year: year, cohort: cohort)
    }
}

/// Everything an employer is allowed to see: counts and rates over consenting employees,
/// with small cells suppressed so no individual can be re-identified.
struct EmployerReport {
    static let minimumCellSize = 11

    struct DepartmentRow: Identifiable {
        var id: String { name }
        let name: String
        let participants: Int
        let physicalRate: Double?
        let flaggedRate: Double?
        var suppressed: Bool { physicalRate == nil }
    }

    struct QuarterRow: Identifiable {
        var id: Int { quarter }
        let quarter: Int
        let flagged: Int
        let followUps: Int
    }

    let year: Int
    let eligible: Int
    let participants: [YearMetrics]
    let departments: [DepartmentRow]
    let quarters: [QuarterRow]

    init(year: Int, cohort: [Employee]) {
        self.year = year
        eligible = cohort.count
        let consenting = cohort.filter(\.consented)
        participants = consenting.compactMap { $0.years[year] }

        departments = DemoData.departments.map { name, _ in
            let rows = consenting.filter { $0.department == name }.compactMap { $0.years[year] }
            guard rows.count >= Self.minimumCellSize else {
                return DepartmentRow(name: name, participants: rows.count, physicalRate: nil, flaggedRate: nil)
            }
            let n = Double(rows.count)
            return DepartmentRow(
                name: name,
                participants: rows.count,
                physicalRate: Double(rows.filter(\.annualPhysical).count) / n,
                flaggedRate: Double(rows.filter(\.risingFlag).count) / n
            )
        }

        let flaggedRows = participants.filter(\.risingFlag)
        quarters = (1...4).map { q in
            let inQuarter = flaggedRows.filter { $0.flaggedQuarter == q }
            return QuarterRow(quarter: q, flagged: inQuarter.count, followUps: inQuarter.filter(\.followUpBooked).count)
        }
    }

    var isYearToDate: Bool { year == Calendar.current.component(.year, from: .now) }
    var participationRate: Double { rate(participants.count, eligible) }
    var physicalRate: Double { rate(participants.filter(\.annualPhysical).count, participants.count) }
    var flaggedCount: Int { participants.filter(\.risingFlag).count }
    var followUpCount: Int { participants.filter(\.followUpBooked).count }
    var followUpRate: Double { rate(followUpCount, flaggedCount) }
    var erVisits: Int { participants.map(\.erVisits).reduce(0, +) }
    var erPer100: Double { rate(erVisits, participants.count) * 100 }

    func distribution(_ metric: KeyPath<YearMetrics, RiskBand>) -> [(RiskBand, Int)] {
        RiskBand.allCases.map { band in (band, participants.filter { $0[keyPath: metric] == band }.count) }
    }

    private func rate(_ a: Int, _ b: Int) -> Double { b == 0 ? 0 : Double(a) / Double(b) }
}
