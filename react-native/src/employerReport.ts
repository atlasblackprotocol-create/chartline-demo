import { departments } from './demoData';
import { Employee, RiskBand, YearMetrics, allRiskBands } from './models';

export const minimumCellSize = 11;

export type DepartmentRow = {
  name: string;
  participants: number;
  physicalRate?: number;
  flaggedRate?: number;
  suppressed: boolean;
};

export type QuarterRow = { quarter: number; flagged: number; followUps: number };

const rate = (a: number, b: number) => (b === 0 ? 0 : a / b);

/**
 * Everything an employer is allowed to see: counts and rates over consenting employees,
 * with small cells suppressed so no individual can be re-identified.
 */
export class EmployerReport {
  readonly eligible: number;
  readonly participants: YearMetrics[];
  readonly departments: DepartmentRow[];
  readonly quarters: QuarterRow[];

  constructor(readonly year: number, cohort: Employee[]) {
    this.eligible = cohort.length;
    const consenting = cohort.filter((e) => e.consented);
    this.participants = consenting.map((e) => e.years[year]).filter(Boolean);

    this.departments = departments.map(([name]) => {
      const rows = consenting.filter((e) => e.department === name).map((e) => e.years[year]).filter(Boolean);
      if (rows.length < minimumCellSize) {
        return { name, participants: rows.length, suppressed: true };
      }
      return {
        name,
        participants: rows.length,
        physicalRate: rows.filter((r) => r.annualPhysical).length / rows.length,
        flaggedRate: rows.filter((r) => r.risingFlag).length / rows.length,
        suppressed: false,
      };
    });

    const flaggedRows = this.participants.filter((p) => p.risingFlag);
    this.quarters = [1, 2, 3, 4].map((q) => {
      const inQuarter = flaggedRows.filter((r) => r.flaggedQuarter === q);
      return { quarter: q, flagged: inQuarter.length, followUps: inQuarter.filter((r) => r.followUpBooked).length };
    });
  }

  get isYearToDate() { return this.year === new Date().getFullYear(); }
  get participationRate() { return rate(this.participants.length, this.eligible); }
  get physicalRate() { return rate(this.participants.filter((p) => p.annualPhysical).length, this.participants.length); }
  get flaggedCount() { return this.participants.filter((p) => p.risingFlag).length; }
  get followUpCount() { return this.participants.filter((p) => p.followUpBooked).length; }
  get followUpRate() { return rate(this.followUpCount, this.flaggedCount); }
  get erVisits() { return this.participants.reduce((sum, p) => sum + p.erVisits, 0); }
  get erPer100() { return rate(this.erVisits, this.participants.length) * 100; }

  distribution(metric: 'a1c' | 'bloodPressure'): [RiskBand, number][] {
    return allRiskBands.map((band) => [band, this.participants.filter((p) => p[metric] === band).length]);
  }
}
