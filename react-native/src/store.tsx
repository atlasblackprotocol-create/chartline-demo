import React, { createContext, useCallback, useContext, useState } from 'react';
import * as Demo from './demoData';
import { EmployerReport } from './employerReport';
import { dateTime } from './format';
import {
  Appointment, AuditEvent, DataCategory, Employee, Grants, LabKind, Provider, Recipient, TrendFlag,
  categoryInfo, labInfo, recipientInfo, uid,
} from './models';
import { analyze } from './trendEngine';
import type { HealthReportOptions } from './report/healthReport';
import { sectionTitles } from './report/healthReport';

const workforce = Demo.workforce();

const flags: TrendFlag[] = Demo.labs
  .map(analyze)
  .filter((f): f is TrendFlag => f !== undefined)
  .sort((a, b) => b.severity - a.severity);

function useAppStoreValue() {
  const [grants, setGrants] = useState<Grants>(Demo.initialGrants);
  const [audit, setAudit] = useState<AuditEvent[]>(Demo.initialAudit);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const log = useCallback((actor: string, action: string, icon: string) => {
    setAudit((a) => [{ id: uid(), date: new Date(), actor, action, icon }, ...a]);
  }, []);

  // MARK: Consent

  const hasConsent = useCallback(
    (recipient: Recipient, category: DataCategory) => grants[recipient].has(category),
    [grants],
  );

  const setConsent = useCallback(
    (recipient: Recipient, category: DataCategory, granted: boolean) => {
      if (grants[recipient].has(category) === granted) return;
      setGrants((g) => {
        const next = new Set(g[recipient]);
        if (granted) next.add(category);
        else next.delete(category);
        return { ...g, [recipient]: next };
      });
      log(
        Demo.patient.name,
        `${granted ? 'Granted' : 'Revoked'} ${categoryInfo[category].title} to ${recipientInfo[recipient].title}`,
        granted ? 'shield-checkmark-outline' : 'close-circle-outline',
      );
    },
    [grants, log],
  );

  const revokeAll = useCallback(
    (recipient: Recipient) => {
      if (grants[recipient].size === 0) return;
      setGrants((g) => ({ ...g, [recipient]: new Set() }));
      log(Demo.patient.name, `Revoked all sharing with ${recipientInfo[recipient].title}`, 'close-circle');
    },
    [grants, log],
  );

  const inEmployerAggregate = grants.employerWellness.size > 0;

  // MARK: Records

  const series = useCallback((kind: LabKind) => Demo.labs.find((s) => s.kind === kind), []);

  /** The employee handed a copy of their own record to someone outside ChartLine. */
  const logReportShared = useCallback(
    (options: HealthReportOptions, destination: string) => {
      const recipient = options.preparedFor.trim();
      const to = recipient ? ` for ${recipient}` : '';
      log(
        Demo.patient.name,
        `Shared health report${to} via ${destination}: ${sectionTitles(options).join(', ')}`,
        'share-outline',
      );
    },
    [log],
  );

  // MARK: Appointments

  const appointmentFor = useCallback(
    (kind: LabKind) => appointments.find((a) => a.linkedFlag === kind),
    [appointments],
  );

  const book = useCallback(
    (provider: Provider, date: Date, reason: string, flag: LabKind | undefined, shareTrend: boolean) => {
      setAppointments((a) =>
        [...a, { id: uid(), date, provider, reason, linkedFlag: flag, sharedTrend: shareTrend }]
          .sort((x, y) => x.date.getTime() - y.date.getTime()),
      );
      log(Demo.patient.name, `Booked ${provider.specialty} with ${provider.name} for ${dateTime(date)}`, 'calendar-outline');
      if (shareTrend && flag) {
        setConsent('specialist', labInfo[flag].category, true);
        log('ChartLine', `Shared ${labInfo[flag].shortName} trend packet with ${provider.name}`, 'paper-plane-outline');
      }
    },
    [log, setConsent],
  );

  const cancel = useCallback(
    (appointment: Appointment) => {
      setAppointments((a) => a.filter((x) => x.id !== appointment.id));
      log(Demo.patient.name, `Cancelled visit with ${appointment.provider.name}`, 'calendar-clear-outline');
    },
    [log],
  );

  // MARK: Employer report

  const employerReport = useCallback(
    (year: number) => {
      const followUpBooked = appointments.some((a) => a.linkedFlag !== undefined);
      // The demo patient is also a Northwind employee. They appear in the roll-up
      // only while they consent to the wellness program.
      const self: Employee = {
        id: 0,
        department: 'Operations',
        consented: inEmployerAggregate,
        years: {
          2024: { annualPhysical: true, a1c: 'Elevated', bloodPressure: 'Elevated', risingFlag: true, flaggedQuarter: 2, followUpBooked: false, erVisits: 0 },
          2025: { annualPhysical: false, a1c: 'Elevated', bloodPressure: 'High', risingFlag: true, flaggedQuarter: 3, followUpBooked: false, erVisits: 1 },
          2026: { annualPhysical: true, a1c: 'Elevated', bloodPressure: 'High', risingFlag: true, flaggedQuarter: 1, followUpBooked, erVisits: 0 },
        },
      };
      return new EmployerReport(year, [...workforce, self]);
    },
    [appointments, inEmployerAggregate],
  );

  return {
    patient: Demo.patient,
    labs: Demo.labs,
    encounters: Demo.encounters,
    medications: Demo.medications,
    flags,
    grants,
    audit,
    appointments,
    hasConsent,
    setConsent,
    revokeAll,
    inEmployerAggregate,
    series,
    logReportShared,
    appointmentFor,
    book,
    cancel,
    employerReport,
  };
}

export type AppStore = ReturnType<typeof useAppStoreValue>;

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <StoreContext.Provider value={useAppStoreValue()}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
