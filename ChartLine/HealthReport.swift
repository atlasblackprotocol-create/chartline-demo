import UIKit

/// What the employee chose to put in a report before sharing it.
struct HealthReportOptions {
    var categories: Set<DataCategory>
    var includeFlags = true
    var includeCarePlan = true
    var preparedFor = ""

    /// Sensitive categories start off. The employee has to opt in to each one.
    static var standard: HealthReportOptions {
        HealthReportOptions(categories: Set(DataCategory.allCases.filter { !$0.isSensitive }))
    }

    var sectionTitles: [String] {
        var titles = DataCategory.allCases.filter { categories.contains($0) }.map(\.title)
        if includeFlags { titles.append("Flagged Trends") }
        if includeCarePlan { titles.append("Care Plan") }
        return titles
    }
}

/// Everything that goes into one report, resolved from the store so the PDF is a
/// snapshot of the record at the moment the employee shared it.
struct HealthReport {
    let patient: Patient
    let options: HealthReportOptions
    let generated: Date
    let labs: [LabSeries]
    let medications: [Medication]
    let encounters: [Encounter]
    let flags: [TrendFlag]
    let appointments: [Appointment]

    init(store: AppStore, options: HealthReportOptions, generated: Date = .now) {
        self.patient = store.patient
        self.options = options
        self.generated = generated
        let included = options.categories
        labs = store.labs.filter { included.contains($0.kind.category) }
        medications = included.contains(.medications) ? store.medications : []
        encounters = store.encounters
            .filter { included.contains($0.category) }
            .sorted { $0.date > $1.date }
        // A flag is only meaningful if its readings are in the report too.
        flags = options.includeFlags ? store.flags.filter { included.contains($0.kind.category) } : []
        appointments = options.includeCarePlan ? store.appointments : []
    }

    var fileName: String {
        let name = patient.name.replacingOccurrences(of: " ", with: "-")
        return "ChartLine-Health-Report-\(name)-\(generated.formatted(.iso8601.year().month().day())).pdf"
    }
}

// MARK: - PDF rendering

/// Lays the report out on US Letter pages. Drawn with UIKit rather than rendered from
/// SwiftUI so the PDF keeps real, selectable text that a clinic's EHR can index.
enum HealthReportPDF {
    static func write(_ report: HealthReport) throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(report.fileName)
        try data(for: report).write(to: url, options: .atomic)
        return url
    }

    static func data(for report: HealthReport) -> Data {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextTitle as String: "Personal Health Report: \(report.patient.name)",
            kCGPDFContextAuthor as String: report.patient.name,
            kCGPDFContextCreator as String: "ChartLine Health",
        ]
        let renderer = UIGraphicsPDFRenderer(bounds: Layout.page, format: format)
        return renderer.pdfData { context in
            var page = PageWriter(context: context, report: report)
            page.drawReport()
        }
    }
}

private enum Layout {
    static let page = CGRect(x: 0, y: 0, width: 612, height: 792)
    static let margin: CGFloat = 48
    static let contentWidth = page.width - margin * 2
    static let footerTop = page.height - 40
}

private enum Ink {
    static let navy = UIColor(red: 0.10, green: 0.10, blue: 0.15, alpha: 1)
    static let navySoft = UIColor(red: 0.16, green: 0.16, blue: 0.23, alpha: 1)
    static let teal = UIColor(red: 0.13, green: 0.60, blue: 0.66, alpha: 1)
    static let tealWash = UIColor(red: 0.13, green: 0.60, blue: 0.66, alpha: 0.10)
    static let text = UIColor(red: 0.12, green: 0.13, blue: 0.18, alpha: 1)
    static let muted = UIColor(red: 0.42, green: 0.44, blue: 0.50, alpha: 1)
    static let rule = UIColor(red: 0.86, green: 0.87, blue: 0.90, alpha: 1)
    static let normal = UIColor(red: 0.20, green: 0.62, blue: 0.36, alpha: 1)
    static let concern = UIColor(red: 0.80, green: 0.22, blue: 0.20, alpha: 1)
    static let sensitive = UIColor(red: 0.47, green: 0.32, blue: 0.74, alpha: 1)

    static func severity(_ s: Severity) -> UIColor {
        switch s {
        case .watch: UIColor(red: 0.78, green: 0.60, blue: 0.05, alpha: 1)
        case .elevated: UIColor(red: 0.88, green: 0.46, blue: 0.10, alpha: 1)
        case .high: concern
        }
    }
}

