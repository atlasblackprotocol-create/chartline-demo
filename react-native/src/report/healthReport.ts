import { ageOn, dateTime, longDate, monthYear, shortDate } from '../format';
import {
  Appointment, DataCategory, Encounter, LabSeries, Medication, Patient, Severity, TrendFlag,
  allCategories, categoryInfo, formatLab, labInfo, severityInfo,
} from '../models';
import type { AppStore } from '../store';
import { logoDataUri } from './logoDataUri';

/** What the employee chose to put in a report before sharing it. */
export type HealthReportOptions = {
  categories: Set<DataCategory>;
  includeFlags: boolean;
  includeCarePlan: boolean;
  preparedFor: string;
};

/** Sensitive categories start off. The employee has to opt in to each one. */
export function standardOptions(): HealthReportOptions {
  return {
    categories: new Set(allCategories.filter((c) => !categoryInfo[c].isSensitive)),
    includeFlags: true,
    includeCarePlan: true,
    preparedFor: '',
  };
}

export function sectionTitles(options: HealthReportOptions): string[] {
  const titles = allCategories.filter((c) => options.categories.has(c)).map((c) => categoryInfo[c].title);
  if (options.includeFlags) titles.push('Flagged Trends');
  if (options.includeCarePlan) titles.push('Care Plan');
  return titles;
}

/**
 * Everything that goes into one report, resolved from the store so the PDF is a
 * snapshot of the record at the moment the employee shared it.
 */
export type HealthReport = {
  patient: Patient;
  options: HealthReportOptions;
  generated: Date;
  labs: LabSeries[];
  medications: Medication[];
  encounters: Encounter[];
  flags: TrendFlag[];
  appointments: Appointment[];
};

export function buildReport(store: AppStore, options: HealthReportOptions, generated = new Date()): HealthReport {
  const included = options.categories;
  return {
    patient: store.patient,
    options,
    generated,
    labs: store.labs.filter((s) => included.has(labInfo[s.kind].category)),
    medications: included.has('medications') ? store.medications : [],
    encounters: store.encounters.filter((e) => included.has(e.category)).sort((a, b) => b.date.getTime() - a.date.getTime()),
    // A flag is only meaningful if its readings are in the report too.
    flags: options.includeFlags ? store.flags.filter((f) => included.has(labInfo[f.kind].category)) : [],
    appointments: options.includeCarePlan ? store.appointments : [],
  };
}

export function reportFileName(report: HealthReport): string {
  const d = report.generated;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `ChartLine-Health-Report-${report.patient.name.replace(/ /g, '-')}-${iso}`;
}

// MARK: HTML rendering
//
// expo-print turns this HTML into a US Letter PDF on iOS and Android. It keeps real,
// selectable text that a clinic's EHR can index, same as the SwiftUI version.

const ink = {
  navy: '#1A1A26',
  teal: '#2199A8',
  tealWash: 'rgba(33, 153, 168, 0.10)',
  text: '#1F212E',
  muted: '#6B707F',
  rule: '#DBDEE5',
  normal: '#339E5C',
  concern: '#CC3833',
  sensitive: '#7852BD',
};

const severityInk = (s: Severity) => (s === 1 ? '#C7990D' : s === 2 ? '#E0751A' : ink.concern);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function pill(label: string, color: string) {
  return `<span class="pill" style="color:${color};background:${color}24">${esc(label)}</span>`;
}

