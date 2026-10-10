import Foundation

/// Fits a least-squares line through a patient's readings and flags series that are
/// drifting toward (or already past) a clinical threshold.
enum TrendEngine {
    static func analyze(_ series: LabSeries) -> TrendFlag? {
        let points = series.points.sorted { $0.date < $1.date }
        guard points.count >= 3, let first = points.first, let last = points.last else { return nil }

        let year = 365.25 * 86_400
        let xs = points.map { $0.date.timeIntervalSince(first.date) / year }
        let ys = points.map(\.value)
        let n = Double(points.count)
        let meanX = xs.reduce(0, +) / n
        let meanY = ys.reduce(0, +) / n
        let numerator = zip(xs, ys).map { ($0 - meanX) * ($1 - meanY) }.reduce(0, +)
        let denominator = xs.map { ($0 - meanX) * ($0 - meanX) }.reduce(0, +)
        guard denominator > 0 else { return nil }

        let kind = series.kind
        let slope = numerator / denominator
        let latest = last.value
        let projected = latest + slope

        // Ignore noise: the slope must be at least 1% of the reference ceiling per year.
        guard slope > kind.normalUpper * 0.01 else { return nil }

        let recent = points.suffix(3).map(\.value)
        let recentlyRising = zip(recent, recent.dropFirst()).allSatisfy { $0 < $1 }

        let severity: Severity
        if latest >= kind.concernThreshold {
            severity = .high
        } else if projected >= kind.concernThreshold {
            severity = .elevated
        } else if latest > kind.normalUpper && recentlyRising {
            severity = .watch
        } else {
            return nil
        }

        let rate = "\(slope >= 0 ? "+" : "")\(kind.format(slope)) \(kind.unit)/yr"
        let headline: String
        switch severity {
        case .high:
            headline = "\(kind.shortName) is in the \(kind.concernLabel) and still climbing"
        case .elevated:
            headline = "\(kind.shortName) projected to reach the \(kind.concernLabel) within 12 months"
        case .watch:
            headline = "\(kind.shortName) above normal and trending up"
        }
        let detail = "\(points.count) readings since \(first.date.formatted(.dateTime.month(.abbreviated).year())). "
            + "Rate \(rate). Latest \(kind.format(latest)) \(kind.unit); "
            + "12-month projection \(kind.format(projected)) \(kind.unit)."

        return TrendFlag(
            kind: kind,
            severity: severity,
            slopePerYear: slope,
            latest: latest,
            projected: projected,
            readings: points.count,
            headline: headline,
            detail: detail
        )
    }
}