private struct PageWriter {
    let context: UIGraphicsPDFRendererContext
    let report: HealthReport
    private var y: CGFloat = 0
    private var pageNumber = 0

    init(context: UIGraphicsPDFRendererContext, report: HealthReport) {
        self.context = context
        self.report = report
    }

    // MARK: Report structure

    mutating func drawReport() {
        newPage(withHeader: true)
        patientBlock()
        contentsLine()
        if !report.flags.isEmpty { flagsSection() }
        if !report.labs.isEmpty { labsSection() }
        if !report.medications.isEmpty { medicationsSection() }
        if !report.encounters.isEmpty { encountersSection() }
        if report.options.includeCarePlan { carePlanSection() }
        closingNote()
    }

    private mutating func patientBlock() {
        let p = report.patient
        let dob = p.dateOfBirth.formatted(date: .long, time: .omitted)
        let age = Calendar.current.dateComponents([.year], from: p.dateOfBirth, to: report.generated).year ?? 0
        let rows: [(String, String)] = [
            ("Patient", p.name),
            ("Date of birth", "\(dob) (age \(age))"),
            ("Sex", p.sex),
            ("ChartLine ID", p.mrn),
            ("Primary care", p.primaryCare),
            ("Coverage", p.plan),
        ]
        let boxTop = y
        let columnWidth = (Layout.contentWidth - 32) / 2
        let rowHeight: CGFloat = 30
        let boxHeight = CGFloat((rows.count + 1) / 2) * rowHeight + 20
        let box = CGRect(x: Layout.margin, y: boxTop, width: Layout.contentWidth, height: boxHeight)
        Ink.tealWash.setFill()
        UIBezierPath(roundedRect: box, cornerRadius: 8).fill()

        for (i, row) in rows.enumerated() {
            let x = Layout.margin + 16 + CGFloat(i % 2) * (columnWidth + 16)
            let rowY = boxTop + 12 + CGFloat(i / 2) * rowHeight
            draw(row.0.uppercased(), at: CGPoint(x: x, y: rowY), font: .systemFont(ofSize: 7, weight: .semibold), color: Ink.muted, kern: 0.8)
            draw(row.1, at: CGPoint(x: x, y: rowY + 10), font: .systemFont(ofSize: 10.5, weight: .medium), color: Ink.text)
        }
        y = box.maxY + 14

        var meta = "Generated \(report.generated.formatted(date: .long, time: .shortened)) by \(p.name) from their ChartLine record."
        let recipient = report.options.preparedFor.trimmingCharacters(in: .whitespacesAndNewlines)
        if !recipient.isEmpty { meta = "Prepared for \(recipient). " + meta }
        paragraph(meta, font: .systemFont(ofSize: 9), color: Ink.muted)
        y += 4
    }

    private mutating func contentsLine() {
        paragraph("Includes: " + report.options.sectionTitles.joined(separator: ", "), font: .systemFont(ofSize: 9, weight: .medium), color: Ink.text)
        // Deliberately silent about what was left out: naming a withheld category
        // would tell the reader that such records exist.
        y += 6
    }

    private mutating func flagsSection() {
        sectionHeader("Flagged Trends", subtitle: "ChartLine fits a trend line through every reading, not just the latest one.")
        for flag in report.flags {
            let detailHeight = height(of: flag.detail, font: .systemFont(ofSize: 9), width: Layout.contentWidth - 100)
            ensureSpace(detailHeight + 34)
            let color = Ink.severity(flag.severity)
            pill(flag.severity.label, color: color, at: CGPoint(x: Layout.margin, y: y))
            let textX = Layout.margin + 100
            draw(flag.headline, in: CGRect(x: textX, y: y, width: Layout.contentWidth - 100, height: 30),
                 font: .systemFont(ofSize: 10.5, weight: .semibold), color: Ink.text)
            y += 15
            draw(flag.detail, in: CGRect(x: textX, y: y, width: Layout.contentWidth - 100, height: detailHeight + 2),
                 font: .systemFont(ofSize: 9), color: Ink.muted)
            y += detailHeight + 12
        }
        y += 4
    }

