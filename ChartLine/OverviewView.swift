import SwiftUI

struct OverviewView: View {
    @Environment(AppStore.self) private var store
    @Binding var tab: RootView.Tab

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    BrandHeader()
                    DemoBanner()
                    patientCard
                    flagsCard
                    nextVisitCard
                    privacyCard
                }
                .padding()
            }
            .navyScreen()
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var patientCard: some View {
        let p = store.patient
        let age = Calendar.current.dateComponents([.year], from: p.dateOfBirth, to: .now).year ?? 0
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                Text("JR")
                    .font(.title2.bold())
                    .frame(width: 56, height: 56)
                    .foregroundStyle(Color.brandDeep)
                    .background(LinearGradient.brand, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(p.name).font(.title2.bold())
                    Text("\(age) · \(p.sex) · MRN \(p.mrn)").font(.subheadline).opacity(0.85)
                }
            }
            Divider().overlay(.white.opacity(0.3))
            HStack {
                infoColumn("Primary care", p.primaryCare)
                Spacer()
                infoColumn("Coverage", p.plan)
            }
        }
        .foregroundStyle(.white)
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [Color(red: 0.13, green: 0.23, blue: 0.45), .cardBackground], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 20)
        )
        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(LinearGradient.brand.opacity(0.6), lineWidth: 1))
    }

    private func infoColumn(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased()).font(.caption2.weight(.semibold)).opacity(0.7)
            Text(value).font(.subheadline.weight(.medium))
        }
    }

    private var flagsCard: some View {
        Card {
            HStack {
                Label("Trends flagged by ChartLine", systemImage: "chart.line.uptrend.xyaxis")
                    .font(.headline)
                Spacer()
                Text("\(store.flags.count)").font(.headline).foregroundStyle(.secondary)
            }
            ForEach(store.flags) { flag in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: flag.severity.icon).foregroundStyle(flag.severity.color)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(flag.headline).font(.subheadline.weight(.medium))
                        if let appt = store.appointment(for: flag.kind) {
                            Label("Follow-up booked \(appt.date.formatted(date: .abbreviated, time: .omitted))", systemImage: "checkmark.circle.fill")
                                .font(.caption).foregroundStyle(.green)
                        } else {
                            Text("No follow-up scheduled").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            Button {
                tab = .care
            } label: {
                Text("Review & book follow-up care").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var nextVisitCard: some View {
        Card {
            Label("Upcoming", systemImage: "calendar").font(.headline)
            if let next = store.appointments.first {
                Text(next.provider.name).font(.subheadline.weight(.semibold))
                Text("\(next.provider.specialty) · \(next.date.formatted(date: .complete, time: .shortened))")
                    .font(.caption).foregroundStyle(.secondary)
            } else {
                Text("Nothing booked yet.").font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }

    private var privacyCard: some View {
        Card {
            Label("Who can see your data", systemImage: "lock.shield").font(.headline)
            ForEach(Recipient.allCases) { recipient in
                let count = store.grants[recipient, default: []].count
                HStack {
                    Image(systemName: recipient.icon).frame(width: 24).foregroundStyle(.brand)
                    Text(recipient.title).font(.subheadline)
                    Spacer()
                    Text(count == 0 ? "Off" : recipient.isAggregateOnly ? "Aggregate" : "\(count) categories")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(count == 0 ? Color.secondary : Color.brand)
                }
            }
            Button("Manage consent") { tab = .consent }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
        }
    }
}
