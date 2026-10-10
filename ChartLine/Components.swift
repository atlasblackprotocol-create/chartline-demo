import SwiftUI

// Palette sampled from the ChartLine logo.
extension ShapeStyle where Self == Color {
    static var brand: Color { Color(red: 0.26, green: 0.57, blue: 0.96) }
    static var brandCyan: Color { Color(red: 0.36, green: 0.75, blue: 0.91) }
    static var brandMint: Color { Color(red: 0.52, green: 0.98, blue: 0.68) }
    static var brandDeep: Color { Color(red: 0.12, green: 0.11, blue: 0.16) }
    /// Navy from the logo background, used behind every screen.
    static var appBackground: Color { Color(red: 0.10, green: 0.10, blue: 0.15) }
    /// Slightly lifted navy for cards and list rows.
    static var cardBackground: Color { Color(red: 0.16, green: 0.16, blue: 0.23) }
    static var cardBorder: Color { Color(red: 0.26, green: 0.27, blue: 0.38).opacity(0.6) }
}

extension View {
    /// Navy background for scrolling screens, lists and forms.
    func navyScreen() -> some View {
        scrollContentBackground(.hidden)
            .background(Color.appBackground.ignoresSafeArea())
    }
}

extension LinearGradient {
    static let brand = LinearGradient(colors: [.brand, .brandCyan, .brandMint], startPoint: .leading, endPoint: .trailing)
}

/// The ChartLine logo with the "HEALTH" line set under it, on a transparent background.
struct BrandHeader: View {
    var body: some View {
        VStack(spacing: 4) {
            Image("ChartLineLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 150)
            Text("HEALTH")
                .font(.system(size: 10, weight: .semibold))
                .tracking(6)
                .foregroundStyle(LinearGradient.brand)
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("ChartLine Health")
    }
}

extension Severity {
    var color: Color {
        switch self {
        case .watch: .yellow
        case .elevated: .orange
        case .high: .red
        }
    }

    var icon: String {
        switch self {
        case .watch: "eye.circle.fill"
        case .elevated: "arrow.up.right.circle.fill"
        case .high: "exclamationmark.triangle.fill"
        }
    }
}

extension RiskBand {
    var color: Color {
        switch self {
        case .normal: .green
        case .elevated: .orange
        case .high: .red
        }
    }
}

struct DemoBanner: View {
    var body: some View {
        Label("Synthetic demo data. Not real patient information", systemImage: "testtube.2")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(.yellow.opacity(0.18), in: RoundedRectangle(cornerRadius: 8))
    }
}

struct Card<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.cardBackground, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.cardBorder, lineWidth: 1))
    }
}

struct SectionHeader: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.title3.bold())
            if let subtitle {
                Text(subtitle).font(.footnote).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SeverityPill: View {
    let severity: Severity

    var body: some View {
        Label(severity.label, systemImage: severity.icon)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(severity.color)
            .background(severity.color.opacity(0.15), in: Capsule())
    }
}

struct StatTile: View {
    let title: String
    let value: String
    var caption: String?
    var tint: Color = .brand

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.title2.bold()).foregroundStyle(tint).monospacedDigit()
            if let caption {
                Text(caption).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
        .background(Color.cardBackground, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color.cardBorder, lineWidth: 1))
    }
}

struct RestrictedRow: View {
    let category: DataCategory
    let reason: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lock.fill").foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(category.title) hidden").font(.subheadline.weight(.semibold))
                Text(reason).font(.caption).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [5]))
                .foregroundStyle(.secondary.opacity(0.5))
        )
    }
}

extension Double {
    var percent: String { formatted(.percent.precision(.fractionLength(0))) }
}
