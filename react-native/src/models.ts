// MARK: Clinical data

export type LabKind = 'a1c' | 'systolicBP' | 'ldl' | 'triglycerides';

type LabInfo = {
  name: string;
  shortName: string;
  unit: string;
  /** Top of the healthy reference range. */
  normalUpper: number;
  /** Level at which the value becomes clinically significant. */
  concernThreshold: number;
  concernLabel: string;
  category: DataCategory;
  specialty: string;
  decimals: number;
};

export const labInfo: Record<LabKind, LabInfo> = {
  a1c: {
    name: 'Hemoglobin A1C', shortName: 'A1C', unit: '%', normalUpper: 5.7, concernThreshold: 6.5,
    concernLabel: 'diabetes range', category: 'labs', specialty: 'Endocrinology', decimals: 1,
  },
  systolicBP: {
    name: 'Systolic Blood Pressure', shortName: 'Systolic BP', unit: 'mmHg', normalUpper: 120, concernThreshold: 130,
    concernLabel: 'Stage 1 hypertension', category: 'vitals', specialty: 'Cardiology', decimals: 0,
  },
  ldl: {
    name: 'LDL Cholesterol', shortName: 'LDL', unit: 'mg/dL', normalUpper: 100, concernThreshold: 160,
    concernLabel: 'high LDL', category: 'labs', specialty: 'Cardiology', decimals: 0,
  },
  triglycerides: {
    name: 'Triglycerides', shortName: 'Triglycerides', unit: 'mg/dL', normalUpper: 150, concernThreshold: 200,
    concernLabel: 'high range', category: 'labs', specialty: 'Lipid & Metabolic Clinic', decimals: 0,
  },
};

export function formatLab(kind: LabKind, value: number): string {
  return value.toFixed(labInfo[kind].decimals);
}

export type LabPoint = { id: string; date: Date; value: number };

export type LabSeries = { kind: LabKind; points: LabPoint[] };

export function latestPoint(series: LabSeries): LabPoint | undefined {
  return [...series.points].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

export type Encounter = {
  id: string;
  date: Date;
  provider: string;
  type: string;
  summary: string;
  category: DataCategory;
};

export type Medication = { id: string; name: string; dose: string; started: Date; prescriber: string };

export type Patient = {
  name: string;
  mrn: string;
  dateOfBirth: Date;
  sex: string;
  employer: string;
  primaryCare: string;
  plan: string;
};

// MARK: Consent

export type DataCategory =
  | 'labs' | 'vitals' | 'medications' | 'encounters' | 'mentalHealth' | 'reproductive' | 'substanceUse';

export const allCategories: DataCategory[] = [
  'labs', 'vitals', 'medications', 'encounters', 'mentalHealth', 'reproductive', 'substanceUse',
];

type CategoryInfo = { title: string; icon: string; isSensitive: boolean; protectionNote?: string };

export const categoryInfo: Record<DataCategory, CategoryInfo> = {
  labs: { title: 'Lab Results', icon: 'flask-outline', isSensitive: false },
  vitals: { title: 'Vitals', icon: 'heart-outline', isSensitive: false },
  medications: { title: 'Medications', icon: 'medkit-outline', isSensitive: false },
  encounters: { title: 'Visit History', icon: 'pulse-outline', isSensitive: false },
  mentalHealth: {
    title: 'Behavioral Health', icon: 'happy-outline', isSensitive: true,
    protectionNote: 'Psychotherapy notes require separate authorization',
  },
  reproductive: {
    title: 'Reproductive Health', icon: 'people-outline', isSensitive: true,
    protectionNote: 'Protected under the HIPAA reproductive health privacy rule',
  },
  substanceUse: {
    title: 'Substance Use Treatment', icon: 'bandage-outline', isSensitive: true,
    protectionNote: 'Protected under 42 CFR Part 2',
  },
};

export type Recipient = 'primaryCare' | 'specialist' | 'pharmacy' | 'employerWellness' | 'research';

export const allRecipients: Recipient[] = ['primaryCare', 'specialist', 'pharmacy', 'employerWellness', 'research'];

type RecipientInfo = {
  title: string;
  subtitle: string;
  icon: string;
  /** Categories that can ever be shared with this recipient. */
  allowedCategories: DataCategory[];
  isAggregateOnly: boolean;
};

export const recipientInfo: Record<Recipient, RecipientInfo> = {
  primaryCare: {
    title: 'Primary Care Team', subtitle: 'Dr. Priya Anand · Lakeside Family Medicine', icon: 'person-circle-outline',
    allowedCategories: allCategories, isAggregateOnly: false,
  },
  specialist: {
    title: 'Referred Specialists', subtitle: 'Only providers you book with through ChartLine', icon: 'medical-outline',
    allowedCategories: allCategories, isAggregateOnly: false,
  },
  pharmacy: {
    title: 'Pharmacy', subtitle: 'Harbor Pharmacy #0412', icon: 'storefront-outline',
    allowedCategories: ['medications'], isAggregateOnly: false,
  },
  employerWellness: {
    title: 'Employer Wellness Program', subtitle: 'Northwind Logistics · aggregate, de-identified only', icon: 'business-outline',
    allowedCategories: ['labs', 'vitals', 'encounters'], isAggregateOnly: true,
  },
  research: {
    title: 'Research Network', subtitle: 'De-identified, IRB-approved studies only', icon: 'bar-chart-outline',
    allowedCategories: ['labs', 'vitals', 'medications', 'encounters'], isAggregateOnly: true,
  },
};

export type Grants = Record<Recipient, Set<DataCategory>>;

export type AuditEvent = { id: string; date: Date; actor: string; action: string; icon: string };

// MARK: Trends & scheduling

export type Severity = 1 | 2 | 3;

export const severityInfo: Record<Severity, { label: string; icon: string }> = {
  1: { label: 'Watch', icon: 'eye' },
  2: { label: 'Rising risk', icon: 'trending-up' },
  3: { label: 'Action needed', icon: 'warning' },
};

export type TrendFlag = {
  kind: LabKind;
  severity: Severity;
  slopePerYear: number;
  latest: number;
  projected: number;
  readings: number;
  headline: string;
  detail: string;
};

export type Provider = { name: string; specialty: string; location: string; rating: number };

export type Appointment = {
  id: string;
  date: Date;
  provider: Provider;
  reason: string;
  linkedFlag?: LabKind;
  sharedTrend: boolean;
};

// MARK: Workforce (employer aggregate)

export type RiskBand = 'Normal' | 'Elevated' | 'High';
export const allRiskBands: RiskBand[] = ['Normal', 'Elevated', 'High'];

export type YearMetrics = {
  annualPhysical: boolean;
  a1c: RiskBand;
  bloodPressure: RiskBand;
  risingFlag: boolean;
  flaggedQuarter: number;
  followUpBooked: boolean;
  erVisits: number;
};

export type Employee = {
  id: number;
  department: string;
  consented: boolean;
  years: Record<number, YearMetrics>;
};

let nextId = 0;
export const uid = () => `id-${++nextId}`;
