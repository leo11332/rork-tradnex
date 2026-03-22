import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Bell, BellRing, Clock, Plus, ShieldAlert, Trash2, TriangleAlert, Zap } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { ScreenShell } from '@/components/screen-shell';
import { tradnexTheme } from '@/constants/tradnex-theme';
import { TRADING_SESSIONS } from '@/constants/trading-sessions';
import { useTradnex } from '@/providers/tradnex-provider';
import type { CustomAlert, PreSessionAlertConfig, PreSessionSessionAlert } from '@/providers/tradnex-provider';
import type { TradingSessionId } from '@/constants/trading-sessions';

const SUGGESTION_MESSAGES: string[] = [
  'Vigilance requise — passez en mode observation.',
  'Seuil atteint — prenez un moment avant de continuer.',
];

const SESSION_ICONS: Record<TradingSessionId, string> = {
  tokyo: '🌏',
  london: '🇬🇧',
  newyork: '🇺🇸',
};

function PreSessionAlertCard({ config, onUpdate }: { config: PreSessionAlertConfig; onUpdate: (next: PreSessionAlertConfig) => void }) {
  const activeCount = useMemo(() => {
    return (config.tokyo.enabled ? 1 : 0) + (config.london.enabled ? 1 : 0) + (config.newyork.enabled ? 1 : 0);
  }, [config]);

  const toggleSession = useCallback((sessionId: TradingSessionId, value: boolean) => {
    const next = { ...config };
    next[sessionId] = { ...next[sessionId], enabled: value };
    onUpdate(next);
  }, [config, onUpdate]);

  const setMinutesBefore = useCallback((sessionId: TradingSessionId, minutes: 5 | 15) => {
    const next = { ...config };
    next[sessionId] = { ...next[sessionId], minutesBefore: minutes };
    onUpdate(next);
  }, [config, onUpdate]);

  return (
    <View style={psStyles.card}>
      <View style={psStyles.headerRow}>
        <View style={psStyles.headerLeft}>
          <Zap color={tradnexTheme.warning} size={18} />
          <View style={psStyles.headerTextWrap}>
            <Text style={psStyles.title}>Alerte pré-session</Text>
            <Text style={psStyles.subtitle}>
              {activeCount > 0 ? `${activeCount} session${activeCount > 1 ? 's' : ''} configurée${activeCount > 1 ? 's' : ''}` : 'Aucune session configurée'}
            </Text>
          </View>
        </View>
      </View>

      <View style={psStyles.sessionsWrap}>
        {TRADING_SESSIONS.map((session) => {
          const sessionConfig: PreSessionSessionAlert = config[session.id];
          return (
            <View key={session.id} style={psStyles.sessionBlock}>
              <View style={[psStyles.sessionRow, sessionConfig.enabled && psStyles.sessionRowActive]}>
                <Text style={psStyles.sessionEmoji}>{SESSION_ICONS[session.id]}</Text>
                <Text style={[psStyles.sessionLabel, sessionConfig.enabled && { color: tradnexTheme.textPrimary }]}>{session.label}</Text>
                <Switch
                  value={sessionConfig.enabled}
                  onValueChange={(value) => toggleSession(session.id, value)}
                  trackColor={{ false: '#2A2D36', true: session.labelColor }}
                  thumbColor={tradnexTheme.white}
                  testID={`ps-toggle-${session.id}`}
                />
              </View>

              {sessionConfig.enabled ? (
                <View style={psStyles.timeRow}>
                  <Clock color={tradnexTheme.textMuted} size={13} />
                  <Pressable
                    style={[psStyles.timePill, sessionConfig.minutesBefore === 5 && psStyles.timePillActive]}
                    onPress={() => setMinutesBefore(session.id, 5)}
                    testID={`ps-5min-${session.id}`}
                  >
                    <Text style={[psStyles.timePillText, sessionConfig.minutesBefore === 5 && psStyles.timePillTextActive]}>5 min avant</Text>
                  </Pressable>
                  <Pressable
                    style={[psStyles.timePill, sessionConfig.minutesBefore === 15 && psStyles.timePillActive]}
                    onPress={() => setMinutesBefore(session.id, 15)}
                    testID={`ps-15min-${session.id}`}
                  >
                    <Text style={[psStyles.timePillText, sessionConfig.minutesBefore === 15 && psStyles.timePillTextActive]}>15 min avant</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const psStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  headerTextWrap: {
    gap: 3,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
  },
  sessionsWrap: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 14,
  },
  sessionBlock: {
    gap: 8,
  },
  sessionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sessionRowActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sessionEmoji: {
    fontSize: 16,
  },
  sessionLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingLeft: 28,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timePillActive: {
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderColor: 'rgba(10,132,255,0.30)',
  },
  timePillText: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  timePillTextActive: {
    color: tradnexTheme.accent,
  },
});

export default function NotificationsScreen() {
  const {
    healthConsentAccepted,
    isHydrating,
    settings,
    latestHealth,
    pendingAlerts,
    updateSettings,
    addCustomAlert,
    removeCustomAlert,
    toggleCustomAlert,
  } = useTradnex();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newStressThreshold, setNewStressThreshold] = useState<number>(65);
  const [newSleepThreshold, setNewSleepThreshold] = useState<number>(60);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  useEffect(() => {
    if (isHydrating) return;
    if (!healthConsentAccepted) {
      router.replace('/health-permissions');
    }
  }, [healthConsentAccepted, isHydrating]);

  const activeAlertCount = useMemo(() => {
    const systemAlerts = pendingAlerts.length;
    const customActive = settings.customAlerts.filter((a) => a.enabled).length;
    return systemAlerts + customActive;
  }, [pendingAlerts, settings.customAlerts]);

  const alertMessage = useMemo(() => {
    if (customMessage.trim().length > 0) return customMessage.trim();
    if (selectedSuggestion !== null) return SUGGESTION_MESSAGES[selectedSuggestion];
    return '';
  }, [customMessage, selectedSuggestion]);

  const handleCreateAlert = useCallback(() => {
    if (!alertMessage) return;
    const newAlert: CustomAlert = {
      id: `custom-${Date.now()}`,
      stressThreshold: newStressThreshold,
      sleepScoreThreshold: newSleepThreshold,
      enabled: true,
      message: alertMessage,
    };
    addCustomAlert(newAlert);
    setIsCreating(false);
    setNewStressThreshold(65);
    setNewSleepThreshold(60);
    setCustomMessage('');
    setSelectedSuggestion(null);
  }, [addCustomAlert, newStressThreshold, newSleepThreshold, alertMessage]);

  const handleDeleteAlert = useCallback(
    (alertId: string) => {
      Alert.alert('Supprimer', 'Voulez-vous supprimer cette alerte ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeCustomAlert(alertId) },
      ]);
    },
    [removeCustomAlert],
  );

  if (isHydrating || !healthConsentAccepted) {
    return (
      <ScreenShell>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingTitle}>Chargement</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.hero}>
        <Text style={styles.screenTitle}>Notifications</Text>
        <Text style={styles.screenSubtitle}>
          {activeAlertCount > 0 ? `${activeAlertCount} alerte${activeAlertCount > 1 ? 's' : ''} active${activeAlertCount > 1 ? 's' : ''}` : 'Aucune alerte active'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <BellRing color={tradnexTheme.accent} size={18} />
            <View>
              <Text style={styles.cardTitle}>Notifications push</Text>
              <Text style={styles.cardSubtitle}>Recevoir les alertes en temps réel</Text>
            </View>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
            trackColor={{ false: '#2A2D36', true: tradnexTheme.accent }}
            thumbColor={tradnexTheme.white}
            testID="notifications-master-toggle"
          />
        </View>
      </View>

      <PreSessionAlertCard
        config={settings.preSessionAlerts}
        onUpdate={(next: PreSessionAlertConfig) => updateSettings({ preSessionAlerts: next })}
      />

      <Text style={styles.sectionTitle}>Alertes système</Text>

      <View style={styles.card}>
        <View style={styles.alertRow}>
          <ShieldAlert color={tradnexTheme.warning} size={18} />
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>Seuil de stress</Text>
            <Text style={styles.alertDesc}>Alerte si le stress dépasse {settings.stressAlertThreshold}</Text>
          </View>
          {latestHealth && latestHealth.stress >= settings.stressAlertThreshold ? (
            <View style={styles.triggeredBadge}>
              <Text style={styles.triggeredText}>Actif</Text>
            </View>
          ) : (
            <View style={styles.normalBadge}>
              <Text style={styles.normalText}>OK</Text>
            </View>
          )}
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Seuil : {settings.stressAlertThreshold}</Text>
          <View style={styles.sliderContainer}>
            <Slider
              minimumValue={40}
              maximumValue={95}
              step={1}
              minimumTrackTintColor={tradnexTheme.accent}
              maximumTrackTintColor="rgba(255,255,255,0.12)"
              thumbTintColor={tradnexTheme.white}
              value={settings.stressAlertThreshold}
              onValueChange={(value) => updateSettings({ stressAlertThreshold: value })}
              testID="notif-stress-slider"
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.alertRow}>
          <TriangleAlert color={tradnexTheme.danger} size={18} />
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>Fréquence cardiaque</Text>
            <Text style={styles.alertDesc}>Alerte si le BPM dépasse {settings.heartRateThreshold}</Text>
          </View>
          {latestHealth && latestHealth.heartRate >= settings.heartRateThreshold ? (
            <View style={styles.triggeredBadge}>
              <Text style={styles.triggeredText}>Actif</Text>
            </View>
          ) : (
            <View style={styles.normalBadge}>
              <Text style={styles.normalText}>OK</Text>
            </View>
          )}
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Seuil : {settings.heartRateThreshold} bpm</Text>
          <View style={styles.sliderContainer}>
            <Slider
              minimumValue={70}
              maximumValue={140}
              step={1}
              minimumTrackTintColor={tradnexTheme.danger}
              maximumTrackTintColor="rgba(255,255,255,0.12)"
              thumbTintColor={tradnexTheme.white}
              value={settings.heartRateThreshold}
              onValueChange={(value) => updateSettings({ heartRateThreshold: value })}
              testID="notif-hr-slider"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Alertes personnalisées</Text>
        <Pressable style={styles.addButton} onPress={() => setIsCreating(!isCreating)} testID="add-custom-alert-button">
          <Plus color={tradnexTheme.accent} size={16} />
          <Text style={styles.addButtonText}>Créer</Text>
        </Pressable>
      </View>

      {isCreating ? (
        <View style={[styles.card, styles.createCard]}>
          <Text style={styles.createTitle}>Nouvelle alerte</Text>

          <View style={styles.createField}>
            <Text style={styles.createLabel}>Seuil de stress : {newStressThreshold}</Text>
            <Slider
              minimumValue={30}
              maximumValue={95}
              step={1}
              minimumTrackTintColor={tradnexTheme.warning}
              maximumTrackTintColor="rgba(255,255,255,0.12)"
              thumbTintColor={tradnexTheme.white}
              value={newStressThreshold}
              onValueChange={setNewStressThreshold}
              testID="create-stress-slider"
            />
          </View>

          <View style={styles.createField}>
            <Text style={styles.createLabel}>Score sommeil min. : {newSleepThreshold}</Text>
            <Slider
              minimumValue={30}
              maximumValue={90}
              step={1}
              minimumTrackTintColor={tradnexTheme.success}
              maximumTrackTintColor="rgba(255,255,255,0.12)"
              thumbTintColor={tradnexTheme.white}
              value={newSleepThreshold}
              onValueChange={setNewSleepThreshold}
              testID="create-sleep-slider"
            />
          </View>

          <Text style={styles.createLabel}>Votre message d'alerte</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Écrivez votre propre message…"
            placeholderTextColor={tradnexTheme.textMuted}
            value={customMessage}
            onChangeText={(text) => {
              setCustomMessage(text);
              if (text.trim().length > 0) setSelectedSuggestion(null);
            }}
            maxLength={120}
            multiline
            testID="custom-message-input"
          />

          <Text style={styles.suggestionsLabel}>Ou choisissez une suggestion</Text>
          {SUGGESTION_MESSAGES.map((msg, idx) => (
            <Pressable
              key={idx}
              style={[styles.messageOption, selectedSuggestion === idx && customMessage.trim().length === 0 && styles.messageOptionSelected]}
              onPress={() => {
                setSelectedSuggestion(idx);
                setCustomMessage('');
              }}
              testID={`suggestion-option-${idx}`}
            >
              <View style={[styles.radioOuter, selectedSuggestion === idx && customMessage.trim().length === 0 && styles.radioOuterSelected]}>
                {selectedSuggestion === idx && customMessage.trim().length === 0 ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={[styles.messageText, selectedSuggestion === idx && customMessage.trim().length === 0 && styles.messageTextSelected]}>{msg}</Text>
            </Pressable>
          ))}

          <View style={styles.createActions}>
            <Pressable style={styles.cancelButton} onPress={() => setIsCreating(false)} testID="cancel-create-alert">
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.confirmButton, !alertMessage && styles.confirmButtonDisabled]} onPress={handleCreateAlert} disabled={!alertMessage} testID="confirm-create-alert">
              <Text style={styles.confirmButtonText}>Créer l'alerte</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {settings.customAlerts.length === 0 && !isCreating ? (
        <View style={styles.emptyCard}>
          <Bell color={tradnexTheme.textMuted} size={28} />
          <Text style={styles.emptyText}>Aucune alerte personnalisée</Text>
          <Text style={styles.emptySubtext}>Créez des alertes sur mesure pour votre trading</Text>
        </View>
      ) : null}

      {settings.customAlerts.map((alert) => (
        <View key={alert.id} style={styles.card}>
          <View style={styles.customAlertHeader}>
            <View style={styles.customAlertInfo}>
              <Text style={styles.customAlertTitle}>
                Stress ≥ {alert.stressThreshold} · Sommeil ≤ {alert.sleepScoreThreshold}
              </Text>
              <Text style={styles.customAlertMessage} numberOfLines={2}>{alert.message}</Text>
            </View>
            <Switch
              value={alert.enabled}
              onValueChange={() => toggleCustomAlert(alert.id)}
              trackColor={{ false: '#2A2D36', true: tradnexTheme.accent }}
              thumbColor={tradnexTheme.white}
            />
          </View>
          <Pressable style={styles.deleteRow} onPress={() => handleDeleteAlert(alert.id)} testID={`delete-alert-${alert.id}`}>
            <Trash2 color={tradnexTheme.danger} size={14} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 6,
  },
  screenTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  screenSubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
  },
  card: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 14,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  rowLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  cardTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cardSubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 6,
  },
  sectionTitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  alertRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  alertInfo: {
    flex: 1,
    gap: 3,
  },
  alertTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  alertDesc: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
  },
  triggeredBadge: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  triggeredText: {
    color: tradnexTheme.danger,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  normalBadge: {
    backgroundColor: 'rgba(0,196,140,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  normalText: {
    color: tradnexTheme.success,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  sliderRow: {
    gap: 4,
  },
  sliderLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
  },
  sliderContainer: {
    marginHorizontal: -4,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  addButtonText: {
    color: tradnexTheme.accent,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  createCard: {
    borderColor: tradnexTheme.borderStrong,
  },
  createTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  createField: {
    gap: 4,
  },
  createLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  messageOption: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  messageOptionSelected: {
    backgroundColor: 'rgba(10,132,255,0.08)',
    borderColor: 'rgba(10,132,255,0.25)',
  },
  messageInput: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    textAlignVertical: 'top' as const,
  },
  suggestionsLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tradnexTheme.textMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 2,
  },
  radioOuterSelected: {
    borderColor: tradnexTheme.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tradnexTheme.accent,
  },
  messageText: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  messageTextSelected: {
    color: tradnexTheme.textPrimary,
  },
  createActions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelButtonText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: tradnexTheme.accent,
  },
  confirmButtonText: {
    color: tradnexTheme.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 28,
    alignItems: 'center' as const,
    gap: 10,
  },
  emptyText: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },
  customAlertHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  customAlertInfo: {
    flex: 1,
    gap: 4,
  },
  customAlertTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  customAlertMessage: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    alignSelf: 'flex-start' as const,
  },
  deleteText: {
    color: tradnexTheme.danger,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  loadingCard: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 24,
  },
  loadingTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
});
