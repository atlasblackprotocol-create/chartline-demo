import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Section, T, ToggleRow } from '../components/ui';
import { confirm } from '../components/confirm';
import { DataCategory, allCategories, categoryInfo, labInfo } from '../models';
import { useStore } from '../store';
import { colors, font } from '../theme';
import { HealthReportOptions, buildReport, reportHtml, standardOptions } from './healthReport';
import { ReportPreview } from './ReportPreview';

/** Entry point used on the Overview and Records screens. */
export function ShareReportButton({ variant }: { variant: 'prominent' | 'icon' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'icon' ? (
        <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="Share with a doctor">
          <Ionicons name="share-outline" size={24} color={colors.brand} />
        </Pressable>
      ) : (
        <Button title="Share with a doctor" icon="share-outline" onPress={() => setOpen(true)} />
      )}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        {open ? <ShareReportSheet onClose={() => setOpen(false)} /> : null}
      </Modal>
    </>
  );
}

/**
 * Lets the employee build a copy of their record for any doctor, inside or outside
 * ChartLine. Step one picks what goes in, step two previews the exact report before it
 * leaves the phone.
 */
function ShareReportSheet({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [options, setOptions] = useState<HealthReportOptions>(standardOptions);
  const [html, setHtml] = useState<string | null>(null);

  /** Only offer categories that actually have something in them. */
  const available = useMemo(() => {
    const present = new Set<DataCategory>([
      ...store.labs.map((s) => labInfo[s.kind].category),
      ...store.encounters.map((e) => e.category),
      ...(store.medications.length ? (['medications'] as DataCategory[]) : []),
    ]);
    return allCategories.filter((c) => present.has(c));
  }, [store]);

  const nothingSelected =
    !available.some((c) => options.categories.has(c)) && !options.includeFlags && !options.includeCarePlan;

  const setCategory = (category: DataCategory, included: boolean) => {
    const apply = () => setOptions((o) => {
      const next = new Set(o.categories);
      if (included) next.add(category);
      else next.delete(category);
      return { ...o, categories: next };
    });
    const info = categoryInfo[category];
    if (included && info.isSensitive) {
      confirm(
        'Include sensitive information?',
        `${info.title} has extra legal protection. ${info.protectionNote ?? ''} Once this report is sent, the recipient keeps their copy.`,
        `Include ${info.title}`,
        apply,
      );
    } else {
      apply();
    }
  };

  const summary = (category: DataCategory) => {
    if (category === 'labs' || category === 'vitals') {
      const series = store.labs.filter((s) => labInfo[s.kind].category === category);
      const readings = series.reduce((n, s) => n + s.points.length, 0);
      return `${series.map((s) => labInfo[s.kind].shortName).join(', ')} · ${readings} readings`;
    }
    if (category === 'medications') return `${store.medications.length} active prescriptions`;
    const visits = store.encounters.filter((e) => e.category === category).length;
    return `${visits} visit${visits === 1 ? '' : 's'}`;
  };

  if (html) {
    return (
      <PreviewStep
        html={html}
        onBack={() => setHtml(null)}
        onShared={(destination) => {
          store.logReportShared(options, destination);
          onClose();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.sheet}>
      <View style={styles.navBar}>
        <Button title="Cancel" variant="plain" onPress={onClose} />
        <T size={font.headline} weight="600">Share with a Doctor</T>
        <Button
          title="Preview"
          variant="plain"
          disabled={nothingSelected}
          onPress={() => setHtml(reportHtml(buildReport(store, options)))}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
        <Section>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="document-text-outline" size={20} color={colors.brand} />
            <T style={{ flex: 1 }}>
              Bring your whole history to any appointment, even with a doctor who has never heard of ChartLine. You pick what goes in and see the report before it is sent.
            </T>
          </View>
        </Section>

        <Section header="Who is this for?" footer="Optional. Printed on the report and noted in your access log.">
          <TextInput
            value={options.preparedFor}
            onChangeText={(preparedFor) => setOptions((o) => ({ ...o, preparedFor }))}
            placeholder="Dr. Lee, Bayou City Clinic"
            placeholderTextColor={colors.tertiary}
            autoCapitalize="words"
            style={{ color: colors.text, fontSize: font.body }}
          />
        </Section>

        <Section
          header="Your record"
          footer="Protected categories stay out unless you add them. Your consent settings for other recipients do not change."
        >
          {available.map((c) => (
            <ToggleRow
              key={c}
              icon={categoryInfo[c].icon as never}
              title={categoryInfo[c].title}
              subtitle={summary(c)}
              sensitive={categoryInfo[c].isSensitive}
              value={options.categories.has(c)}
              onChange={(v) => setCategory(c, v)}
            />
          ))}
        </Section>

        <Section header="ChartLine insights">
          <ToggleRow
            icon="analytics-outline"
            title="Flagged trends"
            subtitle={`${store.flags.length} trends with 12-month projections`}
            value={options.includeFlags}
            onChange={(includeFlags) => setOptions((o) => ({ ...o, includeFlags }))}
          />
          <ToggleRow
            icon="calendar-outline"
            title="Care plan"
            subtitle={store.appointments.length ? `${store.appointments.length} booked visits and open follow-ups` : 'Open follow-ups'}
            value={options.includeCarePlan}
            onChange={(includeCarePlan) => setOptions((o) => ({ ...o, includeCarePlan }))}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The exact report the doctor will receive, with the final confirmation to send it. */
function PreviewStep({
  html, onBack, onShared,
}: { html: string; onBack: () => void; onShared: (destination: string) => void }) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const destination = await sharePdf(html);
      if (destination) onShared(destination);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.sheet}>
      <View style={styles.navBar}>
        <Button title="Back" icon="chevron-back" variant="plain" onPress={onBack} />
        <T size={font.headline} weight="600">Preview</T>
        <View style={{ width: 60 }} />
      </View>
      <View style={{ flex: 1, backgroundColor: colors.appBackground }}>
        <ReportPreview html={html} />
      </View>
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.text} />
          <T weight="600">Check it over before you send</T>
        </View>
        <T size={font.caption} color={colors.secondary}>
          Once shared, this copy leaves ChartLine and belongs to whoever receives it. You can't revoke it later, but the share is logged in your access history.
        </T>
        <Button title={busy ? 'Preparing…' : 'Share Report'} icon="share-outline" disabled={busy} onPress={share} style={{ paddingVertical: 14 }} />
      </View>
    </SafeAreaView>
  );
}

/**
 * Renders the PDF and opens the system share sheet: AirDrop, Mail, Messages, Print,
 * Save to Files on iOS; Gmail, Drive, Nearby Share and the rest on Android.
 * Resolves with where it went, or null if the employee backed out.
 */
async function sharePdf(html: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Browsers have no share sheet for generated files; the print dialog saves a PDF.
    await Print.printAsync({ html });
    return 'Print';
  }

  const { uri } = await Print.printToFileAsync({ html });

  if (Platform.OS === 'ios') {
    // React Native's Share reports whether the share completed and to which app.
    const result = await Share.share({ url: uri }, { subject: 'Personal Health Report' });
    if (result.action !== Share.sharedAction) return null;
    return activityName(result.activityType);
  }

  // Android's share intent does not report completion, so the share is logged once
  // the chooser closes.
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share health report', UTI: 'com.adobe.pdf' });
  return 'the share sheet';
}

function activityName(type?: string | null): string {
  if (!type) return 'the share sheet';
  if (type.includes('AirDrop')) return 'AirDrop';
  if (type.includes('Mail')) return 'Mail';
  if (type.includes('Message')) return 'Messages';
  if (type.includes('Print')) return 'Print';
  if (type.includes('CopyToPasteboard')) return 'Copy';
  if (type.toLowerCase().includes('files') || type.includes('DocumentManager')) return 'Files';
  return 'the share sheet';
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.appBackground },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  footer: { padding: 16, gap: 10, backgroundColor: colors.cardBackground },
});
