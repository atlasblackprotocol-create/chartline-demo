import SwiftUI

struct CareView: View {
    @Environment(AppStore.self) private var store
    @State private var bookingFlag: TrendFlag?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    DemoBanner()
                    SectionHeader(title: "Flagged trends", subtitle: "ChartLine watches every reading over time, not just the latest one.")
                    ForEach(store.flags) { flag in
                        FlagCard(flag: flag, series: store.series(flag.kind), appointment: store.appointment(for: flag.kind)) {
                            bookingFlag = flag
                        }
                    }

                    SectionHeader(title: "Appointments")
                    if store.appointments.isEmpty {
                        Card {
                            Text("No upcoming visits. Book a follow-up from a flagged trend above.")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    ForEach(store.appointments) { appt in
                        AppointmentCard(appointment: appt) { store.cancel(appt) }
                    }
                }
                .padding()
            }
            .navyScreen()
            .navigationTitle("Care")
            .sheet(item: $bookingFlag) { flag in
                BookingSheet(flag: flag)
            }
        }
    }
}

struct FlagCard: View {
    let flag: TrendFlag
    let series: LabSeries?
    let appointment: Appointment?
    let onBook: () -> Void

    var body: some View {
        Card {
            HStack {
                SeverityPill(severity: flag.severity)
                Spacer()
                Text(flag.kind.specialty).font(.caption).foregroundStyle(.secondary)
            }
            Text(flag.headline).font(.headline)
            if let series { LabTrendChart(series: series, flag: flag, height: 140) }
            Text(flag.detail).font(.caption).foregroundStyle(.secondary)

            if let appointment {
                Label {
                    VStack(alignment: .leading) {
                        Text("Booked with \(appointment.provider.name)").font(.subheadline.weight(.semibold))
                        Text(appointment.date.formatted(date: .complete, time: .shortened)).font(.caption)
                    }
                } icon: {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                }
            } else {
                Button(action: onBook) {
                    Label("Book \(flag.kind.specialty) follow-up", systemImage: "calendar.badge.plus")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(flag.severity == .watch ? .brand : flag.severity.color)
            }
        }
    }
}

struct AppointmentCard: View {
    let appointment: Appointment
    let onCancel: () -> Void

    var body: some View {
        Card {
            HStack(alignment: .top) {
                VStack(spacing: 0) {
                    Text(appointment.date.formatted(.dateTime.month(.abbreviated))).font(.caption.weight(.bold)).foregroundStyle(.red)
                    Text(appointment.date.formatted(.dateTime.day())).font(.title.bold())
                }
                .frame(width: 54)
                VStack(alignment: .leading, spacing: 4) {
                    Text(appointment.provider.name).font(.headline)
                    Text("\(appointment.provider.specialty) · \(appointment.date.formatted(date: .omitted, time: .shortened))")
                        .font(.subheadline)
                    Text(appointment.provider.location).font(.caption).foregroundStyle(.secondary)
                    Text(appointment.reason).font(.caption).padding(.top, 4)
                    if appointment.sharedTrend, let kind = appointment.linkedFlag {
                        Label("\(kind.shortName) trend shared with provider", systemImage: "paperplane.fill")
                            .font(.caption2).foregroundStyle(.brand)
                    }
                }
            }
            Button("Cancel appointment", role: .destructive, action: onCancel)
                .font(.caption)
        }
    }
}

struct BookingSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let flag: TrendFlag

    @State private var provider: Provider?
    @State private var day: Date?
    @State private var slot: Date?
    @State private var reason = ""
    @State private var shareTrend = true

    private var providers: [Provider] { DemoData.providers[flag.kind.specialty] ?? [] }

    private var days: [Date] {
        let cal = Calendar.current
        let start = cal.startOfDay(for: .now)
        return (1...21)
            .compactMap { cal.date(byAdding: .day, value: $0, to: start) }
            .filter { !cal.isDateInWeekend($0) }
            .prefix(10)
            .map { $0 }
    }

    private func slots(on day: Date, for provider: Provider) -> [Date] {
        let cal = Calendar.current
        let times = [(8, 30), (9, 15), (10, 45), (13, 0), (14, 30), (15, 45)]
        let dayIndex = cal.ordinality(of: .day, in: .year, for: day) ?? 0
        return times.enumerated().compactMap { i, t in
            // Deterministically mark some slots as already taken.
            guard (dayIndex + i + provider.name.count) % 3 != 0 else { return nil }
            return cal.date(bySettingHour: t.0, minute: t.1, second: 0, of: day)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Group {
                Section {
                    HStack {
                        SeverityPill(severity: flag.severity)
                        Spacer()
                    }
                    Text(flag.headline).font(.subheadline.weight(.semibold))
                } header: {
                    Text("Why ChartLine recommends this")
                }

                Section("Provider") {
                    ForEach(providers) { p in
                        Button { provider = p; slot = nil } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(p.name).foregroundStyle(.primary)
                                    Text(p.location).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Label(String(format: "%.1f", p.rating), systemImage: "star.fill").font(.caption).foregroundStyle(.orange)
                                Image(systemName: provider == p ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(provider == p ? Color.brand : Color.secondary)
                            }
                        }
                    }
                }

                if let provider {
                    Section("Date") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(days, id: \.self) { d in
                                    let selected = day.map { Calendar.current.isDate($0, inSameDayAs: d) } ?? false
                                    Button { day = d; slot = nil } label: {
                                        VStack(spacing: 2) {
                                            Text(d.formatted(.dateTime.weekday(.abbreviated))).font(.caption2)
                                            Text(d.formatted(.dateTime.day())).font(.headline)
                                            Text(d.formatted(.dateTime.month(.abbreviated))).font(.caption2)
                                        }
                                        .frame(width: 52, height: 64)
                                        .foregroundStyle(selected ? .white : .primary)
                                        .background(selected ? Color.brand : Color.appBackground, in: RoundedRectangle(cornerRadius: 10))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    if let day {
                        Section("Available times") {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 8) {
                                ForEach(slots(on: day, for: provider), id: \.self) { s in
                                    Button { slot = s } label: {
                                        Text(s.formatted(date: .omitted, time: .shortened))
                                            .font(.subheadline.weight(.medium))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 8)
                                            .foregroundStyle(slot == s ? .white : Color.brand)
                                            .background(slot == s ? Color.brand : Color.brand.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }

                Section("Reason for visit") {
                    TextField("Reason", text: $reason, axis: .vertical).lineLimit(2...4)
                }

                Section {
                    Toggle("Send \(flag.kind.shortName) trend packet to provider", isOn: $shareTrend)
                } footer: {
                    Text("Shares \(flag.readings) readings and the projection with this provider only. This grants “\(flag.kind.category.title)” to Referred Specialists and is logged in your access history.")
                }
                }
                .listRowBackground(Color.cardBackground)
            }
            .navyScreen()
            .navigationTitle("Book \(flag.kind.specialty)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Book") {
                        guard let provider, let slot else { return }
                        store.book(provider: provider, date: slot, reason: reason, flag: flag.kind, shareTrend: shareTrend)
                        dismiss()
                    }
                    .bold()
                    .disabled(provider == nil || slot == nil)
                }
            }
            .onAppear {
                provider = providers.first
                reason = "Follow-up on flagged \(flag.kind.shortName) trend: latest \(flag.kind.format(flag.latest)) \(flag.kind.unit), projected \(flag.kind.format(flag.projected)) \(flag.kind.unit) in 12 months."
            }
        }
    }
}