    private mutating func labsSection() {
        sectionHeader("Labs & Vitals", subtitle: "Every reading on file, with the healthy range and clinical threshold.")
        for series in report.labs {
            let points = series.points.sorted { $0.date < $1.date }
            let flag = report.flags.first { $0.kind == series.kind }
            let chartHeight: CGFloat = 110
            let tableRowHeight: CGFloat = 13
            let blockHeight = max(chartHeight, CGFloat(points.count + 1) * tableRowHeight) + 34
            ensureSpace(blockHeight)

            let kind = series.kind
            draw(kind.name, at: CGPoint(x: Layout.margin, y: y), font: .systemFont(ofSize: 11, weight: .semibold), color: Ink.text)
            let range = "Normal ≤ \(kind.format(kind.normalUpper)) \(kind.unit) · \(kind.concernLabel.capitalized) ≥ \(kind.format(kind.concernThreshold)) \(kind.unit)"
            draw(range, at: CGPoint(x: Layout.margin + 190, y: y + 1.5), font: .systemFont(ofSize: 8), color: Ink.muted)
            if let flag {
                let label = flag.severity.label
                let w = (label as NSString).size(withAttributes: [.font: UIFont.systemFont(ofSize: 7.5, weight: .bold)]).width + 14
                pill(label, color: Ink.severity(flag.severity), at: CGPoint(x: Layout.margin + Layout.contentWidth - w, y: y - 1))
            }
            y += 20

            // Readings table on the left, chart on the right.
            let tableWidth: CGFloat = 150
            var rowY = y
            draw("DATE", at: CGPoint(x: Layout.margin, y: rowY), font: .systemFont(ofSize: 7, weight: .semibold), color: Ink.muted, kern: 0.6)
            draw("RESULT", at: CGPoint(x: Layout.margin + 80, y: rowY), font: .systemFont(ofSize: 7, weight: .semibold), color: Ink.muted, kern: 0.6)
            rowY += tableRowHeight
            for point in points.reversed() {
                let flagged = point.value >= kind.concernThreshold
                let elevated = point.value > kind.normalUpper
                let color = flagged ? Ink.concern : Ink.text
                draw(point.date.formatted(.dateTime.month(.abbreviated).day().year()), at: CGPoint(x: Layout.margin, y: rowY),
                     font: .monospacedDigitSystemFont(ofSize: 8.5, weight: .regular), color: Ink.text)
                let marker = flagged ? "  H" : (elevated ? "  ↑" : "")
                draw("\(kind.format(point.value)) \(kind.unit)\(marker)", at: CGPoint(x: Layout.margin + 80, y: rowY),
                     font: .monospacedDigitSystemFont(ofSize: 8.5, weight: flagged ? .semibold : .regular), color: color)
                rowY += tableRowHeight
            }

            let chartRect = CGRect(x: Layout.margin + tableWidth + 16, y: y,
                                   width: Layout.contentWidth - tableWidth - 16, height: chartHeight)
            trendChart(series: series, flag: flag, in: chartRect)
            y += blockHeight - 20
            rule()
        }
        paragraph("H = at or above the clinical threshold. ↑ = above the healthy range. Dashed line = ChartLine's 12-month projection.",
                  font: .systemFont(ofSize: 7.5), color: Ink.muted)
        y += 8
    }

    private mutating func medicationsSection() {
        sectionHeader("Medications", subtitle: "Active prescriptions on file.")
        tableHeader(["MEDICATION", "DOSE", "STARTED", "PRESCRIBER"], columns: columns4)
        for med in report.medications {
            tableRow([med.name, med.dose, med.started.formatted(.dateTime.month(.abbreviated).year()), med.prescriber], columns: columns4, boldFirst: true)
        }
        y += 10
    }

    private mutating func encountersSection() {
        sectionHeader("Visit History", subtitle: "Most recent first.")
        for encounter in report.encounters {
            let summaryWidth = Layout.contentWidth - 110
            let summaryHeight = height(of: encounter.summary, font: .systemFont(ofSize: 9), width: summaryWidth)
            ensureSpace(summaryHeight + 34)
            draw(encounter.date.formatted(.dateTime.month(.abbreviated).day().year()), at: CGPoint(x: Layout.margin, y: y),
                 font: .monospacedDigitSystemFont(ofSize: 9, weight: .medium), color: Ink.text)
            let x = Layout.margin + 110
            var title = "\(encounter.type) · \(encounter.provider)"
            if encounter.category.isSensitive { title += "  (\(encounter.category.title))" }
            draw(title, at: CGPoint(x: x, y: y), font: .systemFont(ofSize: 10, weight: .semibold),
                 color: encounter.category.isSensitive ? Ink.sensitive : Ink.text)
            y += 14
            draw(encounter.summary, in: CGRect(x: x, y: y, width: summaryWidth, height: summaryHeight + 2),
                 font: .systemFont(ofSize: 9), color: Ink.text)
            y += summaryHeight + 4
            if let note = encounter.category.protectionNote {
                draw(note + ". Shared by the patient with explicit consent.", at: CGPoint(x: x, y: y),
                     font: .italicSystemFont(ofSize: 7.5), color: Ink.sensitive)
                y += 11
            }
            y += 8
        }
        y += 4
    }

