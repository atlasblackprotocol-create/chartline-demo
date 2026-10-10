import {
  AuditEvent, DataCategory, Employee, Encounter, Grants, LabKind, LabSeries, Medication, Patient, Provider,
  RiskBand, YearMetrics, allCategories, uid,
} from './models';

// Every record in this file is synthetic. No real person, provider or employer is represented.

export function date(y: number, m: number, d: number, h = 9, min = 0): Date {
  return new Date(y, m - 1, d, h, min);
}

export const patient: Patient = {
  name: 'Jordan Reyes',
  mrn: 'CL-000-48213',
  dateOfBirth: date(1981, 6, 14),
  sex: 'Male',
  employer: 'Northwind Logistics',
  primaryCare: 'Dr. Priya Anand',
  plan: 'Northwind PPO Gold',
};

function series(kind: LabKind, readings: [number, number, number][]): LabSeries {
  return { kind, points: readings.map(([y, m, v]) => ({ id: uid(), date: date(y, m, 12), value: v })) };
}

export const labs: LabSeries[] = [
  series('a1c', [
    [2022, 3, 5.4], [2022, 10, 5.5], [2023, 4, 5.7], [2023, 11, 5.8],
    [2024, 6, 6.0], [2025, 1, 6.1], [2025, 8, 6.3], [2026, 3, 6.4],
  ]),
  series('systolicBP', [
    [2022, 3, 118], [2022, 10, 121], [2023, 4, 120], [2023, 11, 125],
    [2024, 6, 127], [2025, 1, 131], [2025, 8, 133], [2026, 3, 136],
  ]),
  series('ldl', [
    [2022, 3, 104], [2023, 4, 98], [2024, 6, 101], [2025, 8, 99], [2026, 3, 97],
  ]),
  series('triglycerides', [
    [2022, 3, 128], [2022, 10, 134], [2023, 4, 139], [2023, 11, 147],
    [2024, 6, 152], [2025, 1, 158], [2025, 8, 166], [2026, 3, 174],
  ]),
];

const encounter = (d: Date, provider: string, type: string, summary: string, category: DataCategory): Encounter =>
  ({ id: uid(), date: d, provider, type, summary, category });

export const encounters: Encounter[] = [
  encounter(date(2026, 3, 12), 'Dr. Priya Anand', 'Annual physical',
    'A1C 6.4%, BP 136/86. Discussed diet and activity. Recheck in 6 months.', 'encounters'),
  encounter(date(2025, 8, 12), 'Dr. Priya Anand', 'Follow-up',
    'Prediabetes counseling. Started home BP log.', 'encounters'),
  encounter(date(2025, 5, 3), 'Lakeside Urgent Care', 'Urgent care',
    'Ankle sprain, grade I. RICE protocol.', 'encounters'),
  encounter(date(2025, 2, 20), 'Dana Whitfield, LCSW', 'Counseling session',
    'Work-related stress. Sleep hygiene plan.', 'mentalHealth'),
  encounter(date(2024, 11, 8), 'Dana Whitfield, LCSW', 'Counseling intake',
    'Adjustment disorder screening.', 'mentalHealth'),
  encounter(date(2024, 6, 12), 'Dr. Priya Anand', 'Annual physical',
    'A1C 6.0%, prediabetes. Referred to nutrition class.', 'encounters'),
];

export const medications: Medication[] = [
  { id: uid(), name: 'Lisinopril', dose: '10 mg daily', started: date(2026, 3, 12), prescriber: 'Dr. Priya Anand' },
  { id: uid(), name: 'Metformin ER', dose: '500 mg with dinner', started: date(2025, 8, 12), prescriber: 'Dr. Priya Anand' },
  { id: uid(), name: 'Sertraline', dose: '50 mg daily', started: date(2024, 11, 20), prescriber: 'Dr. Priya Anand' },
];

export const providers: Record<string, Provider[]> = {
  Endocrinology: [
    { name: 'Dr. Marcus Oyelaran', specialty: 'Endocrinology', location: 'Lakeside Medical Pavilion, Suite 300', rating: 4.9 },
    { name: 'Dr. Helen Cho', specialty: 'Endocrinology', location: 'Riverbend Diabetes Center', rating: 4.8 },
  ],
  Cardiology: [
    { name: 'Dr. Samuel Brandt', specialty: 'Cardiology', location: 'Lakeside Heart & Vascular', rating: 4.8 },
    { name: 'Dr. Aisha Kareem', specialty: 'Cardiology', location: 'Northgate Cardiology Group', rating: 4.9 },
  ],
  'Lipid & Metabolic Clinic': [
    { name: 'Dr. Nina Castellanos', specialty: 'Lipid & Metabolic Clinic', location: 'Lakeside Medical Pavilion, Suite 210', rating: 4.8 },
    { name: 'Leah Moreno, RDN', specialty: 'Lipid & Metabolic Clinic', location: 'Virtual visit', rating: 4.9 },
  ],
};

