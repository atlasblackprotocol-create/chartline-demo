import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { LabSeries, TrendFlag, formatLab, labInfo } from '../models';
import { colors, svgFontFamily } from '../theme';
import { severityColor } from './ui';

const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** A lab series with its reference band, concern threshold and (when flagged) a 12-month projection. */
export function LabTrendChart({ series, flag, height = 180 }: { series: LabSeries; flag?: TrendFlag; height?: number }) {
  const [width, setWidth] = useState(0);
  const info = labInfo[series.kind];
  const sorted = [...series.points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const projectionEnd = flag ? new Date(last.date.getFullYear() + 1, last.date.getMonth(), last.date.getDate()) : undefined;
  const values = [...sorted.map((p) => p.value), info.concernThreshold, ...(flag ? [flag.projected] : [])];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.15;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const axisHeight = 18;
  const plotH = height - axisHeight;
  const plotW = Math.max(width - 4, 1);
  const t0 = first.date.getTime();
  const t1 = (projectionEnd ?? last.date).getTime();
  const x = (d: Date) => 2 + ((d.getTime() - t0) / Math.max(t1 - t0, 1)) * plotW;
  const y = (v: number) => plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const path = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date)},${y(p.value)}`).join(' ');

  const years: number[] = [];
  for (let yr = first.date.getFullYear() + 1; new Date(yr, 0, 1).getTime() <= t1; yr++) years.push(yr);

  const threshold = (value: number, color: string, label: string) => (
    <React.Fragment key={label}>
      <Line x1={0} x2={width} y1={y(value)} y2={y(value)} stroke={color} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4,4" />
      <SvgText fontFamily={svgFontFamily} x={2} y={y(value) - 4} fill={color} fontSize={11}>{label}</SvgText>
    </React.Fragment>
  );

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {years.map((yr) => (
            <React.Fragment key={yr}>
              <Line x1={x(new Date(yr, 0, 1))} x2={x(new Date(yr, 0, 1))} y1={0} y2={plotH} stroke={colors.separator} strokeWidth={0.5} />
              {x(new Date(yr, 0, 1)) + 28 < width ? <SvgText fontFamily={svgFontFamily} x={x(new Date(yr, 0, 1)) + 3} y={height - 4} fill={colors.secondary} fontSize={10}>{String(yr)}</SvgText> : null}
            </React.Fragment>
          ))}
          {threshold(info.normalUpper, colors.green, `Normal ≤ ${formatLab(series.kind, info.normalUpper)}`)}
          {threshold(info.concernThreshold, colors.red, `${capitalize(info.concernLabel)} ≥ ${formatLab(series.kind, info.concernThreshold)}`)}
          {flag && projectionEnd ? (
            <Line
              x1={x(last.date)} y1={y(last.value)} x2={x(projectionEnd)} y2={y(flag.projected)}
              stroke={severityColor(flag.severity)} strokeWidth={2} strokeDasharray="6,4"
            />
          ) : null}
          <Path d={path} stroke={colors.brand} strokeWidth={2} fill="none" strokeLinejoin="round" />
          {sorted.map((p) => <Circle key={p.id} cx={x(p.date)} cy={y(p.value)} r={3.2} fill={colors.brand} />)}
        </Svg>
      ) : null}
    </View>
  );
}