    private mutating func carePlanSection() {
        sectionHeader("Care Plan", subtitle: "Follow-up ChartLine has booked or is still waiting on.")
        if report.appointments.isEmpty {
            paragraph("No upcoming appointments booked through ChartLine.", font: .systemFont(ofSize: 9.5), color: Ink.muted)
        } else {
            tableHeader(["DATE", "PROVIDER", "SPECIALTY", "REASON"], columns: columns4)
            for appt in report.appointments {
                tableRow([appt.date.formatted(date: .abbreviated, time: .shortened), appt.provider.name, appt.provider.specialty, appt.reason],
                         columns: columns4, boldFirst: false)
            }
        }
        let open = report.flags.filter { flag in !report.appointments.contains { $0.linkedFlag == flag.kind } }
        if !open.isEmpty {
            y += 4
            paragraph("No follow-up booked yet for: " + open.map(\.kind.shortName).joined(separator: ", ") + ".",
                      font: .systemFont(ofSize: 9.5, weight: .medium), color: Ink.concern)
        }
        y += 10
    }

    private mutating func closingNote() {
        ensureSpace(70)
        y += 6
        rule()
        paragraph("This report was generated and shared by the patient from their ChartLine Health record. ChartLine records "
                  + "come from uploaded prior records and employer-sponsored screenings. Please confirm any value that affects "
                  + "treatment against the originating lab or provider.",
                  font: .systemFont(ofSize: 8), color: Ink.muted)
        paragraph("SYNTHETIC DEMO DATA. Not real patient information.", font: .systemFont(ofSize: 8, weight: .bold), color: Ink.concern)
    }

    // MARK: Pages

    private mutating func newPage(withHeader: Bool) {
        context.beginPage()
        pageNumber += 1
        footer()
        if withHeader {
            let band = CGRect(x: 0, y: 0, width: Layout.page.width, height: 92)
            Ink.navy.setFill()
            UIRectFill(band)
            Ink.teal.setFill()
            UIRectFill(CGRect(x: 0, y: band.maxY, width: Layout.page.width, height: 3))
            if let logo = UIImage(named: "ChartLineLogo") {
                let h: CGFloat = 34
                let w = logo.size.width / logo.size.height * h
                logo.draw(in: CGRect(x: Layout.margin, y: 22, width: w, height: h))
                draw("HEALTH", at: CGPoint(x: Layout.margin, y: 60), font: .systemFont(ofSize: 7, weight: .semibold),
                     color: UIColor(white: 1, alpha: 0.75), kern: 4)
            } else {
                draw("ChartLine Health", at: CGPoint(x: Layout.margin, y: 32), font: .systemFont(ofSize: 20, weight: .bold), color: .white)
            }
            let title = "Personal Health Report"
            let titleFont = UIFont.systemFont(ofSize: 17, weight: .semibold)
            let titleWidth = (title as NSString).size(withAttributes: [.font: titleFont]).width
            draw(title, at: CGPoint(x: Layout.page.width - Layout.margin - titleWidth, y: 30), font: titleFont, color: .white)
            let sub = "Shared by the patient"
            let subFont = UIFont.systemFont(ofSize: 9)
            let subWidth = (sub as NSString).size(withAttributes: [.font: subFont]).width
            draw(sub, at: CGPoint(x: Layout.page.width - Layout.margin - subWidth, y: 54), font: subFont, color: UIColor(white: 1, alpha: 0.7))
            y = band.maxY + 24
        } else {
            draw("\(report.patient.name) · DOB \(report.patient.dateOfBirth.formatted(date: .numeric, time: .omitted)) · Personal Health Report",
                 at: CGPoint(x: Layout.margin, y: 28), font: .systemFont(ofSize: 8, weight: .medium), color: Ink.muted)
            Ink.teal.setFill()
            UIRectFill(CGRect(x: Layout.margin, y: 42, width: Layout.contentWidth, height: 1.5))
            y = 58
        }
    }

