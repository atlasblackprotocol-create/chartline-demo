import SwiftUI

struct ConsentView: View {
    @Environment(AppStore.self) private var store
    @State private var pending: (Recipient, DataCategory)?
    @State private var confirmingSensitive = false

    var body: some View {
        NavigationStack {
            List {
                Group {
                Section {
                    DemoBanner().listRowInsets(EdgeInsets()).listRowBackground(Color.clear).listRowSeparator(.hidden)
                    Text("You decide who sees each part of your record. Every change is logged, and you can revoke access at any time.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }

                ForEach(Recipient.allCases) { recipient in
                    recipientSection(recipient)
                }

                Section("Access log") {
                    ForEach(store.audit.prefix(6)) { AuditRow(event: $0) }
                    NavigationLink("Full access history (\(store.audit.count))") {
                        List(store.audit) { AuditRow(event: $0).listRowBackground(Color.cardBackground) }
                            .navyScreen()
                            .navigationTitle("Access History")
                    }
                }
                }
                .listRowBackground(Color.cardBackground)
            }
            .navyScreen()
            .navigationTitle("Consent")
            .confirmationDialog(
                "Share sensitive information?",
                isPresented: $confirmingSensitive,
                titleVisibility: .visible,
                presenting: pending
            ) { recipient, category in
                Button("Share \(category.title) with \(recipient.title)") {
                    store.setConsent(recipient, category, true)
                }
                Button("Cancel", role: .cancel) {}
            } message: { _, category in
                Text("\(category.title) has extra legal protection. \(category.protectionNote ?? "") You can revoke this at any time.")
            }
        }
    }

    private func recipientSection(_ recipient: Recipient) -> some View {
        Section {
            ForEach(recipient.allowedCategories) { category in
                Toggle(isOn: binding(recipient, category)) {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text(category.title)
                                if category.isSensitive {
                                    Image(systemName: "lock.shield.fill").font(.caption).foregroundStyle(.purple)
                                }
                            }
                            if let note = category.protectionNote {
                                Text(note).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    } icon: {
                        Image(systemName: category.icon)
                    }
                }
            }
            if !store.grants[recipient, default: []].isEmpty {
                Button("Revoke all", role: .destructive) { store.revokeAll(recipient) }
            }
        } header: {
            HStack(spacing: 8) {
                Image(systemName: recipient.icon)
                VStack(alignment: .leading) {
                    Text(recipient.title)
                    Text(recipient.subtitle).textCase(nil).font(.caption2)
                }
            }
        } footer: {
            if recipient == .employerWellness {
                Text("Your employer never sees your name, diagnoses or results. Only counts across consenting employees, and only when a group has \(EmployerReport.minimumCellSize)+ people. Behavioral, reproductive and substance-use data can never be shared here.")
            }
        }
    }

    private func binding(_ recipient: Recipient, _ category: DataCategory) -> Binding<Bool> {
        Binding(
            get: { store.hasConsent(recipient, category) },
            set: { granted in
                if granted && category.isSensitive {
                    pending = (recipient, category)
                    confirmingSensitive = true
                } else {
                    store.setConsent(recipient, category, granted)
                }
            }
        )
    }
}

struct AuditRow: View {
    let event: AuditEvent

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: event.icon).foregroundStyle(.brand).frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(event.action).font(.subheadline)
                Text("\(event.actor) · \(event.date.formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
