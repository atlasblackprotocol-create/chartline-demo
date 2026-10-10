import Charts
import SwiftUI

/// A lab series with its reference band, concern threshold and (when flagged) a 12-month projection.
struct LabTrendChart: View {
    let series: LabSeries
    var flag: TrendFlag?
    var height: CGFloat = 180

    private var sorted: [LabPoint] { series.points.sorted { $0.date < $1.date } }

    private var projection: [(Date, Double)] {
        guard let flag, let last = sorted.last,
              let future = Calendar.current.date(byAdding: .year, value: 1, to: last.date) else { return [] }
        return [(last.date, last.value), (future, flag.projected)]
    }

    private var yDomain: ClosedRange<Double> {
        let kind = series.kind
        let values = sorted.map(\.value) + [kind.concernThreshold] + projection.map(\.1)
        let lo = values.min() ?? 0, hi = values.max() ?? 1
        let pad = (hi - lo) * 0.15
        return (lo - pad)...(hi + pad)
    }

    var body: some View {
        let kind = series.kind
        Chart {
            RuleMark(y: .value("Normal", kind.normalUpper))
                .foregroundStyle(.green.opacity(0.6))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                .annotation(position: .top, alignment: .leading) {
                    Text("Normal ≤ \(kind.format(kind.normalUpper))").font(.caption2).foregroundStyle(.green)
                }
            RuleMark(y: .value("Concern", kind.concernThreshold))
                .foregroundStyle(.red.opacity(0.6))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                .annotation(position: .top, alignment: .leading) {
                    Text("\(kind.concernLabel.capitalized) ≥ \(kind.format(kind.concernThreshold))").font(.caption2).foregroundStyle(.red)
                }

            ForEach(sorted) { point in
                LineMark(x: .value("Date", point.date), y: .value(kind.shortName, point.value), series: .value("Series", "Measured"))
                    .foregroundStyle(Color.brand)
                    .interpolationMethod(.monotone)
                PointMark(x: .value("Date", point.date), y: .value(kind.shortName, point.value))
                    .foregroundStyle(Color.brand)
                    .symbolSize(30)
            }

            ForEach(projection, id: \.0) { date, value in
                LineMark(x: .value("Date", date), y: .value(kind.shortName, value), series: .value("Series", "Projected"))
                    .foregroundStyle(flag?.severity.color ?? .orange)
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [6, 4]))
            }
        }
        .chartYScale(domain: yDomain)
        .chartXAxis {
            AxisMarks(values: .stride(by: .year)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.year())
            }
        }
        .frame(height: height)
    }
}
