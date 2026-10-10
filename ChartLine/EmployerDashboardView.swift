import Charts
import SwiftUI

/// What an employer receives from ChartLine: an annual, de-identified population report.
struct EmployerDashboardView: View {
    @Environment(AppStore.self) private var store
    @State private var year = 2025

    private let years = [2024, 2025, 2026]

    var body: some View {
        let report = store.employerReport(year: year)
        let prior = years.contains(year - 1) ? store.employerReport(year: year - 1) : nil

        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    DemoBanner()
                    Picker("Year", selection: $year) {
                        ForEach(years, id: \.self) { y in
                            Text(y == 2026 ? "2026 YTD" : String(y)).tag(y)
                        }
                    }
                    .pickerStyle(.segmented)

                    header(report)
                    kpis(report, prior: prior)
                    quarterlyChart(report)
                    riskDistribution(report)
                    yearOverYear
                    departmentTable(report)
                    recommendations(report, prior: prior)
                    neverShared
                }
                .padding()
            }
            .navyScreen()
            .navigationTitle("Employer Portal")
            .toolbar {
                ShareLink(item: summary(report, prior: prior)) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
    }

    // MARK: Header

    private func header(_ report: EmployerReport) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(DemoData.employerName.uppercased()).font(.caption.weight(.bold)).opacity(0.8)
            Text("\(String(report.year)) \(report.isYearToDate ? "Year-to-Date" : "Annual") Health Insights")
                .font(.title2.bold())
            HStack(spacing: 8) {
                Image("ChartLineMark").resizable().scaledToFit().frame(width: 26, height: 26)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                Text("Prepared by ChartLine Health · \(report.isYearToDate ? "Through Q3" : "Jan 1 – Dec 31")")
                    .font(.subheadline).opacity(0.85)
            }
            HStack(spacing: 6) {
                Image(systemName: "lock.shield.fill")
                Text("De-identified · consenting employees only · groups < \(EmployerReport.minimumCellSize) suppressed")
            }
            .font(.caption.weight(.medium))
            .padding(8)
            .background(.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 8))
        }
        .foregroundStyle(.white)
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [.brandDeep, Color(red: 0.13, green: 0.2, blue: 0.33)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 20)
        )
    }

    // MARK: KPIs

    private func delta(_ now: Double, _ before: Double?) -> String? {
        guard let before else { return nil }
        let d = (now - before) * 100
        return String(format: "%@%.0f pts vs prior year", d >= 0 ? "+" : "", d)
    }

    private func kpis(_ r: EmployerReport, prior: EmployerReport?) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatTile(title: "Eligible employees", value: "\(r.eligible)")
            StatTile(title: "Participating", value: r.participationRate.percent,
                     caption: "\(r.participants.count) opted in to wellness sharing")
            StatTile(title: "Annual physical rate", value: r.physicalRate.percent,
                     caption: delta(r.physicalRate, prior?.physicalRate))
            StatTile(title: "Rising-risk trends caught", value: "\(r.flaggedCount)",
                     caption: "Before crossing a clinical threshold", tint: .orange)
            StatTile(title: "Follow-up care booked", value: r.followUpRate.percent,
                     caption: delta(r.followUpRate, prior?.followUpRate), tint: .green)
            StatTile(title: "ER visits / 100 participants", value: String(format: "%.1f", r.erPer100),
                     caption: prior.map { String(format: "%.1f prior year", $0.erPer100) }, tint: .red)
        }
    }

    // MARK: Charts

    private func quarterlyChart(_ r: EmployerReport) -> some View {
        Card {
            SectionHeader(title: "Trend flags by quarter", subtitle: "Employees whose readings were trending toward a threshold, and how many booked care")
            Chart {
                ForEach(r.quarters) { q in
                    BarMark(x: .value("Quarter", "Q\(q.quarter)"), y: .value("Count", q.flagged))
                        .foregroundStyle(by: .value("Metric", "Flagged"))
                        .position(by: .value("Metric", "Flagged"))
                    BarMark(x: .value("Quarter", "Q\(q.quarter)"), y: .value("Count", q.followUps))
                        .foregroundStyle(by: .value("Metric", "Follow-up booked"))
                        .position(by: .value("Metric", "Follow-up booked"))
                }
            }
            .chartForegroundStyleScale(["Flagged": Color.orange, "Follow-up booked": Color.brand])
            .frame(height: 200)
            if r.isYearToDate {
                Text("Q4 not yet reported.").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func riskDistribution(_ r: EmployerReport) -> some View {
        let rows: [(String, RiskBand, Int)] =
            r.distribution(\.a1c).map { ("Blood sugar (A1C)", $0.0, $0.1) }
            + r.distribution(\.bloodPressure).map { ("Blood pressure", $0.0, $0.1) }
        let total = max(r.participants.count, 1)

        return Card {
            SectionHeader(title: "Population risk mix", subtitle: "Share of participants in each band")
            Chart {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    BarMark(x: .value("Share", Double(row.2) / Double(total)), y: .value("Metric", row.0))
                        .foregroundStyle(by: .value("Band", row.1.rawValue))
                }
            }
            .chartForegroundStyleScale(["Normal": Color.green, "Elevated": Color.orange, "High": Color.red])
            .chartXAxis {
                AxisMarks(format: FloatingPointFormatStyle<Double>.Percent())
            }
            .frame(height: 120)
        }
    }

    private var yearOverYear: some View {
        let points: [(Int, String, Double)] = years.flatMap { y in
            let r = store.employerReport(year: y)
            return [(y, "Annual physicals", r.physicalRate), (y, "Follow-up booked", r.followUpRate)]
        }
        return Card {
            SectionHeader(title: "Program impact since launch", subtitle: "Wellness program started Jan 2024")
            Chart {
                ForEach(Array(points.enumerated()), id: \.offset) { _, p in
                    LineMark(x: .value("Year", String(p.0)), y: .value("Rate", p.2))
                        .foregroundStyle(by: .value("Metric", p.1))
                        .symbol(by: .value("Metric", p.1))
                }
            }
            .chartForegroundStyleScale(["Annual physicals": Color.brand, "Follow-up booked": Color.green])
            .chartYScale(domain: 0...1)
            .chartYAxis { AxisMarks(format: FloatingPointFormatStyle<Double>.Percent()) }
            .frame(height: 180)
        }
    }

    // MARK: Departments

    private func departmentTable(_ r: EmployerReport) -> some View {
        Card {
            SectionHeader(title: "By department", subtitle: "Cells with fewer than \(EmployerReport.minimumCellSize) participants are suppressed to prevent re-identification")
            Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 10) {
                GridRow {
                    Text("Department")
                    Text("n").gridColumnAlignment(.trailing)
                    Text("Physicals").gridColumnAlignment(.trailing)
                    Text("Flagged").gridColumnAlignment(.trailing)
                }
                .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                Divider()
                ForEach(r.departments) { d in
                    GridRow {
                        Text(d.name).font(.subheadline)
                        if d.suppressed {
                            Text("<\(EmployerReport.minimumCellSize)").foregroundStyle(.secondary)
                            Label("Suppressed", systemImage: "eye.slash")
                                .font(.caption).foregroundStyle(.secondary)
                                .gridCellColumns(2)
                        } else {
                            Text("\(d.participants)").monospacedDigit()
                            Text(d.physicalRate?.percent ?? "—").monospacedDigit()
                            Text(d.flaggedRate?.percent ?? "—").monospacedDigit()
                        }
                    }
                    .font(.subheadline)
                }
            }
        }
    }

    // MARK: Narrative

    private func recommendations(_ r: EmployerReport, prior: EmployerReport?) -> some View {
        let visible = r.departments.filter { !$0.suppressed }
        let lowest = visible.min { ($0.physicalRate ?? 0) < ($1.physicalRate ?? 0) }
        let highestFlag = visible.max { ($0.flaggedRate ?? 0) < ($1.flaggedRate ?? 0) }
        var items: [String] = []
        if let lowest, let rate = lowest.physicalRate {
            items.append("\(lowest.name) has the lowest physical rate (\(rate.percent)). Consider on-site screening days or shift-friendly clinic hours.")
        }
        if let highestFlag, let rate = highestFlag.flaggedRate {
            items.append("\(highestFlag.name) shows the most rising-risk trends (\(rate.percent) of participants). A blood pressure and nutrition program would reach the most people there.")
        }
        let unbooked = r.flaggedCount - r.followUpCount
        items.append("\(unbooked) flagged employees have not booked follow-up care. ChartLine sends them reminders directly. You are never told who they are.")
        if let prior, r.followUpRate > prior.followUpRate {
            items.append("Follow-up booking rose from \(prior.followUpRate.percent) to \(r.followUpRate.percent) after in-app booking launched.")
        }

        return Card {
            SectionHeader(title: "Recommendations")
            ForEach(items, id: \.self) { item in
                Label(item, systemImage: "lightbulb.fill")
                    .font(.subheadline)
                    .labelStyle(AlignedLabelStyle(tint: .yellow))
            }
        }
    }

    private var neverShared: some View {
        Card {
            SectionHeader(title: "What this report never includes")
            ForEach([
                "Names, IDs, or any individual record",
                "Specific diagnoses, lab values or medications",
                "Behavioral health, reproductive or substance-use data",
                "Who booked, cancelled or skipped an appointment",
                "Anyone who has not opted in, or has since revoked consent",
            ], id: \.self) { item in
                Label(item, systemImage: "xmark.circle.fill")
                    .font(.subheadline)
                    .labelStyle(AlignedLabelStyle(tint: .red))
            }
            Text("Employee opt-in status: Jordan Reyes is currently \(store.inEmployerAggregate ? "counted" : "not counted") in these totals. Toggle wellness sharing on the Consent tab to see the numbers change.")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.top, 4)
        }
    }

    private func summary(_ r: EmployerReport, prior: EmployerReport?) -> String {
        """
        \(DemoData.employerName) — \(r.year) Health Insights (ChartLine Health, SYNTHETIC DEMO)
        Eligible employees: \(r.eligible)
        Participation: \(r.participationRate.percent) (\(r.participants.count))
        Annual physical rate: \(r.physicalRate.percent)
        Rising-risk trends caught early: \(r.flaggedCount)
        Follow-up care booked: \(r.followUpRate.percent)
        ER visits per 100 participants: \(String(format: "%.1f", r.erPer100))
        De-identified; groups under \(EmployerReport.minimumCellSize) suppressed.
        """
    }
}

struct AlignedLabelStyle: LabelStyle {
    let tint: Color

    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            configuration.icon.foregroundStyle(tint)
            configuration.title
        }
    }
}
