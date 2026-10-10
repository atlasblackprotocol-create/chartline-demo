import { LabSeries, Severity, TrendFlag, formatLab, labInfo } from './models';
import { monthYear } from './format';

/**
 * Fits a least-squares line through a patient's readings and flags series that are
 * drifting toward (or already past) a clinical threshold.
 */
export function analyze(series: LabSeries): TrendFlag | undefined {
  const points = [...series.points].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (points.length < 3) return undefined;
  const first = points[0];
  const last = points[points.length - 1];

  const year = 365.25 * 86_400_000;
  const xs = points.map((p) => (p.date.getTime() - first.date.getTime()) / year);
  const ys = points.map((p) => p.value);
  const n = points.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const numerator = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) * (x - meanX), 0);
  if (denominator <= 0) return undefined;

  const kind = series.kind;
  const info = labInfo[kind];
  const slope = numerator / denominator;
  const latest = last.value;
  const projected = latest + slope;

  // Ignore noise: the slope must be at least 1% of the reference ceiling per year.
  if (slope <= info.normalUpper * 0.01) return undefined;

  const recent = points.slice(-3).map((p) => p.value);
  const recentlyRising = recent.every((v, i) => i === 0 || recent[i - 1] < v);

  let severity: Severity;
  if (latest >= info.concernThreshold) {
    severity = 3;
  } else if (projected >= info.concernThreshold) {
    severity = 2;
  } else if (latest > info.normalUpper && recentlyRising) {
    severity = 1;
  } else {
    return undefined;
  }

  const rate = `${slope >= 0 ? '+' : ''}${formatLab(kind, slope)} ${info.unit}/yr`;
  const headline =
    severity === 3 ? `${info.shortName} is in the ${info.concernLabel} and still climbing`
    : severity === 2 ? `${info.shortName} projected to reach the ${info.concernLabel} within 12 months`
    : `${info.shortName} above normal and trending up`;
  const detail =
    `${points.length} readings since ${monthYear(first.date)}. ` +
    `Rate ${rate}. Latest ${formatLab(kind, latest)} ${info.unit}; ` +
    `12-month projection ${formatLab(kind, projected)} ${info.unit}.`;

  return { kind, severity, slopePerYear: slope, latest, projected, readings: points.length, headline, detail };
}