/** The same picture as LabTrendChart: readings, healthy ceiling, threshold and projection. */
function trendChartSvg(series: LabSeries, flag: TrendFlag | undefined): string {
  const info = labInfo[series.kind];
  const points = [...series.points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = points[0];
  const last = points[points.length - 1];
  const end = flag ? new Date(last.date.getFullYear() + 1, last.date.getMonth(), last.date.getDate()) : last.date;
  const values = [...points.map((p) => p.value), info.concernThreshold, info.normalUpper, ...(flag ? [flag.projected] : [])];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.15, 0.1);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const W = 300;
  const H = 120;
  const span = Math.max(end.getTime() - first.date.getTime(), 1);
  const x = (d: Date) => 6 + ((d.getTime() - first.date.getTime()) / span) * (W - 12);
  const y = (v: number) => H - 10 - ((v - yMin) / (yMax - yMin)) * (H - 20);

  const parts: string[] = [`<rect width="${W}" height="${H}" rx="6" fill="#F7F7F8"/>`];
  for (let yr = first.date.getFullYear() + 1; new Date(yr, 0, 1) <= end; yr++) {
    const gx = x(new Date(yr, 0, 1));
    parts.push(`<line x1="${gx}" x2="${gx}" y1="8" y2="${H - 8}" stroke="${ink.rule}" stroke-width="0.6"/>`);
    parts.push(`<text x="${gx + 2}" y="${H - 3}" font-size="7" fill="${ink.muted}">${yr}</text>`);
  }
  for (const [value, color] of [[info.normalUpper, ink.normal], [info.concernThreshold, ink.concern]] as [number, string][]) {
    parts.push(`<line x1="6" x2="${W - 6}" y1="${y(value)}" y2="${y(value)}" stroke="${color}" stroke-width="0.8" stroke-dasharray="3,3"/>`);
    parts.push(`<text x="8" y="${y(value) - 3}" font-size="7" font-weight="600" fill="${color}">${formatLab(series.kind, value)}</text>`);
  }
  if (flag) {
    parts.push(
      `<line x1="${x(last.date)}" y1="${y(last.value)}" x2="${x(end)}" y2="${y(flag.projected)}" stroke="${severityInk(flag.severity)}" stroke-width="1.5" stroke-dasharray="5,3"/>`,
    );
  }
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  parts.push(`<path d="${d}" fill="none" stroke="${ink.teal}" stroke-width="1.8" stroke-linejoin="round"/>`);
  for (const p of points) parts.push(`<circle cx="${x(p.date)}" cy="${y(p.value)}" r="2.2" fill="${ink.teal}"/>`);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

function section(title: string, subtitle: string, body: string) {
  return `<section><h2>${esc(title)}</h2><p class="sub">${esc(subtitle)}</p>${body}</section>`;
}

export function reportHtml(report: HealthReport): string {
  const p = report.patient;
  const o = report.options;
  const recipient = o.preparedFor.trim();
  const generatedLine =
    (recipient ? `Prepared for ${esc(recipient)}. ` : '') +
    `Generated ${esc(dateTime(report.generated))} by ${esc(p.name)} from their ChartLine record.`;

  const patientRows: [string, string][] = [
    ['Patient', p.name],
    ['Date of birth', `${longDate(p.dateOfBirth)} (age ${ageOn(p.dateOfBirth, report.generated)})`],
    ['Sex', p.sex],
    ['ChartLine ID', p.mrn],
    ['Primary care', p.primaryCare],
    ['Coverage', p.plan],
  ];

  const parts: string[] = [];

  parts.push(`
    <div class="patient">
      ${patientRows.map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}
    </div>
    <p class="meta">${generatedLine}</p>
    <p class="includes">Includes: ${esc(sectionTitles(o).join(', '))}</p>`);
  // Deliberately silent about what was left out: naming a withheld category
  // would tell the reader that such records exist.

  if (report.flags.length) {
    parts.push(section('Flagged Trends', 'ChartLine fits a trend line through every reading, not just the latest one.',
      report.flags.map((f) => `
        <div class="flag">
          <div class="flag-pill">${pill(severityInfo[f.severity].label, severityInk(f.severity))}</div>
          <div><div class="strong">${esc(f.headline)}</div><div class="muted small">${esc(f.detail)}</div></div>
        </div>`).join('')));
  }

  if (report.labs.length) {
    parts.push(section('Labs & Vitals', 'Every reading on file, with the healthy range and clinical threshold.',
      report.labs.map((s) => {
        const info = labInfo[s.kind];
        const flag = report.flags.find((f) => f.kind === s.kind);
        const rows = [...s.points].sort((a, b) => b.date.getTime() - a.date.getTime()).map((pt) => {
          const high = pt.value >= info.concernThreshold;
          const marker = high ? ' H' : pt.value > info.normalUpper ? ' ↑' : '';
          return `<tr><td>${esc(shortDate(pt.date))}</td><td class="${high ? 'high' : ''}">${formatLab(s.kind, pt.value)} ${esc(info.unit)}${marker}</td></tr>`;
        }).join('');
        return `
          <div class="lab">
            <div class="lab-head">
              <span class="strong">${esc(info.name)}</span>
              <span class="muted small">Normal ≤ ${formatLab(s.kind, info.normalUpper)} ${esc(info.unit)} · ${esc(capitalize(info.concernLabel))} ≥ ${formatLab(s.kind, info.concernThreshold)} ${esc(info.unit)}</span>
              ${flag ? pill(severityInfo[flag.severity].label, severityInk(flag.severity)) : ''}
            </div>
            <div class="lab-body">
              <table class="readings"><tr><th>Date</th><th>Result</th></tr>${rows}</table>
              <div class="chart">${trendChartSvg(s, flag)}</div>
            </div>
          </div>`;
      }).join('') +
      `<p class="muted tiny">H = at or above the clinical threshold. ↑ = above the healthy range. Dashed line = ChartLine's 12-month projection.</p>`));
  }

  if (report.medications.length) {
    parts.push(section('Medications', 'Active prescriptions on file.', `
      <table class="grid"><tr><th>Medication</th><th>Dose</th><th>Started</th><th>Prescriber</th></tr>
      ${report.medications.map((m) => `<tr><td class="strong">${esc(m.name)}</td><td>${esc(m.dose)}</td><td>${esc(monthYear(m.started))}</td><td>${esc(m.prescriber)}</td></tr>`).join('')}
      </table>`));
  }

  if (report.encounters.length) {
    parts.push(section('Visit History', 'Most recent first.', report.encounters.map((e) => {
      const info = categoryInfo[e.category];
      return `
        <div class="visit">
          <div class="date">${esc(shortDate(e.date))}</div>
          <div>
            <div class="strong" style="color:${info.isSensitive ? ink.sensitive : ink.text}">${esc(e.type)} · ${esc(e.provider)}${info.isSensitive ? ` (${esc(info.title)})` : ''}</div>
            <div>${esc(e.summary)}</div>
            ${info.protectionNote ? `<div class="tiny" style="color:${ink.sensitive};font-style:italic">${esc(info.protectionNote)}. Shared by the patient with explicit consent.</div>` : ''}
          </div>
        </div>`;
    }).join('')));
  }

  if (o.includeCarePlan) {
    const open = report.flags.filter((f) => !report.appointments.some((a) => a.linkedFlag === f.kind));
    parts.push(section('Care Plan', 'Follow-up ChartLine has booked or is still waiting on.',
      (report.appointments.length
        ? `<table class="grid"><tr><th>Date</th><th>Provider</th><th>Specialty</th><th>Reason</th></tr>
           ${report.appointments.map((a) => `<tr><td>${esc(dateTime(a.date))}</td><td>${esc(a.provider.name)}</td><td>${esc(a.provider.specialty)}</td><td>${esc(a.reason)}</td></tr>`).join('')}
           </table>`
        : `<p class="muted">No upcoming appointments booked through ChartLine.</p>`) +
      (open.length ? `<p class="open">No follow-up booked yet for: ${esc(open.map((f) => labInfo[f.kind].shortName).join(', '))}.</p>` : '')));
  }

  parts.push(`
    <div class="closing">
      <p class="muted small">This report was generated and shared by the patient from their ChartLine Health record. ChartLine records come from uploaded prior records and employer-sponsored screenings. Please confirm any value that affects treatment against the originating lab or provider.</p>
      <p class="demo">SYNTHETIC DEMO DATA. Not real patient information.</p>
    </div>`);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Personal Health Report: ${esc(p.name)}</title>
<style>
  @page { size: letter; margin: 0.55in 0.6in 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif; color: ${ink.text}; font-size: 10pt; margin: 0; }
  header { background: ${ink.navy}; border-bottom: 3px solid ${ink.teal}; color: #fff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-radius: 6px; }
  header img { height: 58px; }
  header .title { text-align: right; }
  header .title div:first-child { font-size: 16pt; font-weight: 600; }
  header .title div:last-child { font-size: 8.5pt; opacity: 0.7; margin-top: 4px; }
  .patient { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; background: ${ink.tealWash}; padding: 14px 16px; border-radius: 8px; margin-top: 18px; }
  .k { font-size: 6.5pt; font-weight: 600; letter-spacing: 0.8px; color: ${ink.muted}; text-transform: uppercase; }
  .v { font-size: 10pt; font-weight: 500; }
  .meta { color: ${ink.muted}; font-size: 8.5pt; margin: 12px 0 4px; }
  .includes { font-size: 8.5pt; font-weight: 500; margin: 0 0 6px; }
  section { margin-top: 20px; }
  h2 { font-size: 13pt; color: ${ink.navy}; margin: 0; padding-left: 9px; border-left: 3px solid ${ink.teal}; }
  .sub { color: ${ink.muted}; font-size: 8pt; margin: 3px 0 10px 12px; }
  .strong { font-weight: 600; }
  .muted { color: ${ink.muted}; }
  .small { font-size: 8.5pt; }
  .tiny { font-size: 7.5pt; }
  .pill { display: inline-block; font-size: 7pt; font-weight: 700; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
  .flag { display: grid; grid-template-columns: 96px 1fr; gap: 8px; margin-bottom: 10px; break-inside: avoid; }
  .lab { border-bottom: 0.5px solid ${ink.rule}; padding: 6px 0 12px; margin-bottom: 8px; break-inside: avoid; }
  .lab-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }
  .lab-head .pill { margin-left: auto; }
  .lab-body { display: grid; grid-template-columns: 150px 1fr; gap: 16px; align-items: start; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; font-size: 6.5pt; letter-spacing: 0.6px; color: ${ink.muted}; text-transform: uppercase; font-weight: 600; padding: 2px 4px 4px 0; }
  .readings td { font-size: 8.5pt; padding: 1.5px 4px 1.5px 0; font-variant-numeric: tabular-nums; }
  .readings td.high { color: ${ink.concern}; font-weight: 600; }
  .grid th { border-bottom: 0.5px solid ${ink.rule}; }
  .grid td { font-size: 9pt; padding: 6px 8px 6px 0; border-bottom: 0.5px solid ${ink.rule}; vertical-align: top; }
  .visit { display: grid; grid-template-columns: 100px 1fr; gap: 8px; margin-bottom: 10px; font-size: 9pt; break-inside: avoid; }
  .visit .date { font-weight: 500; font-variant-numeric: tabular-nums; }
  .open { color: ${ink.concern}; font-weight: 500; font-size: 9pt; }
  .closing { margin-top: 24px; border-top: 0.5px solid ${ink.rule}; padding-top: 8px; }
  .demo { color: ${ink.concern}; font-weight: 700; font-size: 8pt; }
</style></head>
<body>
  <header>
    <img src="${logoDataUri}" alt="ChartLine Health">
    <div class="title"><div>Personal Health Report</div><div>Shared by the patient</div></div>
  </header>
  ${parts.join('\n')}
</body></html>`;
}
