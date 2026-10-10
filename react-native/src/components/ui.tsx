import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image, Pressable, ScrollView, StyleProp, StyleSheet, Switch, Text, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RiskBand, Severity, severityInfo } from '../models';
import { colors, font } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const severityColor = (s: Severity) => (s === 1 ? colors.yellow : s === 2 ? colors.orange : colors.red);
export const riskColor = (b: RiskBand) => (b === 'Normal' ? colors.green : b === 'Elevated' ? colors.orange : colors.red);

/** Navy scrolling screen with an iOS-style large title. */
export function Screen({
  title, right, children,
}: { title?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        {title ? (
          <View style={styles.titleRow}>
            <Text style={styles.largeTitle}>{title}</Text>
            {right}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function T({
  children, style, size = font.subheadline, weight, color = colors.text, numberOfLines,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontSize: size, fontWeight: weight, color }, style]}>
      {children}
    </Text>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 2, alignSelf: 'stretch' }}>
      <T size={font.title3} weight="700">{title}</T>
      {subtitle ? <T size={font.footnote} color={colors.secondary}>{subtitle}</T> : null}
    </View>
  );
}

export function Label({
  icon, children, color = colors.text, iconColor, size = font.subheadline, weight,
}: {
  icon: IconName;
  children: React.ReactNode;
  color?: string;
  iconColor?: string;
  size?: number;
  weight?: TextStyle['fontWeight'];
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Ionicons name={icon} size={size + 2} color={iconColor ?? color} style={{ marginTop: 1 }} />
      <T size={size} weight={weight} color={color} style={{ flexShrink: 1 }}>{children}</T>
    </View>
  );
}

export function DemoBanner() {
  return (
    <View style={styles.banner}>
      <Ionicons name="flask-outline" size={12} color={colors.secondary} />
      <T size={font.caption2} weight="600" color={colors.secondary}>Synthetic demo data. Not real patient information</T>
    </View>
  );
}

/** The full ChartLine Health logo (mark, wordmark and "HEALTH"). */
export function BrandHeader() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }} accessible accessibilityLabel="ChartLine Health">
      <Image source={require('../../assets/logo.png')} style={{ width: 170, height: 94 }} resizeMode="contain" />
    </View>
  );
}

export function SeverityPill({ severity }: { severity: Severity }) {
  const c = severityColor(severity);
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(c, 0.15) }]}>
      <Ionicons name={severityInfo[severity].icon as IconName} size={12} color={c} />
      <T size={font.caption} weight="600" color={c}>{severityInfo[severity].label}</T>
    </View>
  );
}

export function StatTile({
  title, value, caption, tint = colors.brand,
}: { title: string; value: string; caption?: string; tint?: string }) {
  return (
    <View style={styles.tile}>
      <T size={font.caption} color={colors.secondary}>{title}</T>
      <T size={font.title2} weight="700" color={tint} style={{ fontVariant: ['tabular-nums'] }}>{value}</T>
      {caption ? <T size={font.caption2} color={colors.secondary}>{caption}</T> : null}
    </View>
  );
}

export function RestrictedRow({ title, reason }: { title: string; reason: string }) {
  return (
    <View style={styles.restricted}>
      <Ionicons name="lock-closed" size={16} color={colors.secondary} />
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="600">{title} hidden</T>
        <T size={font.caption} color={colors.secondary}>{reason}</T>
      </View>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, alignSelf: 'stretch' }} />;
}

export function Button({
  title, icon, onPress, variant = 'prominent', tint = colors.brand, disabled, style,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'prominent' | 'bordered' | 'plain' | 'destructive';
  tint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'prominent' ? tint : variant === 'bordered' ? withAlpha(tint, 0.15) : 'transparent';
  const fg = variant === 'prominent' ? '#FFFFFF' : variant === 'destructive' ? colors.red : tint;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        variant === 'plain' || variant === 'destructive' ? { paddingHorizontal: 0, alignSelf: 'flex-start' } : null,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
      <T weight={variant === 'prominent' ? '600' : '500'} color={fg} size={variant === 'destructive' ? font.caption : font.subheadline}>
        {title}
      </T>
    </Pressable>
  );
}

export function Segmented<V extends string | number>({
  options, value, onChange,
}: { options: { label: string; value: V }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.segment, selected && styles.segmentSelected]}>
            <T size={font.footnote} weight={selected ? '600' : '400'}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A settings-style row with a switch, used on the Consent and Share screens. */
export function ToggleRow({
  icon, title, subtitle, value, onChange, sensitive,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  sensitive?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <Ionicons name={icon} size={20} color={colors.brand} style={{ width: 26 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <T size={font.body}>{title}</T>
          {sensitive ? <Ionicons name="shield" size={13} color={colors.purple} /> : null}
        </View>
        {subtitle ? <T size={font.caption2} color={colors.secondary}>{subtitle}</T> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.tertiary }}
        thumbColor="#FFFFFF"
        {...({ activeThumbColor: '#FFFFFF' } as object)}
      />
    </View>
  );
}

/** Grouped list section like a SwiftUI Form section. */
export function Section({
  header, footer, children,
}: { header?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      {header ? (
        typeof header === 'string'
          ? <T size={font.footnote} color={colors.secondary} style={{ paddingHorizontal: 16 }}>{header.toUpperCase()}</T>
          : header
      ) : null}
      <View style={styles.section}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 16 }} /> : null}
            <View style={{ paddingHorizontal: 16, paddingVertical: 11 }}>{child}</View>
          </View>
        ))}
      </View>
      {footer ? <T size={font.footnote} color={colors.secondary} style={{ paddingHorizontal: 16 }}>{footer}</T> : null}
    </View>
  );
}

/** Converts "rgb(r, g, b)" or "#RRGGBB" to rgba with the given alpha. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const m = color.match(/\d+(\.\d+)?/g);
  if (!m) return color;
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${alpha})`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  screenContent: { padding: 16, gap: 16, paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  largeTitle: { fontSize: 34, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 12,
    alignSelf: 'stretch',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 214, 10, 0.18)',
    alignSelf: 'stretch',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  tile: {
    flex: 1,
    gap: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  restricted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(235, 235, 245, 0.3)',
    alignSelf: 'stretch',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
    borderRadius: 9,
    padding: 2,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 7 },
  segmentSelected: { backgroundColor: 'rgba(99, 99, 102, 1)' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { backgroundColor: colors.cardBackground, borderRadius: 12, overflow: 'hidden' },
});
