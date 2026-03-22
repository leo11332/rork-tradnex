import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Bell, BellRing, Clock, Plus, ShieldAlert, Trash2, TriangleAlert, Zap } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { ScreenShell } from '@/components/screen-shell';
import { tradnexTheme } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';
import { CustomAlert } from '@/providers/tradnex-provider';

const SUGGESTION_MESSAGES: string[] = [
  'Vigilance requise — passez en mode observation.',
  'Seuil atteint — prenez un moment avant de continuer.',
];

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

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Zap color={tradnexTheme.warning} size={18} />
            <View>
              <Text style={styles.cardTitle}>Alerte pr\u00E9-session</Text>
              <Text style={styles.cardSubtitle}>Notification avec votre Tradnex Score avant de trader</Text>
            </View>
          </View>
          <Switch
            value={settings.preSessionAlertEnabled}
            onValueChange={(value) => updateSettings({ preSessionAlertEnabled: value })}
            trackColor={{ false: '#2A2D36', true: tradnexTheme.warning }}
            thumbColor={tradnexTheme.white}
            testID="pre-session-alert-toggle"
          />
        </View>
        {settings.preSessionAlertEnabled ? (
          <View style={styles.preSessionTimeRow}>
            <Clock color={tradnexTheme.textMuted} size={14} />
            <Text style={styles.preSessionTimeLabel}>Heure d'alerte : {settings.preSessionAlertTime}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Alertes syst\u00E8me</Text>

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
          <Text style={styles.sliderLabel}>Seuil: {settings.stressAlertThreshold}</Text>
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
          <Text style={styles.sliderLabel}>Seuil: {settings.heartRateThreshold} bpm</Text>
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
            <Text style={styles.createLabel}>Seuil de stress: {newStressThreshold}</Text>
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
            <Text style={styles.createLabel}>Score sommeil min: {newSleepThreshold}</Text>
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
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertInfo: {
    flex: 1,
    gap: 3,
  },
  alertTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  addButtonText: {
    color: tradnexTheme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  createCard: {
    borderColor: tradnexTheme.borderStrong,
  },
  createTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  createField: {
    gap: 4,
  },
  createLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  messageOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelButtonText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: tradnexTheme.accent,
  },
  confirmButtonText: {
    color: tradnexTheme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  customAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customAlertInfo: {
    flex: 1,
    gap: 4,
  },
  customAlertTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  customAlertMessage: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  deleteText: {
    color: tradnexTheme.danger,
    fontSize: 13,
    fontWeight: '600',
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
    fontWeight: '800',
  },
  preSessionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  preSessionTimeLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
  },
});
