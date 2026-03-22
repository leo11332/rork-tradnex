import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp, Clock, Crown, FileText, Globe, Heart, LogOut, Shield, User } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PsychologyLevel, PatienceLevel, RiskTolerance, TradingStyle } from '@/providers/tradnex-provider';

import { ScreenShell } from '@/components/screen-shell';
import { tradnexTheme } from '@/constants/tradnex-theme';
import { TIMEZONE_OPTIONS, TimezoneValue, TRADING_SESSIONS, TradingSessionId, SESSION_LABEL_COLORS, getSessionTimesForDate } from '@/constants/trading-sessions';
import { useAuth } from '@/providers/auth-provider';
import { useTradnex } from '@/providers/tradnex-provider';

const PSYCHOLOGY_OPTIONS: { value: PsychologyLevel; label: string }[] = [
  { value: 'stable', label: 'Stable' },
  { value: 'moderate', label: 'Mod\u00e9r\u00e9' },
  { value: 'unstable', label: 'Instable' },
];

const PATIENCE_OPTIONS: { value: PatienceLevel; label: string }[] = [
  { value: 'patient', label: 'Patient' },
  { value: 'moderate', label: 'Mod\u00e9r\u00e9' },
  { value: 'impatient', label: 'Impatient' },
];

const RISK_OPTIONS: { value: RiskTolerance; label: string }[] = [
  { value: 'conservative', label: 'Conservateur' },
  { value: 'moderate', label: 'Mod\u00e9r\u00e9' },
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
  const { settings, subscription, updateSettings, toggleAdminBypass, logout, healthConsentAccepted, isHydrating } = useTradnex();
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
        <Text style={styles.screenTitle}>R{'\u00e9'}glages</Text>
      </View>

      <Pressable style={styles.card} onPress={() => setShowTimezones(!showTimezones)} testID="timezone-card">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Globe color={tradnexTheme.accent} size={18} />
            <View>
              <Text style={styles.cardTitle}>Fuseau horaire</Text>
              <Text style={styles.cardSubtitle}>{currentTzLabel}</Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textSecondary} size={18} />
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
            <Clock color={tradnexTheme.accent} size={18} />
            <View>
              <Text style={styles.cardTitle}>Sessions de trading</Text>
              <Text style={styles.cardSubtitle}>
                {(settings.tradingSessions ?? []).map((id) => TRADING_SESSIONS.find((s) => s.id === id)?.label).filter(Boolean).join(', ') || 'Aucune'}
              </Text>
            </View>
          </View>
          {showSessions ? <ChevronUp color={tradnexTheme.textSecondary} size={18} /> : <ChevronDown color={tradnexTheme.textSecondary} size={18} />}
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
                    <Text style={styles.sessionHours}>{fmtStart} {'\u2013'} {fmtEnd}</Text>
                  </View>
                </View>
                {isActive ? (
                  <View style={styles.sessionCheckIcon}>
                    <Check color={tradnexTheme.accent} size={14} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Text style={styles.sessionHintText}>Horaires ajust{"\u00e9"}s automatiquement selon le d{"\u00e9"}calage horaire et l'heure d'{"\u00e9"}t{"\u00e9"}.</Text>
        </View>
      ) : null}

      <Pressable style={styles.card} onPress={() => setShowProfile(!showProfile)} testID="profile-card">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <User color={tradnexTheme.accent} size={18} />
            <View>
              <Text style={styles.cardTitle}>Profil personnel</Text>
              <Text style={styles.cardSubtitle}>Psychologie, patience, style de trading</Text>
            </View>
          </View>
          {showProfile ? <ChevronUp color={tradnexTheme.textSecondary} size={18} /> : <ChevronDown color={tradnexTheme.textSecondary} size={18} />}
        </View>
      </Pressable>

      {showProfile ? (
        <View style={styles.profilePanel}>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>Psychologie de nature</Text>
            <ChipGroup options={PSYCHOLOGY_OPTIONS} selected={profile.psychology} onSelect={(v) => updateProfile('psychology', v)} />
          </View>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>Patience</Text>
            <ChipGroup options={PATIENCE_OPTIONS} selected={profile.patience} onSelect={(v) => updateProfile('patience', v)} />
          </View>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>Tol{'\u00e9'}rance au risque</Text>
            <ChipGroup options={RISK_OPTIONS} selected={profile.riskTolerance} onSelect={(v) => updateProfile('riskTolerance', v)} />
          </View>
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>Style de trading</Text>
            <ChipGroup options={STYLE_OPTIONS} selected={profile.tradingStyle} onSelect={(v) => updateProfile('tradingStyle', v)} />
          </View>
        </View>
      ) : null}

      <Pressable style={styles.card} onPress={() => router.push('/paywall')} testID="subscription-card-button">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Crown color={tradnexTheme.warning} size={18} />
            <View>
              <Text style={styles.cardTitle}>Abonnement</Text>
              <Text style={styles.cardSubtitle}>
                {subscription.adminBypass ? 'Acc\u00e8s admin complet' : subscription.state === 'active' ? 'TRADNEX Pro actif' : 'Essai gratuit 5 jours'}
              </Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textSecondary} size={18} />
        </View>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/legal')} testID="legal-card-button">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <FileText color={tradnexTheme.accent} size={18} />
            <View>
              <Text style={styles.cardTitle}>Mentions l{'\u00e9'}gales</Text>
              <Text style={styles.cardSubtitle}>Confidentialit{'\u00e9'} et CGU</Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textSecondary} size={18} />
        </View>
      </Pressable>

      <Pressable style={styles.card} onPress={toggleAdminBypass} testID="admin-bypass-button">
        <View style={styles.rowBetween}>
          <View style={styles.rowLabel}>
            <Shield color={tradnexTheme.success} size={18} />
            <View>
              <Text style={styles.cardTitle}>Accès administrateur</Text>
              <Text style={styles.cardSubtitle}>{subscription.adminBypass ? 'Activé' : 'Désactivé'}</Text>
            </View>
          </View>
          <ChevronRight color={tradnexTheme.textSecondary} size={18} />
        </View>
      </Pressable>

      <View style={styles.healthInfoCard}>
        <View style={styles.rowLabel}>
          <Heart color={tradnexTheme.danger} size={16} />
          <View>
            <Text style={styles.healthInfoTitle}>Int{'\u00e9'}gration sant{'\u00e9'}</Text>
            <Text style={styles.healthInfoBody}>
              Données fictives actives. L’intégration HealthKit / Health Connect sera disponible après la compilation native.
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.card, styles.logoutCard]}
        onPress={() => {
          void logout();
          signOutMutation.mutate();
        }}
        testID="logout-button"
      >
        <View style={styles.rowLabel}>
          <LogOut color={tradnexTheme.danger} size={18} />
          <Text style={styles.logoutText}>D{'\u00e9'}connexion</Text>
        </View>
      </Pressable>

      <Text style={styles.versionText}>TRADNEX v1.0.0</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
  },
  screenTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  card: {
    borderRadius: 26,
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
    fontSize: 17,
    fontWeight: '700' as const,
  },
  cardSubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  tzList: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    overflow: 'hidden' as const,
  },
  tzOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tradnexTheme.border,
  },
  tzOptionActive: {
    backgroundColor: 'rgba(10,132,255,0.08)',
  },
  tzLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
  },
  tzLabelActive: {
    color: tradnexTheme.accent,
    fontWeight: '700' as const,
  },
  tzCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tradnexTheme.accent,
  },
  logoutCard: {
    borderColor: 'rgba(255,59,48,0.18)',
  },
  logoutText: {
    color: tradnexTheme.danger,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  profilePanel: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 18,
  },
  profileSection: {
    gap: 8,
  },
  profileLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(10,132,255,0.15)',
    borderColor: tradnexTheme.accent,
  },
  chipText: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  chipTextActive: {
    color: tradnexTheme.accent,
  },
  healthInfoCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.12)',
    padding: 16,
  },
  healthInfoTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  healthInfoBody: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  versionText: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  sessionsPanel: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 14,
    gap: 8,
  },
  sessionOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sessionOptionActive: {
    borderColor: 'rgba(10,132,255,0.35)',
    backgroundColor: 'rgba(10,132,255,0.08)',
  },
  sessionOptionInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sessionLabelActive: {
    color: tradnexTheme.accent,
  },
  sessionHours: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sessionCheckIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(10,132,255,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sessionHintText: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 4,
    marginTop: 2,
  },
});
