import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp, Clock, Crown, FileText, Globe, LogOut, Trash2, User } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PsychologyLevel, PatienceLevel, RiskTolerance, TradingStyle } from '@/providers/tradnex-provider';

import { ScreenShell } from '@/components/screen-shell';
import { tradnexTheme } from '@/constants/tradnex-theme';
import { TIMEZONE_OPTIONS, TimezoneValue, TRADING_SESSIONS, TradingSessionId, SESSION_LABEL_COLORS, getSessionTimesForDate } from '@/constants/trading-sessions';
import { useAuth } from '@/providers/auth-provider';
import { useTradnex } from '@/providers/tradnex-provider';

const PSYCHOLOGY_OPTIONS: { value: PsychologyLevel; label: string }[] = [
  { value: 'stable', label: 'Stable' },
  { value: 'moderate', label: 'Modéré' },
  { value: 'unstable', label: 'Instable' },
];

const PATIENCE_OPTIONS: { value: PatienceLevel; label: string }[] = [
  { value: 'patient', label: 'Patient' },
  { value: 'moderate', label: 'Modéré' },
  { value: 'impatient', label: 'Impatient' },
];

const RISK_OPTIONS: { value: RiskTolerance; label: string }[] = [
  { value: 'conservative', label: 'Conservateur' },
  { value: 'moderate', label: 'Modéré' },
  { value: 'aggressive', label: 'Agressif' },
];

const STYLE_OPTIONS: { value: TradingStyle; label: string }[] = [
  { value: 'scalping', label: 'Scalping' },
  { value: 'day-trading', label: 'Day Trading' },
  { value: 'swing', label: 'Swing Trading' },
];

interface ChipGroupProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

