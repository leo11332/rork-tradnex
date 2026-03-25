import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Bell, BellRing, Clock, FileText, Plus, ShieldAlert, Smartphone, Trash2, TriangleAlert } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { ScreenShell } from '@/components/screen-shell';
import { tradnexTheme } from '@/constants/tradnex-theme';
import { TRADING_SESSIONS } from '@/constants/trading-sessions';
import { useTradnex } from '@/providers/tradnex-provider';
import { getVitalIndex, getPreSessionAdvice } from '@/utils/tradnex';
import { formatSleepDuration } from '@/utils/tradnex';
import type { CustomAlert, PreSessionAlertConfig, PreSessionSessionAlert } from '@/providers/tradnex-provider';
import type { TradingSessionId } from '@/constants/trading-sessions';

const SUGGESTION_MESSAGES: string[] = [
  'Vigilance requise \u2014 passez en mode observation.',
  'Seuil atteint \u2014 prenez un moment avant de continuer.',
];

const SESSION_ICONS: Record<TradingSessionId, string> = {
  tokyo: '\ud83c\udf0f',
  london: '\ud83c\uddec\ud83c\udde7',
  newyork: '\ud83c\uddfa\ud83c\uddf8',
};

interface PreSessionReportCardProps {
  config: PreSessionAlertConfig;
  onUpdate: (next: PreSessionAlertConfig) => void;
  previewScore: number;
  previewStress: number;
  previewSleep: string;
  previewHrv: number;
  previewRecommendation: string;
}