    private func footer() {
        let left = "Shared by \(report.patient.name) via ChartLine Health · \(report.generated.formatted(date: .abbreviated, time: .omitted)) · Synthetic demo data"
        draw(left, at: CGPoint(x: Layout.margin, y: Layout.footerTop + 12), font: .systemFont(ofSize: 7.5), color: Ink.muted)
        let right = "Page \(pageNumber)"
        let font = UIFont.systemFont(ofSize: 7.5, weight: .medium)
        let w = (right as NSString).size(withAttributes: [.font: font]).width
        draw(right, at: CGPoint(x: Layout.page.width - Layout.margin - w, y: Layout.footerTop + 12), font: font, color: Ink.muted)
    }

    private mutating func ensureSpace(_ needed: CGFloat) {
        if y + needed > Layout.footerTop - 8 {
            newPage(withHeader: false)
        }
    }

    // MARK: Building blocks

    private mutating func sectionHeader(_ title: String, subtitle: String) {
        ensureSpace(70)
        Ink.teal.setFill()
        UIRectFill(CGRect(x: Layout.margin, y: y + 2, width: 3, height: 15))
        draw(title, at: CGPoint(x: Layout.margin + 10, y: y), font: .systemFont(ofSize: 14, weight: .bold), color: Ink.navy)
        y += 20
        draw(subtitle, at: CGPoint(x: Layout.margin + 10, y: y), font: .systemFont(ofSize: 8.5), color: Ink.muted)
        y += 18
    }

    private var columns4: [CGFloat] {
        let w = Layout.contentWidth
        return [w * 0.22, w * 0.22, w * 0.18, w * 0.38]
    }

    private mutating func tableHeader(_ titles: [String], columns: [CGFloat]) {
        ensureSpace(36)
        var x = Layout.margin
        for (title, width) in zip(titles, columns) {
            draw(title, at: CGPoint(x: x, y: y), font: .systemFont(ofSize: 7, weight: .semibold), color: Ink.muted, kern: 0.6)
            x += width
        }
        y += 12
        rule()
    }

    private mutating func tableRow(_ cells: [String], columns: [CGFloat], boldFirst: Bool) {
        let font = UIFont.systemFont(ofSize: 9)
        let rowHeight = zip(cells, columns).map { height(of: $0, font: font, width: $1 - 8) }.max() ?? 12
        ensureSpace(rowHeight + 10)
        var x = Layout.margin
        for (i, (cell, width)) in zip(cells, columns).enumerated() {
            let f = boldFirst && i == 0 ? UIFont.systemFont(ofSize: 9, weight: .semibold) : font
            draw(cell, in: CGRect(x: x, y: y, width: width - 8, height: rowHeight + 2), font: f, color: Ink.text)
            x += width
        }
        y += rowHeight + 4
        rule()
    }

    private mutating func paragraph(_ text: String, font: UIFont, color: UIColor) {
        let h = height(of: text, font: font, width: Layout.contentWidth)
        ensureSpace(h + 4)
        draw(text, in: CGRect(x: Layout.margin, y: y, width: Layout.contentWidth, height: h + 2), font: font, color: color)
        y += h + 4
    }

    private mutating func rule() {
        Ink.rule.setFill()
        UIRectFill(CGRect(x: Layout.margin, y: y, width: Layout.contentWidth, height: 0.5))
        y += 8
    }

    private func pill(_ label: String, color: UIColor, at origin: CGPoint) {
        let font = UIFont.systemFont(ofSize: 7.5, weight: .bold)
        let size = (label as NSString).size(withAttributes: [.font: font])
        let rect = CGRect(x: origin.x, y: origin.y, width: size.width + 14, height: size.height + 6)
        color.withAlphaComponent(0.14).setFill()
        UIBezierPath(roundedRect: rect, cornerRadius: rect.height / 2).fill()
        draw(label, at: CGPoint(x: rect.minX + 7, y: rect.minY + 3), font: font, color: color)
    }

