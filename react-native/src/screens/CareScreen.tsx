import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LabTrendChart } from '../components/LabTrendChart';
import {
  Button, Card, DemoBanner, Label, Screen, Section, SectionHeader, SeverityPill, T, ToggleRow, severityColor,
} from '../components/ui';
import * as Demo from '../demoData';
import { fullDate, sameDay, time } from '../format';
import { Appointment, Provider, TrendFlag, categoryInfo, formatLab, labInfo } from '../models';
import { useStore } from '../store';
import { colors, font } from '../theme';

export function CareScreen() {
  const store = useStore();
  const [bookingFlag, setBookingFlag] = useState<TrendFlag | null>(null);

  return (
    <Screen title="Care">
      <DemoBanner />
      <SectionHeader title="Flagged trends" subtitle="ChartLine watches every reading over time, not just the latest one." />
      {store.flags.map((flag) => (
        <FlagCard key={flag.kind} flag={flag} appointment={store.appointmentFor(flag.kind)} onBook={() => setBookingFlag(flag)} />
      ))}

      <SectionHeader title="Appointments" />
      {store.appointments.length === 0 ? (
        <Card>
          <T color={colors.secondary}>No upcoming visits. Book a follow-up from a flagged trend above.</T>
        </Card>
      ) : null}
      {store.appointments.map((appt) => (
        <AppointmentCard key={appt.id} appointment={appt} onCancel={() => store.cancel(appt)} />
      ))}

      <Modal visible={bookingFlag !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBookingFlag(null)}>
        {bookingFlag ? <BookingSheet flag={bookingFlag} onClose={() => setBookingFlag(null)} /> : null}
      </Modal>
    </Screen>
  );
}

function FlagCard({ flag, appointment, onBook }: { flag: TrendFlag; appointment?: Appointment; onBook: () => void }) {
  const store = useStore();
  const series = store.series(flag.kind);
  const info = labInfo[flag.kind];
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SeverityPill severity={flag.severity} />
        <T size={font.caption} color={colors.secondary}>{info.specialty}</T>
      </View>
      <T size={font.headline} weight="600">{flag.headline}</T>
      {series ? <LabTrendChart series={series} flag={flag} height={140} /> : null}
      <T size={font.caption} color={colors.secondary}>{flag.detail}</T>
      {appointment ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          <View>
            <T weight="600">{`Booked with ${appointment.provider.name}`}</T>
            <T size={font.caption}>{`${fullDate(appointment.date)} at ${time(appointment.date)}`}</T>
          </View>
        </View>
      ) : (
        <Button
          title={`Book ${info.specialty} follow-up`}
          icon="calendar-outline"
          tint={flag.severity === 1 ? colors.brand : severityColor(flag.severity)}
          onPress={onBook}
        />
      )}
    </Card>
  );
}

function AppointmentCard({ appointment, onCancel }: { appointment: Appointment; onCancel: () => void }) {
  const d = appointment.date;
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 54, alignItems: 'center' }}>
          <T size={font.caption} weight="700" color={colors.red}>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</T>
          <T size={font.title} weight="700">{String(d.getDate())}</T>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T size={font.headline} weight="600">{appointment.provider.name}</T>
          <T>{`${appointment.provider.specialty} · ${time(d)}`}</T>
          <T size={font.caption} color={colors.secondary}>{appointment.provider.location}</T>
          <T size={font.caption} style={{ marginTop: 4 }}>{appointment.reason}</T>
          {appointment.sharedTrend && appointment.linkedFlag ? (
            <Label icon="paper-plane" size={font.caption2} color={colors.brand}>
              {`${labInfo[appointment.linkedFlag].shortName} trend shared with provider`}
            </Label>
          ) : null}
        </View>
      </View>
      <Button title="Cancel appointment" variant="destructive" onPress={onCancel} />
    </Card>
  );
}

