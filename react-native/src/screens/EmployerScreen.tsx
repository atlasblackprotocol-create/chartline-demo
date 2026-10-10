import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Pressable, Share, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  Card, DemoBanner, Divider, Screen, SectionHeader, Segmented, StatTile, T, riskColor,
} from '../components/ui';
import { employerName } from '../demoData';
import { EmployerReport, minimumCellSize } from '../employerReport';
import { percent } from '../format';
import { RiskBand, allRiskBands } from '../models';
import { useStore } from '../store';
import { colors, font, svgFontFamily } from '../theme';

const years = [2024, 2025, 2026];

/** What an employer receives from ChartLine: an annual, de-identified population report. */
export function EmployerScreen() {
  const store = useStore();
  const [year, setYear] = useState(2025);
  const report = store.employerReport(year);
  const prior = years.includes(year - 1) ? store.employerReport(year - 1) : undefined;

  const share = () => Share.share({ message: summary(report) });

  return (
    <Screen
      title="Employer Portal"
      right={
        <Pressable onPress={share} hitSlop={10} accessibilityLabel="Share summary">
          <Ionicons name="share-outline" size={24} color={colors.brand} />
        </Pressable>
      }
    >
      <DemoBanner />
      <Segmented
        options={years.map((y) => ({ label: y === 2026 ? '2026 YTD' : String(y), value: y }))}
        value={year}
        onChange={setYear}
      />

      <View style={styles.header}>
        <T size={font.caption} weight="700" color="rgba(255,255,255,0.8)">{employerName.toUpperCase()}</T>
        <T size={font.title2} weight="700">{`${report.year} ${report.isYearToDate ? 'Year-to-Date' : 'Annual'} Health Insights`}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('../../assets/mark.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
          <T color="rgba(255,255,255,0.85)">{`Prepared by ChartLine Health · ${report.isYearToDate ? 'Through Q3' : 'Jan 1 to Dec 31'}`}</T>
        </View>
        <View style={styles.headerNote}>
          <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
          <T size={font.caption} weight="500" style={{ flexShrink: 1 }}>
            {`De-identified · consenting employees only · groups < ${minimumCellSize} suppressed`}
          </T>
        </View>
      </View>

      <Kpis r={report} prior={prior} />
      <QuarterlyChart r={report} />
      <RiskMix r={report} />
      <YearOverYear reports={years.map((y) => store.employerReport(y))} />
      <DepartmentTable r={report} />
      <Recommendations r={report} prior={prior} />

      <Card>
        <SectionHeader title="What this report never includes" />
        {[
          'Names, IDs, or any individual record',
          'Specific diagnoses, lab values or medications',
          'Behavioral health, reproductive or substance-use data',
          'Who booked, cancelled or skipped an appointment',
          'Anyone who has not opted in, or has since revoked consent',
        ].map((item) => (
          <View key={item} style={styles.bullet}>
            <Ionicons name="close-circle" size={17} color={colors.red} />
            <T style={{ flex: 1 }}>{item}</T>
          </View>
        ))}
        <T size={font.caption} color={colors.secondary}>
          {`Employee opt-in status: Jordan Reyes is currently ${store.inEmployerAggregate ? 'counted' : 'not counted'} in these totals. Toggle wellness sharing on the Consent tab to see the numbers change.`}
        </T>
      </Card>
    </Screen>
  );
}

function delta(now: number, before?: number) {
  if (before === undefined) return undefined;
  const d = Math.round((now - before) * 100);
  return `${d >= 0 ? '+' : ''}${d} pts vs prior year`;
}

function Kpis({ r, prior }: { r: EmployerReport; prior?: EmployerReport }) {
  const tiles = [
    <StatTile key="1" title="Eligible employees" value={String(r.eligible)} />,
    <StatTile key="2" title="Participating" value={percent(r.participationRate)} caption={`${r.participants.length} opted in to wellness sharing`} />,
    <StatTile key="3" title="Annual physical rate" value={percent(r.physicalRate)} caption={delta(r.physicalRate, prior?.physicalRate)} />,
    <StatTile key="4" title="Rising-risk trends caught" value={String(r.flaggedCount)} caption="Before crossing a clinical threshold" tint={colors.orange} />,
    <StatTile key="5" title="Follow-up care booked" value={percent(r.followUpRate)} caption={delta(r.followUpRate, prior?.followUpRate)} tint={colors.green} />,
    <StatTile key="6" title="ER visits / 100 participants" value={r.erPer100.toFixed(1)} caption={prior ? `${prior.erPer100.toFixed(1)} prior year` : undefined} tint={colors.red} />,
  ];
  return (
    <View style={{ gap: 12 }}>
      {[0, 2, 4].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>{tiles.slice(i, i + 2)}</View>
      ))}
    </View>
  );
}