function ChipGroup<T extends string>({ options, selected, onSelect }: ChipGroupProps<T>) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.chip, selected === opt.value && styles.chipActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, selected === opt.value && styles.chipTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const { signOutMutation } = useAuth();
  const { settings, subscription, updateSettings, logout, deleteAccount, healthConsentAccepted, isHydrating } = useTradnex();
  const [showTimezones, setShowTimezones] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showSessions, setShowSessions] = useState<boolean>(false);

  const profile = settings.traderProfile;

  const updateProfile = useCallback(<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) => {
    updateSettings({ traderProfile: { ...profile, [key]: value } });
  }, [profile, updateSettings]);

  const toggleSession = useCallback((id: TradingSessionId) => {
    const current = settings.tradingSessions ?? ['newyork'];
    if (current.includes(id)) {
      if (current.length === 1) return;
      updateSettings({ tradingSessions: current.filter((s) => s !== id) });
    } else {
      updateSettings({ tradingSessions: [...current, id] });
    }
  }, [settings.tradingSessions, updateSettings]);

  if (isHydrating || !healthConsentAccepted) {
    return <ScreenShell><View style={styles.card}><Text style={styles.screenTitle}>Chargement</Text></View></ScreenShell>;
  }

  const currentTzLabel = TIMEZONE_OPTIONS.find((tz) => tz.value === settings.timezone)?.label ?? 'Paris (CET/CEST)';

  return (
    <ScreenShell>
      <View style={styles.hero}>
        <Text style={styles.screenTitle}>Réglages</Text>
      </View>

      <Pressable style={styles.card} onPress={() => setShowTimezones(!showTimezones)} testID="timezone-card">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Globe color={tradnexTheme.accent} size={16} />
            <View>
              <Text style={styles.cardTitle}>Fuseau horaire</Text>
              <Text style={styles.cardSubtitle}>{currentTzLabel}</Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textMuted} size={16} />
        </View>
      </Pressable>

      {showTimezones ? (
        <View style={styles.tzList}>
          {TIMEZONE_OPTIONS.map((tz) => (
            <Pressable
              key={tz.value}
              style={[styles.tzOption, settings.timezone === tz.value && styles.tzOptionActive]}
              onPress={() => {
                updateSettings({ timezone: tz.value as TimezoneValue });
                setShowTimezones(false);
              }}
              testID={`tz-${tz.value}`}
            >
              <Text style={[styles.tzLabel, settings.timezone === tz.value && styles.tzLabelActive]}>{tz.label}</Text>
              {settings.timezone === tz.value ? (
                <View style={styles.tzCheck} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.card} onPress={() => setShowSessions(!showSessions)} testID="sessions-card">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Clock color={tradnexTheme.accent} size={16} />
            <View>
              <Text style={styles.cardTitle}>Sessions de trading</Text>
              <Text style={styles.cardSubtitle}>
                {(settings.tradingSessions ?? []).map((id) => TRADING_SESSIONS.find((s) => s.id === id)?.label).filter(Boolean).join(', ') || 'Aucune'}
              </Text>
            </View>
          </View>
          {showSessions ? <ChevronUp color={tradnexTheme.textMuted} size={16} /> : <ChevronDown color={tradnexTheme.textMuted} size={16} />}
        </View>
      </Pressable>

      {showSessions ? (
        <View style={styles.sessionsPanel}>
          {TRADING_SESSIONS.map((session) => {
            const isActive = (settings.tradingSessions ?? []).includes(session.id);
            const resolved = getSessionTimesForDate([session.id], new Date(), settings.timezone ?? 'Europe/Paris');
            const r = resolved[0];
            const startH = r ? Math.floor(((r.startHour % 24) + 24) % 24) : 0;
            const startM = r ? Math.round((r.startHour - Math.floor(r.startHour)) * 60) : 0;
            const endH = r ? Math.floor(((r.endHour % 24) + 24) % 24) : 0;
            const endM = r ? Math.round((r.endHour - Math.floor(r.endHour)) * 60) : 0;
            const fmtStart = `${startH.toString().padStart(2, '0')}h${startM > 0 ? startM.toString().padStart(2, '0') : ''}`;
            const fmtEnd = `${endH.toString().padStart(2, '0')}h${endM > 0 ? endM.toString().padStart(2, '0') : ''}`;
            return (
              <Pressable
                key={session.id}
                style={[styles.sessionOption, isActive && styles.sessionOptionActive]}
                onPress={() => toggleSession(session.id)}
                testID={`session-toggle-${session.id}`}
              >
                <View style={styles.sessionOptionInner}>
                  <View style={[styles.sessionDot, { backgroundColor: SESSION_LABEL_COLORS[session.id] }]} />
                  <View>
                    <Text style={[styles.sessionLabel, isActive && styles.sessionLabelActive]}>{session.label}</Text>
                    <Text style={styles.sessionHours}>{fmtStart} – {fmtEnd}</Text>
                  </View>
                </View>
                {isActive ? (
                  <View style={styles.sessionCheckIcon}>
                    <Check color={tradnexTheme.accent} size={13} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Text style={styles.sessionHintText}>Horaires ajustés automatiquement selon le décalage horaire et l'heure d'été.</Text>
        </View>
      ) : null}

      <Pressable style={styles.card} onPress={() => setShowProfile(!showProfile)} testID="profile-card">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <User color={tradnexTheme.accent} size={16} />
            <View>
              <Text style={styles.cardTitle}>Profil personnel</Text>
              <Text style={styles.cardSubtitle}>Psychologie, patience, style de trading</Text>
            </View>
          </View>
          {showProfile ? <ChevronUp color={tradnexTheme.textMuted} size={16} /> : <ChevronDown color={tradnexTheme.textMuted} size={16} />}
        </View>
      </Pressable>

      {showProfile ? (
        <View style={styles.profilePanel}>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>PSYCHOLOGIE DE NATURE</Text>
            <ChipGroup options={PSYCHOLOGY_OPTIONS} selected={profile.psychology} onSelect={(v) => updateProfile('psychology', v)} />
          </View>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>PATIENCE</Text>
            <ChipGroup options={PATIENCE_OPTIONS} selected={profile.patience} onSelect={(v) => updateProfile('patience', v)} />
          </View>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>TOLÉRANCE AU RISQUE</Text>
            <ChipGroup options={RISK_OPTIONS} selected={profile.riskTolerance} onSelect={(v) => updateProfile('riskTolerance', v)} />
          </View>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>STYLE DE TRADING</Text>
            <ChipGroup options={STYLE_OPTIONS} selected={profile.tradingStyle} onSelect={(v) => updateProfile('tradingStyle', v)} />
          </View>
        </View>
      ) : null}

      <Pressable style={styles.card} onPress={() => router.push('/paywall')} testID="subscription-card-button">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Crown color={tradnexTheme.warning} size={16} />
            <View>
              <Text style={styles.cardTitle}>Abonnement</Text>
              <Text style={styles.cardSubtitle}>
                {subscription.state === 'active' ? 'TRADNEX Pro actif' : 'Essai gratuit 5 jours'}
              </Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textMuted} size={16} />
        </View>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/legal')} testID="legal-card-button">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <FileText color={tradnexTheme.accent} size={16} />
            <View>
              <Text style={styles.cardTitle}>Mentions légales</Text>
              <Text style={styles.cardSubtitle}>Confidentialité et CGU</Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textMuted} size={16} />
        </View>
      </Pressable>

      <Pressable
        style={[styles.card, styles.logoutCard]}
        onPress={() => {
          void logout();
          signOutMutation.mutate();
        }}
        testID="logout-button"
      >
        <View style={styles.rowLabel}>
          <LogOut color={tradnexTheme.danger} size={16} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </View>
      </Pressable>

      <Pressable
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            'Supprimer le compte',
            'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: () => {
                  void deleteAccount();
                  signOutMutation.mutate();
                },
              },
            ],
          );
        }}
        testID="delete-account-button"
      >
        <Trash2 color={tradnexTheme.textMuted} size={13} />
        <Text style={styles.deleteText}>Supprimer mon compte et mes données</Text>
      </Pressable>

      <Text style={styles.versionText}>TRADNEX v1.0.0</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 6,
  },
  screenTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 20,
    paddingVertical: 22,
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800' as const,
  },
  cardSubtitle: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  tzList: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden' as const,
  },
  tzOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  tzOptionActive: {
    backgroundColor: 'rgba(10,132,255,0.05)',
  },
  tzLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
  },
  tzLabelActive: {
    color: tradnexTheme.accent,
    fontWeight: '700' as const,
  },
  tzCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tradnexTheme.accent,
  },
  logoutCard: {
    borderColor: 'rgba(255,70,84,0.12)',
  },
  logoutText: {
    color: tradnexTheme.danger,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  profilePanel: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 16,
  },
  profileSection: {
    gap: 8,
  },
  profileLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: 'rgba(10,132,255,0.1)',
    borderColor: tradnexTheme.accent,
  },
  chipText: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  chipTextActive: {
    color: tradnexTheme.accent,
  },
  versionText: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    textAlign: 'center' as const,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  sessionsPanel: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    gap: 6,
  },
  sessionOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  sessionOptionActive: {
    borderColor: 'rgba(10,132,255,0.2)',
    backgroundColor: 'rgba(10,132,255,0.05)',
  },
  sessionOptionInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sessionLabelActive: {
    color: tradnexTheme.accent,
  },
  sessionHours: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  sessionCheckIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10,132,255,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sessionHintText: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
