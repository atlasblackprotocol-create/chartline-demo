import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View } from 'react-native';
import { LabTrendChart } from '../components/LabTrendChart';
import {
  Card, DemoBanner, Divider, Label, RestrictedRow, Screen, SectionHeader, Segmented, SeverityPill, T,
} from '../components/ui';
import { minimumCellSize } from '../employerReport';
import { monthYear, shortDate } from '../format';
import {
  DataCategory, LabSeries, Recipient, TrendFlag, categoryInfo, formatLab, labInfo, latestPoint, recipientInfo,
} from '../models';
import { ShareReportButton } from '../report/ShareReportSheet';
import { useStore } from '../store';
import { colors, font } from '../theme';

type Viewer = 'Patient' | 'PCP' | 'Specialist' | 'Employer';

const viewerRecipient: Record<Viewer, Recipient | undefined> = {
  Patient: undefined,
  PCP: 'primaryCare',
  Specialist: 'specialist',
  Employer: 'employerWellness',
};

/** The patient's chart, rendered through the consent layer for whichever viewer is selected. */
export function RecordsScreen() {
  const store = useStore();
  const [viewer, setViewer] = useState<Viewer>('Patient');
  const recipient = viewerRecipient[viewer];

  const canSee = (category: DataCategory) => !recipient || store.hasConsent(recipient, category);
  const restrictionReason = `${store.patient.name} has not shared this with ${recipient ? recipientInfo[recipient].title : ''}.`;

  return (
    <Screen title="Health Record" right={viewer === 'Patient' ? <ShareReportButton variant="icon" /> : null}>
      <DemoBanner />
      <View style={{ gap: 8 }}>
        <T size={font.caption2} weight="600" color={colors.secondary}>VIEWING AS</T>
        <Segmented
          options={(['Patient', 'PCP', 'Specialist', 'Employer'] as Viewer[]).map((v) => ({ label: v, value: v }))}
          value={viewer}
          onChange={setViewer}
        />
        {viewer !== 'Patient' ? (
          <T size={font.caption} color={colors.secondary}>Everything below is filtered live by the consent layer.</T>
        ) : null}
      </View>

      {viewer === 'Employer' ? (
        <Card>
          <Ionicons name="hand-left" size={34} color={colors.brand} />
          <T size={font.headline} weight="600">Individual records are never visible to employers</T>
          <T color={colors.secondary}>
            {`Even with wellness consent on, ${store.patient.employer} only receives de-identified totals across consenting employees. Groups smaller than ${minimumCellSize} people are suppressed. See the Employer tab for exactly what they receive.`}
          </T>
          <Label icon={store.inEmployerAggregate ? 'checkmark-circle-outline' : 'remove-circle-outline'} weight="500">
            {store.inEmployerAggregate ? 'Included in aggregate counts' : 'Excluded from aggregate counts'}
          </Label>
        </Card>
      ) : (
        <>
          <SectionHeader title="Labs & Vitals" subtitle="Trend lines include reference ranges" />
          {store.labs.map((series) =>
            canSee(labInfo[series.kind].category) ? (
              <LabCard key={series.kind} series={series} flag={store.flags.find((f) => f.kind === series.kind)} />
            ) : (
              <RestrictedRow key={series.kind} title={categoryInfo[labInfo[series.kind].category].title} reason={restrictionReason} />
            ),
          )}

          <SectionHeader title="Medications" />
          {canSee('medications') ? (
            <Card>
              {store.medications.map((med, i) => (
                <React.Fragment key={med.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="medkit" size={18} color={colors.brand} />
                    <View>
                      <T weight="600">{med.name}</T>
                      <T size={font.caption} color={colors.secondary}>{`${med.dose} · since ${monthYear(med.started)}`}</T>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </Card>
          ) : (
            <RestrictedRow title={categoryInfo.medications.title} reason={restrictionReason} />
          )}

          <SectionHeader title="Visit History" />
          {store.encounters.map((e) =>
            canSee(e.category) ? (
              <Card key={e.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T weight="600">{e.type}</T>
                  {categoryInfo[e.category].isSensitive ? <Ionicons name="shield" size={14} color={colors.purple} /> : null}
                  <View style={{ flex: 1 }} />
                  <T size={font.caption} color={colors.secondary}>{shortDate(e.date)}</T>
                </View>
                <T size={font.caption} color={colors.secondary} style={{ marginTop: -8 }}>{e.provider}</T>
                <T>{e.summary}</T>
              </Card>
            ) : (
              <RestrictedRow key={e.id} title={categoryInfo[e.category].title} reason={restrictionReason} />
            ),
          )}
        </>
      )}
    </Screen>
  );
}

export function LabCard({ series, flag }: { series: LabSeries; flag?: TrendFlag }) {
  const info = labInfo[series.kind];
  const latest = latestPoint(series);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <T size={font.headline} weight="600">{info.name}</T>
          {latest ? (
            <T>
              <T size={font.title3} weight="700">{`${formatLab(series.kind, latest.value)} ${info.unit}`}</T>
              <T size={font.caption} color={colors.secondary}>{`  ${shortDate(latest.date)}`}</T>
            </T>
          ) : null}
        </View>
        {flag ? <SeverityPill severity={flag.severity} /> : null}
      </View>
      <LabTrendChart series={series} flag={flag} />
      {flag ? <T size={font.caption} color={colors.secondary}>{flag.detail}</T> : null}
    </Card>
  );
}