function BookingSheet({ flag, onClose }: { flag: TrendFlag; onClose: () => void }) {
  const store = useStore();
  const info = labInfo[flag.kind];
  const providers = Demo.providers[info.specialty] ?? [];
  const [provider, setProvider] = useState<Provider | undefined>(providers[0]);
  const [day, setDay] = useState<Date>();
  const [slot, setSlot] = useState<Date>();
  const [reason, setReason] = useState('');
  const [shareTrend, setShareTrend] = useState(true);

  useEffect(() => {
    setReason(
      `Follow-up on flagged ${info.shortName} trend: latest ${formatLab(flag.kind, flag.latest)} ${info.unit}, projected ${formatLab(flag.kind, flag.projected)} ${info.unit} in 12 months.`,
    );
  }, [flag, info]);

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const result: Date[] = [];
    for (let i = 1; i <= 21 && result.length < 10; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) result.push(d);
    }
    return result;
  }, []);

  const slots = (d: Date, p: Provider) => {
    const times: [number, number][] = [[8, 30], [9, 15], [10, 45], [13, 0], [14, 30], [15, 45]];
    const dayIndex = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
    return times
      .map(([h, m], i) => {
        // Deterministically mark some slots as already taken.
        if ((dayIndex + i + p.name.length) % 3 === 0) return undefined;
        const s = new Date(d);
        s.setHours(h, m, 0, 0);
        return s;
      })
      .filter((s): s is Date => s !== undefined);
  };

  const book = () => {
    if (!provider || !slot) return;
    store.book(provider, slot, reason, flag.kind, shareTrend);
    onClose();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.appBackground }}>
      <View style={styles.navBar}>
        <Button title="Cancel" variant="plain" onPress={onClose} />
        <T size={font.headline} weight="600">{`Book ${info.specialty}`}</T>
        <Button title="Book" variant="plain" disabled={!provider || !slot} onPress={book} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <Section header="Why ChartLine recommends this">
          <SeverityPill severity={flag.severity} />
          <T weight="600">{flag.headline}</T>
        </Section>

        <Section header="Provider">
          {providers.map((p) => (
            <Pressable key={p.name} onPress={() => { setProvider(p); setSlot(undefined); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <T size={font.body}>{p.name}</T>
                <T size={font.caption} color={colors.secondary}>{p.location}</T>
              </View>
              <Label icon="star" size={font.caption} color={colors.orange}>{p.rating.toFixed(1)}</Label>
              <Ionicons
                name={provider?.name === p.name ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={provider?.name === p.name ? colors.brand : colors.secondary}
              />
            </Pressable>
          ))}
        </Section>

        {provider ? (
          <Section header="Date">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((d) => {
                const selected = day ? sameDay(day, d) : false;
                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => { setDay(d); setSlot(undefined); }}
                    style={[styles.day, { backgroundColor: selected ? colors.brand : colors.appBackground }]}
                  >
                    <T size={font.caption2}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</T>
                    <T size={font.headline} weight="600">{String(d.getDate())}</T>
                    <T size={font.caption2}>{d.toLocaleDateString('en-US', { month: 'short' })}</T>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Section>
        ) : null}

        {provider && day ? (
          <Section header="Available times">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {slots(day, provider).map((s) => {
                const selected = slot?.getTime() === s.getTime();
                return (
                  <Pressable
                    key={s.toISOString()}
                    onPress={() => setSlot(s)}
                    style={[styles.slot, { backgroundColor: selected ? colors.brand : 'rgba(66, 145, 245, 0.12)' }]}
                  >
                    <T weight="500" color={selected ? '#FFFFFF' : colors.brand}>{time(s)}</T>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        ) : null}

        <Section header="Reason for visit">
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            style={{ color: colors.text, fontSize: font.body, minHeight: 60 }}
            placeholder="Reason"
            placeholderTextColor={colors.tertiary}
          />
        </Section>

        <Section
          footer={`Shares ${flag.readings} readings and the projection with this provider only. This grants “${categoryInfo[info.category].title}” to Referred Specialists and is logged in your access history.`}
        >
          <ToggleRow icon="paper-plane-outline" title={`Send ${info.shortName} trend packet to provider`} value={shareTrend} onChange={setShareTrend} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  day: { width: 52, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 1 },
  slot: { width: '31%', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
});
