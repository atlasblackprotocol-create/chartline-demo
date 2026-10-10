import PDFKit
import SwiftUI

/// Lets the employee build a copy of their record for any doctor, inside or outside
/// ChartLine. Step one picks what goes in, step two previews the exact PDF before it
/// leaves the phone.
struct ShareReportSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var options = HealthReportOptions.standard
    @State private var pendingSensitive: DataCategory?
    @State private var preview: URL?
    @State private var failed = false

    /// Only offer categories that actually have something in them.
    private var availableCategories: [DataCategory] {
        let present = Set(store.labs.map(\.kind.category))
            .union(store.encounters.map(\.category))
            .union(store.medications.isEmpty ? [] : [DataCategory.medications])
        return DataCategory.allCases.filter { present.contains($0) }
    }

    private var nothingSelected: Bool {
        options.categories.intersection(availableCategories).isEmpty && !options.includeFlags && !options.includeCarePlan
    }

    var body: some View {
        NavigationStack {
            Form {
                Group {
                Section {
                    Label {
                        Text("Bring your whole history to any appointment, even with a doctor who has never heard of ChartLine. You pick what goes in and see the report before it is sent.")
                            .font(.subheadline)
                    } icon: {
                        Image(systemName: "doc.text.magnifyingglass").foregroundStyle(.brand)
                    }
                }

                Section {
                    TextField("Dr. Lee, Bayou City Clinic", text: $options.preparedFor)
                        .textInputAutocapitalization(.words)
                } header: {
                    Text("Who is this for?")
                } footer: {
                    Text("Optional. Printed on the report and noted in your access log.")
                }

                Section {
                    ForEach(availableCategories) { category in
                        Toggle(isOn: binding(category)) {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 4) {
                                        Text(category.title)
                                        if category.isSensitive {
                                            Image(systemName: "lock.shield.fill").font(.caption).foregroundStyle(.purple)
                                        }
                                    }
                                    Text(summary(category)).font(.caption2).foregroundStyle(.secondary)
                                }
                            } icon: {
                                Image(systemName: category.icon)
                            }
                        }
                    }
                } header: {
                    Text("Your record")
                } footer: {
                    Text("Protected categories stay out unless you add them. Your consent settings for other recipients do not change.")
                }

                Section("ChartLine insights") {
                    Toggle(isOn: $options.includeFlags) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Flagged trends")
                                Text("\(store.flags.count) trends with 12-month projections").font(.caption2).foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "chart.line.uptrend.xyaxis")
                        }
                    }
                    Toggle(isOn: $options.includeCarePlan) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Care plan")
                                Text(store.appointments.isEmpty ? "Open follow-ups" : "\(store.appointments.count) booked visits and open follow-ups")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "calendar.badge.clock")
                        }
                    }
                }
                }
                .listRowBackground(Color.cardBackground)
            }
            .navyScreen()
            .navigationTitle("Share with a Doctor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Preview") { buildReport() }
                        .bold()
                        .disabled(nothingSelected)
                }
            }
            .navigationDestination(item: $preview) { url in
                ReportPreviewView(url: url, options: options) { dismiss() }
            }
            .confirmationDialog(
                "Include sensitive information?",
                isPresented: Binding(get: { pendingSensitive != nil }, set: { if !$0 { pendingSensitive = nil } }),
                titleVisibility: .visible,
                presenting: pendingSensitive
            ) { category in
                Button("Include \(category.title)") { options.categories.insert(category) }
                Button("Cancel", role: .cancel) {}
            } message: { category in
                Text("\(category.title) has extra legal protection. \(category.protectionNote ?? "") Once this report is sent, the recipient keeps their copy.")
            }
            .alert("Couldn't create the report", isPresented: $failed) {
                Button("OK", role: .cancel) {}
            }
        }
    }

    private func summary(_ category: DataCategory) -> String {
        switch category {
        case .labs, .vitals:
            let series = store.labs.filter { $0.kind.category == category }
            let readings = series.map(\.points.count).reduce(0, +)
            return "\(series.map(\.kind.shortName).joined(separator: ", ")) · \(readings) readings"
        case .medications:
            return "\(store.medications.count) active prescriptions"
        default:
            let visits = store.encounters.filter { $0.category == category }.count
            return "\(visits) visit\(visits == 1 ? "" : "s")"
        }
    }

    private func binding(_ category: DataCategory) -> Binding<Bool> {
        Binding(
            get: { options.categories.contains(category) },
            set: { included in
                if included && category.isSensitive {
                    pendingSensitive = category
                } else if included {
                    options.categories.insert(category)
                } else {
                    options.categories.remove(category)
                }
            }
        )
    }

    private func buildReport() {
        do {
            preview = try HealthReportPDF.write(HealthReport(store: store, options: options))
        } catch {
            failed = true
        }
    }
}

/// The exact PDF the doctor will receive, with the final confirmation to send it.
struct ReportPreviewView: View {
    @Environment(AppStore.self) private var store
    let url: URL
    let options: HealthReportOptions
    let onFinished: () -> Void

    @State private var sharing = false
    @State private var shared = false

    var body: some View {
        PDFPreview(url: url)
            .ignoresSafeArea(edges: .bottom)
            .safeAreaInset(edge: .bottom) {
                VStack(alignment: .leading, spacing: 10) {
                    Label("Check it over before you send", systemImage: "checkmark.shield")
                        .font(.subheadline.weight(.semibold))
                    Text("Once shared, this copy leaves ChartLine and belongs to whoever receives it. You can't revoke it later, but the share is logged in your access history.")
                        .font(.caption).foregroundStyle(.secondary)
                    Button {
                        sharing = true
                    } label: {
                        Label("Share Report", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
                .padding()
                .background(Color.cardBackground)
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Preview")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $sharing, onDismiss: { if shared { onFinished() } }) {
                ActivityView(items: [url]) { activity in
                    if let activity {
                        store.logReportShared(options, via: activity.displayName)
                        shared = true
                    }
                    sharing = false
                }
                .presentationDetents([.medium, .large])
                .ignoresSafeArea()
            }
    }
}

private struct PDFPreview: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.backgroundColor = UIColor(Color.appBackground)
        view.document = PDFDocument(url: url)
        return view
    }

    func updateUIView(_ view: PDFView, context: Context) {
        if view.document?.documentURL != url {
            view.document = PDFDocument(url: url)
        }
    }
}

/// The system share sheet: AirDrop, Mail, Messages, Print, Save to Files.
/// Calls back with the destination only when the share actually went through.
private struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    let onComplete: (UIActivity.ActivityType?) -> Void

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        controller.completionWithItemsHandler = { activity, completed, _, _ in
            onComplete(completed ? (activity ?? UIActivity.ActivityType("share")) : nil)
        }
        return controller
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

private extension UIActivity.ActivityType {
    var displayName: String {
        switch self {
        case .airDrop: "AirDrop"
        case .mail: "Mail"
        case .message: "Messages"
        case .print: "Print"
        case .copyToPasteboard: "Copy"
        default:
            rawValue.localizedCaseInsensitiveContains("files") || rawValue.contains("DocumentManager")
                ? "Files" : "the share sheet"
        }
    }
}

/// Entry point used on the Overview and Records screens.
struct ShareReportButton: View {
    @State private var showing = false

    var body: some View {
        Button {
            showing = true
        } label: {
            Label("Share with a doctor", systemImage: "square.and.arrow.up")
        }
        .sheet(isPresented: $showing) { ShareReportSheet() }
    }
}
