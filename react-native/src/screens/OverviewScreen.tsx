import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradientCircle } from '../components/gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BrandHeader, Button, Card, DemoBanner, Divider, Label, Screen, T, severityColor,
} from '../components/ui';
import { ShareReportButton } from '../report/ShareReportSheet';
import { ageOn, fullDate, shortDate, time } from '../format';
import { allRecipients, recipientInfo, severityInfo } from '../models';
import { useStore } from '../store';
import { colors, font } from '../theme';
import type { TabParamList } from '../../App';

export function OverviewScreen() {
  const store = useStore();
  const nav = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const p = store.patient;
  const next = store.appointments[0];

  return (
    <Screen>
      <BrandHeader />
      <DemoBanner />

      <View style={styles.patientCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <LinearGradientCircle size={56}>
            <T size={font.title2} weight="700" color={colors.brandDeep}>JR</T>
          </LinearGradientCircle>
          <View style={{ gap: 2 }}>
            <T size={font.title2} weight="700">{p.name}</T>
            <T color="rgba(255,255,255,0.85)">{`${ageOn(p.dateOfBirth, new Date())} · ${p.sex} · MRN ${p.mrn}`}</T>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <InfoColumn title="Primary care" value={p.primaryCare} />
          <InfoColumn title="Coverage" value={p.plan} />
        </View>
      </View>

      <Card>
        <View style={styles.row}>
          <Label icon="analytics-outline" size={font.headline} weight="600">Trends flagged by ChartLine</Label>
          <T size={font.headline} weight="600" color={colors.secondary}>{store.flags.length}</T>
        </View>
        {store.flags.map((flag) => {
          const appt = store.appointmentFor(flag.kind);
          return (
            <View key={flag.kind} style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name={severityInfo[flag.severity].icon as never} size={18} color={severityColor(flag.severity)} />
              <View style={{ flex: 1, gap: 2 }}>
                <T weight="500">{flag.headline}</T>
                {appt ? (
                  <Label icon="checkmark-circle" size={font.caption} color={colors.green}>{`Follow-up booked ${shortDate(appt.date)}`}</Label>
                ) : (
                  <T size={font.caption} color={colors.secondary}>No follow-up scheduled</T>
                )}
              </View>
            </View>
          );
        })}
        <Button title="Review & book follow-up care" onPress={() => nav.navigate('Care')} />
      </Card>

      <Card>
        <Label icon="calendar-outline" size={font.headline} weight="600">Upcoming</Label>
        {next ? (
          <View style={{ gap: 2 }}>
            <T weight="600">{next.provider.name}</T>
            <T size={font.caption} color={colors.secondary}>{`${next.provider.specialty} · ${fullDate(next.date)} at ${time(next.date)}`}</T>
          </View>
        ) : (
          <T color={colors.secondary}>Nothing booked yet.</T>
        )}
      </Card>

      <Card>
        <Label icon="document-text" size={font.headline} weight="600">Seeing a new doctor?</Label>
        <T color={colors.secondary}>
          Send your full health report, with every lab, trend and visit so far, to any provider. You choose what goes in.
        </T>
        <ShareReportButton variant="prominent" />
      </Card>

      <Card>
        <Label icon="lock-closed-outline" size={font.headline} weight="600">Who can see your data</Label>
        {allRecipients.map((r) => {
          const count = store.grants[r].size;
          const info = recipientInfo[r];
          return (
            <View key={r} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name={info.icon as never} size={18} color={colors.brand} style={{ width: 24 }} />
                <T>{info.title}</T>
              </View>
              <T size={font.caption} weight="500" color={count === 0 ? colors.secondary : colors.brand}>
                {count === 0 ? 'Off' : info.isAggregateOnly ? 'Aggregate' : `${count} categories`}
              </T>
            </View>
          );
        })}
        <Divider />
        <Button title="Manage consent" variant="bordered" onPress={() => nav.navigate('Consent')} />
      </Card>
    </Screen>
  );
}

function InfoColumn({ title, value }: { title: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T size={font.caption2} weight="600" color="rgba(255,255,255,0.7)">{title.toUpperCase()}</T>
      <T weight="500">{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  patientCard: {
    padding: 18,
    gap: 14,
    borderRadius: 20,
    backgroundColor: 'rgb(33, 51, 92)',
    borderWidth: 1,
    borderColor: 'rgba(92, 191, 232, 0.6)',
  },
});