function useWidth(): [number, (e: { nativeEvent: { layout: { width: number } } }) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
      {items.map(([label, color]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <T size={font.caption} color={colors.secondary}>{label}</T>
        </View>
      ))}
    </View>
  );
}

function QuarterlyChart({ r }: { r: EmployerReport }) {
  const [width, onLayout] = useWidth();
  const height = 200;
  const plotH = height - 22;
  const max = Math.max(1, ...r.quarters.flatMap((q) => [q.flagged, q.followUps]));
  const niceMax = Math.ceil(max / 5) * 5;
  const left = 26;
  const group = (width - left) / r.quarters.length;
  const barW = Math.min(22, group / 3);
  const y = (v: number) => plotH - (v / niceMax) * (plotH - 8);

  return (
    <Card>
      <SectionHeader title="Trend flags by quarter" subtitle="Employees whose readings were trending toward a threshold, and how many booked care" />
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {[0, niceMax / 2, niceMax].map((v) => (
              <React.Fragment key={v}>
                <Line x1={left} x2={width} y1={y(v)} y2={y(v)} stroke={colors.separator} strokeWidth={0.5} />
                <SvgText fontFamily={svgFontFamily} x={0} y={y(v) + 4} fill={colors.secondary} fontSize={10}>{String(v)}</SvgText>
              </React.Fragment>
            ))}
            {r.quarters.map((q, i) => {
              const cx = left + group * i + group / 2;
              return (
                <React.Fragment key={q.quarter}>
                  <Rect x={cx - barW - 1} y={y(q.flagged)} width={barW} height={plotH - y(q.flagged)} rx={3} fill={colors.orange} />
                  <Rect x={cx + 1} y={y(q.followUps)} width={barW} height={plotH - y(q.followUps)} rx={3} fill={colors.brand} />
                  <SvgText fontFamily={svgFontFamily} x={cx} y={height - 4} fill={colors.secondary} fontSize={11} textAnchor="middle">{`Q${q.quarter}`}</SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <Legend items={[['Flagged', colors.orange], ['Follow-up booked', colors.brand]]} />
      {r.isYearToDate ? <T size={font.caption} color={colors.secondary}>Q4 not yet reported.</T> : null}
    </Card>
  );
}

function RiskMix({ r }: { r: EmployerReport }) {
  const total = Math.max(r.participants.length, 1);
  const rows: [string, [RiskBand, number][]][] = [
    ['Blood sugar (A1C)', r.distribution('a1c')],
    ['Blood pressure', r.distribution('bloodPressure')],
  ];
  return (
    <Card>
      <SectionHeader title="Population risk mix" subtitle="Share of participants in each band" />
      {rows.map(([label, dist]) => (
        <View key={label} style={{ gap: 4 }}>
          <T size={font.caption} color={colors.secondary}>{label}</T>
          <View style={styles.stack}>
            {dist.map(([band, n]) => (
              <View key={band} style={{ flex: n / total, backgroundColor: riskColor(band) }} />
            ))}
          </View>
        </View>
      ))}
      <Legend items={allRiskBands.map((b) => [b, riskColor(b)] as [string, string])} />
    </Card>
  );
}

function YearOverYear({ reports }: { reports: EmployerReport[] }) {
  const [width, onLayout] = useWidth();
  const height = 180;
  const plotH = height - 22;
  const left = 34;
  const right = 20;
  const x = (i: number) => left + (i / (reports.length - 1)) * (width - left - right);
  const y = (v: number) => 6 + (1 - v) * (plotH - 6);
  const series: [string, string, number[]][] = [
    ['Annual physicals', colors.brand, reports.map((r) => r.physicalRate)],
    ['Follow-up booked', colors.green, reports.map((r) => r.followUpRate)],
  ];
  return (
    <Card>
      <SectionHeader title="Program impact since launch" subtitle="Wellness program started Jan 2024" />
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((v) => (
              <React.Fragment key={v}>
                <Line x1={left} x2={width} y1={y(v)} y2={y(v)} stroke={colors.separator} strokeWidth={0.5} />
                <SvgText fontFamily={svgFontFamily} x={0} y={y(v) + 4} fill={colors.secondary} fontSize={10}>{percent(v)}</SvgText>
              </React.Fragment>
            ))}
            {reports.map((r, i) => (
              <SvgText fontFamily={svgFontFamily} key={r.year} x={x(i)} y={height - 4} fill={colors.secondary} fontSize={11} textAnchor="middle">{String(r.year)}</SvgText>
            ))}
            {series.map(([label, color, values]) => (
              <React.Fragment key={label}>
                <Path d={values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')} stroke={color} strokeWidth={2} fill="none" />
                {values.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={4} fill={color} />)}
              </React.Fragment>
            ))}
          </Svg>
        ) : null}
      </View>
      <Legend items={series.map(([l, c]) => [l, c] as [string, string])} />
    </Card>
  );
}

function DepartmentTable({ r }: { r: EmployerReport }) {
  return (
    <Card>
      <SectionHeader
        title="By department"
        subtitle={`Cells with fewer than ${minimumCellSize} participants are suppressed to prevent re-identification`}
      />
      <View style={styles.tableRow}>
        <T size={font.caption} weight="600" color={colors.secondary} style={styles.deptCol}>Department</T>
        <T size={font.caption} weight="600" color={colors.secondary} style={styles.numCol}>n</T>
        <T size={font.caption} weight="600" color={colors.secondary} style={styles.numCol}>Physicals</T>
        <T size={font.caption} weight="600" color={colors.secondary} style={styles.numCol}>Flagged</T>
      </View>
      <Divider />
      {r.departments.map((d) => (
        <View key={d.name} style={styles.tableRow}>
          <T style={styles.deptCol}>{d.name}</T>
          {d.suppressed ? (
            <>
              <T color={colors.secondary} style={styles.numCol}>{`<${minimumCellSize}`}</T>
              <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                <Ionicons name="eye-off-outline" size={13} color={colors.secondary} />
                <T size={font.caption} color={colors.secondary}>Suppressed</T>
              </View>
            </>
          ) : (
            <>
              <T style={styles.numCol}>{String(d.participants)}</T>
              <T style={styles.numCol}>{d.physicalRate !== undefined ? percent(d.physicalRate) : '-'}</T>
              <T style={styles.numCol}>{d.flaggedRate !== undefined ? percent(d.flaggedRate) : '-'}</T>
            </>
          )}
        </View>
      ))}
    </Card>
  );
}

function Recommendations({ r, prior }: { r: EmployerReport; prior?: EmployerReport }) {
  const visible = r.departments.filter((d) => !d.suppressed);
  const lowest = visible.reduce<typeof visible[number] | undefined>(
    (min, d) => (!min || (d.physicalRate ?? 0) < (min.physicalRate ?? 0) ? d : min), undefined);
  const highestFlag = visible.reduce<typeof visible[number] | undefined>(
    (max, d) => (!max || (d.flaggedRate ?? 0) > (max.flaggedRate ?? 0) ? d : max), undefined);
  const items: string[] = [];
  if (lowest?.physicalRate !== undefined) {
    items.push(`${lowest.name} has the lowest physical rate (${percent(lowest.physicalRate)}). Consider on-site screening days or shift-friendly clinic hours.`);
  }
  if (highestFlag?.flaggedRate !== undefined) {
    items.push(`${highestFlag.name} shows the most rising-risk trends (${percent(highestFlag.flaggedRate)} of participants). A blood pressure and nutrition program would reach the most people there.`);
  }
  items.push(`${r.flaggedCount - r.followUpCount} flagged employees have not booked follow-up care. ChartLine sends them reminders directly. You are never told who they are.`);
  if (prior && r.followUpRate > prior.followUpRate) {
    items.push(`Follow-up booking rose from ${percent(prior.followUpRate)} to ${percent(r.followUpRate)} after in-app booking launched.`);
  }
  return (
    <Card>
      <SectionHeader title="Recommendations" />
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Ionicons name="bulb" size={17} color={colors.yellow} />
          <T style={{ flex: 1 }}>{item}</T>
        </View>
      ))}
    </Card>
  );
}

function summary(r: EmployerReport): string {
  return [
    `${employerName}: ${r.year} Health Insights (ChartLine Health, SYNTHETIC DEMO)`,
    `Eligible employees: ${r.eligible}`,
    `Participation: ${percent(r.participationRate)} (${r.participants.length})`,
    `Annual physical rate: ${percent(r.physicalRate)}`,
    `Rising-risk trends caught early: ${r.flaggedCount}`,
    `Follow-up care booked: ${percent(r.followUpRate)}`,
    `ER visits per 100 participants: ${r.erPer100.toFixed(1)}`,
    `De-identified; groups under ${minimumCellSize} suppressed.`,
  ].join('\n');
}

const styles = StyleSheet.create({
  header: {
    padding: 18,
    gap: 10,
    borderRadius: 20,
    backgroundColor: 'rgb(28, 36, 58)',
  },
  headerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stack: { flexDirection: 'row', height: 18, borderRadius: 5, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  deptCol: { flex: 2 },
  numCol: { flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