    /// The same picture as `LabTrendChart`: readings, healthy ceiling, threshold and projection.
    private func trendChart(series: LabSeries, flag: TrendFlag?, in rect: CGRect) {
        let kind = series.kind
        let points = series.points.sorted { $0.date < $1.date }
        guard let first = points.first, let last = points.last else { return }
        let end = flag.flatMap { _ in Calendar.current.date(byAdding: .year, value: 1, to: last.date) } ?? last.date
        let values = points.map(\.value) + [kind.concernThreshold, kind.normalUpper] + (flag.map { [$0.projected] } ?? [])
        let lo = values.min() ?? 0, hi = values.max() ?? 1
        let pad = max((hi - lo) * 0.15, 0.1)
        let yMin = lo - pad, yMax = hi + pad
        let plot = rect.insetBy(dx: 4, dy: 8)
        let span = max(end.timeIntervalSince(first.date), 1)

        func point(_ date: Date, _ value: Double) -> CGPoint {
            CGPoint(x: plot.minX + CGFloat(date.timeIntervalSince(first.date) / span) * plot.width,
                    y: plot.maxY - CGFloat((value - yMin) / (yMax - yMin)) * plot.height)
        }

        UIColor(white: 0.97, alpha: 1).setFill()
        UIBezierPath(roundedRect: rect, cornerRadius: 6).fill()

        // Year gridlines.
        let cal = Calendar.current
        var year = cal.component(.year, from: first.date) + 1
        while let date = cal.date(from: DateComponents(year: year, month: 1, day: 1)), date <= end {
            let x = point(date, yMin).x
            Ink.rule.setStroke()
            let grid = UIBezierPath()
            grid.move(to: CGPoint(x: x, y: plot.minY))
            grid.addLine(to: CGPoint(x: x, y: plot.maxY))
            grid.lineWidth = 0.5
            grid.stroke()
            draw(String(year), at: CGPoint(x: x + 2, y: plot.maxY - 9), font: .systemFont(ofSize: 6.5), color: Ink.muted)
            year += 1
        }

        func threshold(_ value: Double, color: UIColor) {
            let yPos = point(first.date, value).y
            let path = UIBezierPath()
            path.move(to: CGPoint(x: plot.minX, y: yPos))
            path.addLine(to: CGPoint(x: plot.maxX, y: yPos))
            path.lineWidth = 0.8
            path.setLineDash([3, 3], count: 2, phase: 0)
            color.withAlphaComponent(0.8).setStroke()
            path.stroke()
            draw(kind.format(value), at: CGPoint(x: plot.minX + 2, y: yPos - 9), font: .systemFont(ofSize: 6.5, weight: .medium), color: color)
        }
        threshold(kind.normalUpper, color: Ink.normal)
        threshold(kind.concernThreshold, color: Ink.concern)

        if let flag {
            let projection = UIBezierPath()
            projection.move(to: point(last.date, last.value))
            projection.addLine(to: point(end, flag.projected))
            projection.lineWidth = 1.5
            projection.setLineDash([5, 3], count: 2, phase: 0)
            Ink.severity(flag.severity).setStroke()
            projection.stroke()
        }

        let line = UIBezierPath()
        for (i, p) in points.enumerated() {
            let pt = point(p.date, p.value)
            if i == 0 { line.move(to: pt) } else { line.addLine(to: pt) }
        }
        line.lineWidth = 1.8
        line.lineJoinStyle = .round
        Ink.teal.setStroke()
        line.stroke()
        Ink.teal.setFill()
        for p in points {
            let pt = point(p.date, p.value)
            UIBezierPath(ovalIn: CGRect(x: pt.x - 2.2, y: pt.y - 2.2, width: 4.4, height: 4.4)).fill()
        }
    }

    // MARK: Text

    private func attributes(_ font: UIFont, _ color: UIColor, kern: CGFloat = 0) -> [NSAttributedString.Key: Any] {
        let style = NSMutableParagraphStyle()
        style.lineBreakMode = .byWordWrapping
        return [.font: font, .foregroundColor: color, .kern: kern, .paragraphStyle: style]
    }

    private func draw(_ text: String, at point: CGPoint, font: UIFont, color: UIColor, kern: CGFloat = 0) {
        (text as NSString).draw(at: point, withAttributes: attributes(font, color, kern: kern))
    }

    private func draw(_ text: String, in rect: CGRect, font: UIFont, color: UIColor) {
        (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin], attributes: attributes(font, color), context: nil)
    }

    private func height(of text: String, font: UIFont, width: CGFloat) -> CGFloat {
        let bounds = (text as NSString).boundingRect(
            with: CGSize(width: width, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin],
            attributes: attributes(font, Ink.text),
            context: nil
        )
        return ceil(bounds.height)
    }
}
