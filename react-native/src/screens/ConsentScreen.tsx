import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { confirm } from '../components/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, DemoBanner, Screen, Section, T, ToggleRow } from '../components/ui';
import { minimumCellSize } from '../employerReport';
import { dateTime } from '../format';
import { AuditEvent, DataCategory, Recipient, allRecipients, categoryInfo, recipientInfo } from '../models';
import { useStore } from '../store';
import { colors, font } from '../theme';

export function ConsentScreen() {
  const store = useStore();
  const [showHistory, setShowHistory] = useState(false);

  const onToggle = (recipient: Recipient, category: DataCategory, granted: boolean) => {
    const info = categoryInfo[category];
    if (granted && info.isSensitive) {
      confirm(
        'Share sensitive information?',
        `${info.title} has extra legal protection. ${info.protectionNote ?? ''} You can revoke this at any time.`,
        `Share ${info.title} with ${recipientInfo[recipient].title}`,
        () => store.setConsent(recipient, category, true),
      );
    } else {
      store.setConsent(recipient, category, granted);
    }
  };

  return (
    <Screen title="Consent">
      <DemoBanner />
      <T color={colors.secondary}>
        You decide who sees each part of your record. Every change is logged, and you can revoke access at any time.
      </T>

      {allRecipients.map((recipient) => {
        const info = recipientInfo[recipient];
        return (
          <Section
            key={recipient}
            header={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
                <Ionicons name={info.icon as never} size={18} color={colors.secondary} />
                <View>
                  <T size={font.footnote} color={colors.secondary}>{info.title.toUpperCase()}</T>
                  <T size={font.caption2} color={colors.secondary}>{info.subtitle}</T>
                </View>
              </View>
            }
            footer={
              recipient === 'employerWellness'
                ? `Your employer never sees your name, diagnoses or results. Only counts across consenting employees, and only when a group has ${minimumCellSize}+ people. Behavioral, reproductive and substance-use data can never be shared here.`
                : undefined
            }
          >
            {info.allowedCategories.map((category) => (
              <ToggleRow
                key={category}
                icon={categoryInfo[category].icon as never}
                title={categoryInfo[category].title}
                subtitle={categoryInfo[category].protectionNote}
                sensitive={categoryInfo[category].isSensitive}
                value={store.hasConsent(recipient, category)}
                onChange={(v) => onToggle(recipient, category, v)}
              />
            ))}
            {store.grants[recipient].size > 0 ? (
              <Button title="Revoke all" variant="destructive" onPress={() => store.revokeAll(recipient)} />
            ) : null}
          </Section>
        );
      })}

      <Section header="Access log">
        {store.audit.slice(0, 6).map((e) => <AuditRow key={e.id} event={e} />)}
        <Pressable onPress={() => setShowHistory(true)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T color={colors.brand}>{`Full access history (${store.audit.length})`}</T>
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        </Pressable>
      </Section>

      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.appBackground }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <T size={font.headline} weight="600">Access History</T>
            <Button title="Done" variant="plain" onPress={() => setShowHistory(false)} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Section>{store.audit.map((e) => <AuditRow key={e.id} event={e} />)}</Section>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}

export function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Ionicons name={event.icon as never} size={18} color={colors.brand} style={{ width: 22 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <T>{event.action}</T>
        <T size={font.caption} color={colors.secondary}>{`${event.actor} · ${dateTime(event.date)}`}</T>
      </View>
    </View>
  );
}