export function initialGrants(): Grants {
  return {
    primaryCare: new Set(allCategories),
    specialist: new Set<DataCategory>(['labs', 'vitals', 'medications']),
    pharmacy: new Set<DataCategory>(['medications']),
    employerWellness: new Set<DataCategory>(['labs', 'vitals', 'encounters']),
    research: new Set<DataCategory>(),
  };
}

export const initialAudit: AuditEvent[] = [
  { id: uid(), date: date(2026, 9, 18, 14, 2), actor: 'Dr. Priya Anand', action: 'Viewed lab results', icon: 'eye-outline' },
  { id: uid(), date: date(2026, 9, 1, 3, 0), actor: 'Northwind Wellness (aggregate)', action: 'Included in de-identified Q3 roll-up', icon: 'business-outline' },
  { id: uid(), date: date(2026, 3, 12, 10, 41), actor: 'Harbor Pharmacy', action: 'Received Lisinopril prescription', icon: 'medkit-outline' },
  { id: uid(), date: date(2026, 1, 4, 9, 15), actor: 'Jordan Reyes', action: 'Declined research data sharing', icon: 'hand-left-outline' },
  { id: uid(), date: date(2025, 1, 10, 8, 30), actor: 'Jordan Reyes', action: 'Enrolled in Northwind wellness program (aggregate only)', icon: 'ribbon-outline' },
];

// MARK: Synthetic workforce

export const employerName = 'Northwind Logistics';

type YearProfile = {
  physical: number;
  a1cElevated: number; a1cHigh: number;
  bpElevated: number; bpHigh: number;
  rising: number;
  followUp: number;
  quarters: number;
};

const profiles: Record<number, YearProfile> = {
  2024: { physical: 0.49, a1cElevated: 0.24, a1cHigh: 0.10, bpElevated: 0.28, bpHigh: 0.15, rising: 0.16, followUp: 0.34, quarters: 4 },
  2025: { physical: 0.64, a1cElevated: 0.23, a1cHigh: 0.09, bpElevated: 0.26, bpHigh: 0.12, rising: 0.14, followUp: 0.63, quarters: 4 },
  2026: { physical: 0.52, a1cElevated: 0.22, a1cHigh: 0.08, bpElevated: 0.24, bpHigh: 0.11, rising: 0.10, followUp: 0.72, quarters: 3 },
};

export const departments: [string, number][] = [
  ['Operations', 142], ['Warehouse', 121], ['Sales', 68],
  ['Engineering', 54], ['Administration', 20], ['Executive', 9],
];

/** Same seed and draw order as the SwiftUI app, so both demos show identical numbers. */
export function workforce(): Employee[] {
  const rng = new SeededRandom(20_260_923n);
  const employees: Employee[] = [];
  let nextID = 1;
  for (const [department, headcount] of departments) {
    for (let i = 0; i < headcount; i++) {
      const consented = rng.chance(0.67);
      const years: Record<number, YearMetrics> = {};
      for (const year of [2024, 2025, 2026]) {
        const p = profiles[year];
        const band = (elevated: number, high: number): RiskBand => {
          const r = rng.next();
          return r < high ? 'High' : r < high + elevated ? 'Elevated' : 'Normal';
        };
        const a1c = band(p.a1cElevated, p.a1cHigh);
        const bp = band(p.bpElevated, p.bpHigh);
        const atRisk = a1c !== 'Normal' || bp !== 'Normal';
        const rising = rng.chance(atRisk ? p.rising * 2.2 : p.rising * 0.3);
        const followUp = rising && rng.chance(p.followUp);
        const erRate = rising && !followUp ? 0.35 : 0.08;
        const annualPhysical = rng.chance(p.physical);
        const flaggedQuarter = 1 + Math.floor(rng.next() * p.quarters);
        const erVisits = rng.chance(erRate) ? 1 : 0;
        years[year] = {
          annualPhysical, a1c, bloodPressure: bp, risingFlag: rising, flaggedQuarter, followUpBooked: followUp, erVisits,
        };
      }
      employees.push({ id: nextID, department, consented, years });
      nextID++;
    }
  }
  return employees;
}

const MASK = (1n << 64n) - 1n;

/** Deterministic SplitMix64 so the demo report is identical on every launch. */
class SeededRandom {
  private state: bigint;
  constructor(seed: bigint) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK;
    z ^= z >> 31n;
    return Number(z >> 11n) / 2 ** 53;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