function PreSessionReportCard({ config, onUpdate, previewScore, previewStress, previewSleep, previewHrv, previewRecommendation }: PreSessionReportCardProps) {
  const activeCount = useMemo(() => {
    return (config.tokyo.enabled ? 1 : 0) + (config.london.enabled ? 1 : 0) + (config.newyork.enabled ? 1 : 0);
  }, [config]);

  const toggleSession = useCallback((sessionId: TradingSessionId, value: boolean) => {
    const next = { ...config };
    next[sessionId] = { ...next[sessionId], enabled: value };
    onUpdate(next);
  }, [config, onUpdate]);

  const activeSessionLabels = useMemo(() => {
    const labels: string[] = [];
    TRADING_SESSIONS.forEach((s) => {
      if (config[s.id].enabled) labels.push(s.label);
    });
    return labels;
  }, [config]);

  return (
    <View style={psStyles.card}>
      <View style={psStyles.headerRow}>
        <View style={psStyles.iconWrap}>
          <FileText color={tradnexTheme.accent} size={18} />
        </View>
        <View style={psStyles.headerTextWrap}>
          <Text style={psStyles.title}>RAPPORT PRÉ-SESSION</Text>
          <Text style={psStyles.subtitle}>
            {activeCount > 0
              ? `Notification 15 min avant ${activeSessionLabels.join(', ')}`
              : 'Aucune session sélectionnée'}
          </Text>
        </View>
      </View>

      <Text style={psStyles.description}>
        Recevez un mini-rapport sur votre état physique directement en notification, 15 minutes avant l'ouverture de chaque session cochée.
      </Text>

      <View style={psStyles.sessionsWrap}>
        {TRADING_SESSIONS.map((session) => {
          const sessionConfig: PreSessionSessionAlert = config[session.id];
          return (
            <Pressable
              key={session.id}
              style={[psStyles.sessionRow, sessionConfig.enabled && { borderColor: tradnexTheme.accent, backgroundColor: 'rgba(10,132,255,0.04)' }]}
              onPress={() => toggleSession(session.id, !sessionConfig.enabled)}
              testID={`ps-toggle-${session.id}`}
            >
              <View style={[psStyles.checkbox, sessionConfig.enabled && { backgroundColor: tradnexTheme.accent, borderColor: tradnexTheme.accent }]}>
                {sessionConfig.enabled ? <Text style={psStyles.checkmark}>✓</Text> : null}
              </View>
              <Text style={psStyles.sessionEmoji}>{SESSION_ICONS[session.id]}</Text>
              <Text style={[psStyles.sessionLabel, sessionConfig.enabled && { color: tradnexTheme.textPrimary }]}>{session.label}</Text>
              <View style={[psStyles.timeBadge, sessionConfig.enabled && { backgroundColor: 'rgba(10,132,255,0.08)' }]}>
                <Clock color={sessionConfig.enabled ? tradnexTheme.accent : tradnexTheme.textMuted} size={10} />
                <Text style={[psStyles.timeBadgeText, sessionConfig.enabled && { color: tradnexTheme.accent }]}>15 min avant</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {activeCount > 0 ? (
        <View style={psStyles.previewWrap}>
          <View style={psStyles.previewHeader}>
            <Smartphone color={tradnexTheme.textMuted} size={12} />
            <Text style={psStyles.previewLabel}>APER\u00c7U NOTIFICATION</Text>
          </View>
          <View style={psStyles.notifCard}>
            <View style={psStyles.notifTopRow}>
              <View style={psStyles.notifAppIcon}>
                <Text style={psStyles.notifAppIconText}>T</Text>
              </View>
              <Text style={psStyles.notifAppName}>TRADNEX</Text>
              <Text style={psStyles.notifTime}>il y a 1 min</Text>
            </View>
            <Text style={psStyles.notifTitle}>Rapport pr\u00e9-session \u2014 {activeSessionLabels[0] ?? 'Session'}</Text>
            <Text style={psStyles.notifBody}>
              Score global : {previewScore}/100 \u00b7 Stress : {previewStress}/100 \u00b7 Sommeil : {previewSleep} \u00b7 HRV : {previewHrv} ms{`\n`}{previewRecommendation}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const psStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(10,132,255,0.08)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  subtitle: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  description: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  sessionsWrap: {
    gap: 6,
  },
  sessionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkmark: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800' as const,
    marginTop: -1,
  },
  sessionEmoji: {
    fontSize: 15,
  },
  sessionLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  timeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeBadgeText: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  previewWrap: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: 12,
  },
  previewHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  previewLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  notifCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  notifTopRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 2,
  },
  notifAppIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: tradnexTheme.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notifAppIconText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900' as const,
  },
  notifAppName: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    flex: 1,
  },
  notifTime: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
  },
  notifTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  notifBody: {
    color: tradnexTheme.textSecondary,
    fontSize: 11,
    lineHeight: 16,
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

  const previewScore = useMemo(() => {
    if (!latestHealth) return 74;
    return getVitalIndex(latestHealth.stress, latestHealth.sleepScore, latestHealth.hrv);
  }, [latestHealth]);

  const previewStress = latestHealth?.stress ?? 42;
  const previewSleep = latestHealth ? formatSleepDuration(latestHealth.sleepHours) : '7h12';
  const previewHrv = latestHealth?.hrv ?? 58;
  const previewRecommendation = getPreSessionAdvice(previewScore);

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
            <BellRing color={tradnexTheme.accent} size={16} />
            <View>
              <Text style={styles.cardTitle}>NOTIFICATIONS PUSH</Text>
              <Text style={styles.cardSubtitle}>Recevoir les alertes en temps réel</Text>
            </View>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
            trackColor={{ false: '#2A2A2E', true: tradnexTheme.accent }}
            thumbColor={tradnexTheme.white}
            testID="notifications-master-toggle"
          />
        </View>
      </View>

      <PreSessionReportCard
        config={settings.preSessionAlerts}
        onUpdate={(next: PreSessionAlertConfig) => updateSettings({ preSessionAlerts: next })}
        previewScore={previewScore}
        previewStress={previewStress}
        previewSleep={previewSleep}
        previewHrv={previewHrv}
        previewRecommendation={previewRecommendation}
      />

      <Text style={styles.sectionTitle}>ALERTES SYST\u00c8ME</Text>

      <View style={styles.card}>
        <View style={styles.alertRow}>
          <ShieldAlert color={tradnexTheme.warning} size={16} />
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>Seuil de stress</Text>
            <Text style={styles.alertDesc}>Alerte si le stress dépasse {settings.stressAlertThreshold}</Text>
          </View>
          {latestHealth && latestHealth.stress >= settings.stressAlertThreshold ? (
            <View style={styles.triggeredBadge}>
              <Text style={styles.triggeredText}>ACTIF</Text>
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
              maximumTrackTintColor="rgba(255,255,255,0.08)"
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
          <TriangleAlert color={tradnexTheme.danger} size={16} />
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>Fréquence cardiaque</Text>
            <Text style={styles.alertDesc}>Alerte si le BPM dépasse {settings.heartRateThreshold}</Text>
          </View>
          {latestHealth && latestHealth.heartRate >= settings.heartRateThreshold ? (
            <View style={styles.triggeredBadge}>
              <Text style={styles.triggeredText}>ACTIF</Text>
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
              maximumTrackTintColor="rgba(255,255,255,0.08)"
              thumbTintColor={tradnexTheme.white}
              value={settings.heartRateThreshold}
              onValueChange={(value) => updateSettings({ heartRateThreshold: value })}
              testID="notif-hr-slider"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ALERTES PERSONNALISÉES</Text>
        <Pressable style={styles.addButton} onPress={() => setIsCreating(!isCreating)} testID="add-custom-alert-button">
          <Plus color={tradnexTheme.accent} size={14} />
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
              maximumTrackTintColor="rgba(255,255,255,0.08)"
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
              maximumTrackTintColor="rgba(255,255,255,0.08)"
              thumbTintColor={tradnexTheme.white}
              value={newSleepThreshold}
              onValueChange={setNewSleepThreshold}
              testID="create-sleep-slider"
            />
          </View>

          <Text style={styles.createLabel}>Votre message d'alerte</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Écrivez votre message..."
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

          <Text style={styles.suggestionsLabel}>OU CHOISISSEZ UNE SUGGESTION</Text>
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
          <Bell color={tradnexTheme.textMuted} size={24} />
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
              trackColor={{ false: '#2A2A2E', true: tradnexTheme.accent }}
              thumbColor={tradnexTheme.white}
            />
          </View>
          <Pressable style={styles.deleteRow} onPress={() => handleDeleteAlert(alert.id)} testID={`delete-alert-${alert.id}`}>
            <Trash2 color={tradnexTheme.danger} size={13} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 4,
  },
  screenTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800' as const,
  },
  screenSubtitle: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 12,
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
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  cardSubtitle: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 4,
  },
  sectionTitle: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  alertInfo: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  alertDesc: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
  },
  triggeredBadge: {
    backgroundColor: 'rgba(255,70,84,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  triggeredText: {
    color: tradnexTheme.danger,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  normalBadge: {
    backgroundColor: 'rgba(10,132,255,0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  normalText: {
    color: tradnexTheme.success,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  sliderRow: {
    gap: 4,
  },
  sliderLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
  },
  sliderContainer: {
    marginHorizontal: -4,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(10,132,255,0.1)',
  },
  addButtonText: {
    color: tradnexTheme.accent,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  createCard: {
    borderColor: 'rgba(10,132,255,0.15)',
  },
  createTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  createField: {
    gap: 4,
  },
  createLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  messageOption: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  messageOptionSelected: {
    backgroundColor: 'rgba(10,132,255,0.05)',
    borderColor: 'rgba(10,132,255,0.15)',
  },
  messageInput: {
    color: tradnexTheme.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 50,
    textAlignVertical: 'top' as const,
  },
  suggestionsLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.35,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: tradnexTheme.accent,
  },
  messageText: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelButtonText: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: tradnexTheme.accent,
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 28,
    alignItems: 'center' as const,
    gap: 8,
  },
  emptyText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
  },
  customAlertHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  customAlertInfo: {
    flex: 1,
    gap: 3,
  },
  customAlertTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  customAlertMessage: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  deleteRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    alignSelf: 'flex-start' as const,
  },
  deleteText: {
    color: tradnexTheme.danger,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  loadingCard: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 24,
  },
  loadingTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800' as const,
  },
});
