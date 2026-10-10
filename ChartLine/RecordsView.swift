import SwiftUI

/// The patient's chart, rendered through the consent layer for whichever viewer is selected.
struct RecordsView: View {
    @Environment(AppStore.self) private var store
    @State private var viewer = Viewer.patient

    enum Viewer: String, CaseIterable, Identifiable {
        case patient = "Patient", primaryCare = "PCP", specialist = "Specialist", employer = "Employer"
        var id: String { rawValue }

        var recipient: Recipient? {
            switch self {
            case .patient: nil
            case .primaryCare: .primaryCare
            case .specialist: .specialist
            case .employer: .employerWellness
            }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    DemoBanner()
                    viewerPicker
                    if viewer == .employer {
                        employerWall
                    } else {
                        labsSection
                        medicationsSection
                        encountersSection
                    }
                }
                .padding()
            }
            .navyScreen()
            .navigationTitle("Health Record")
        }
    }

    private func canSee(_ category: DataCategory) -> Bool {
        guard let recipient = viewer.recipient else { return true }
        return store.hasConsent(recipient, category)
    }

    private var restrictionReason: String {
        "\(store.patient.name) has not shared this with \(viewer.recipient?.title ?? "")."
    }

    private var viewerPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("VIEWING AS").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            Picker("Viewing as", selection: $viewer) {
                ForEach(Viewer.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            if viewer != .patient {
                Text("Everything below is filtered live by the consent layer.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private var employerWall: some View {
        Card {
            Image(systemName: "hand.raised.square.fill").font(.largeTitle).foregroundStyle(.brand)
            Text("Individual records are never visible to employers").font(.headline)
            Text("Even with wellness consent on, \(store.patient.employer) only receives de-identified totals across consenting employees. Groups smaller than \(EmployerReport.minimumCellSize) people are suppressed. See the Employer tab for exactly what they receive.")
                .font(.subheadline).foregroundStyle(.secondary)
            Label(store.inEmployerAggregate ? "Included in aggregate counts" : "Excluded from aggregate counts",
                  systemImage: store.inEmployerAggregate ? "checkmark.circle" : "minus.circle")
                .font(.subheadline.weight(.medium))
        }
    }

    // MARK: Sections

    private var labsSection: some View {
        VStack(spacing: 12) {
            SectionHeader(title: "Labs & Vitals", subtitle: "Trend lines include reference ranges")
            ForEach(store.labs) { series in
                if canSee(series.kind.category) {
                    LabCard(series: series, flag: store.flags.first { $0.kind == series.kind })
                } else {
                    RestrictedRow(category: series.kind.category, reason: restrictionReason)
                }
            }
        }
    }

    private var medicationsSection: some View {
        VStack(spacing: 12) {
            SectionHeader(title: "Medications")
            if canSee(.medications) {
                Card {
                    ForEach(store.medications) { med in
                        HStack {
                            Image(systemName: "pills.fill").foregroundStyle(.brand)
                            VStack(alignment: .leading) {
                                Text(med.name).font(.subheadline.weight(.semibold))
                                Text("\(med.dose) · since \(med.started.formatted(.dateTime.month().year()))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        if med.id != store.medications.last?.id { Divider() }
                    }
                }
            } else {
                RestrictedRow(category: .medications, reason: restrictionReason)
            }
        }
    }

    private var encountersSection: some View {
        VStack(spacing: 12) {
            SectionHeader(title: "Visit History")
            ForEach(store.encounters) { encounter in
                if canSee(encounter.category) {
                    Card {
                        HStack {
                            Text(encounter.type).font(.subheadline.weight(.semibold))
                            if encounter.category.isSensitive {
                                Image(systemName: "lock.shield.fill").foregroundStyle(.purple)
                            }
                            Spacer()
                            Text(encounter.date.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Text(encounter.provider).font(.caption).foregroundStyle(.secondary)
                        Text(encounter.summary).font(.subheadline)
                    }
                } else {
                    RestrictedRow(category: encounter.category, reason: restrictionReason)
                }
            }
        }
    }
}

struct LabCard: View {
    let series: LabSeries
    let flag: TrendFlag?

    var body: some View {
        Card {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(series.kind.name).font(.headline)
                    if let latest = series.latest {
                        Text("\(series.kind.format(latest.value)) \(series.kind.unit)")
                            .font(.title3.bold()).monospacedDigit()
                        + Text("  \(latest.date.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if let flag { SeverityPill(severity: flag.severity) }
            }
            LabTrendChart(series: series, flag: flag)
            if let flag {
                Text(flag.detail).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
