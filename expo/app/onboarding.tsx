import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Check, ChevronRight, Heart, Sparkles } from 'lucide-react-native';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { TRADING_SESSIONS, TradingSessionId } from '@/constants/trading-sessions';
import { useTradnex } from '@/providers/tradnex-provider';

const SESSION_FLAGS: Record<TradingSessionId, string> = {
  tokyo: '\ud83c\uddef\ud83c\uddf5',
  london: '\ud83c\uddec\ud83c\udde7',
  newyork: '\ud83c\uddfa\ud83c\uddf8',
};

export default function OnboardingScreen() {
  const { updateSettings, acceptHealthConsentMutation, completeOnboarding, settings } = useTradnex();
  const [step, setStep] = useState<number>(0);
  const [selectedSessions, setSelectedSessions] = useState<TradingSessionId[]>(settings.tradingSessions ?? ['newyork']);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback((next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  const toggleSession = useCallback((id: TradingSessionId) => {
    setSelectedSessions(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handleSessionsContinue = useCallback(() => {
    updateSettings({ tradingSessions: selectedSessions, preSessionSessions: selectedSessions });
    animateTransition(2);
  }, [selectedSessions, updateSettings, animateTransition]);

  const handleHealthAuthorize = useCallback(async () => {
    await acceptHealthConsentMutation.mutateAsync();
    animateTransition(3);
  }, [acceptHealthConsentMutation, animateTransition]);

  const handleSkipHealth = useCallback(() => {
    animateTransition(3);
  }, [animateTransition]);

  const handleFinish = useCallback(() => {
    completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071019', '#020407', '#000000']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {step === 0 ? (
            <View style={styles.stepContent}>
              <View style={styles.logoWrap}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>T</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>Tradez avec votre corps, pas contre lui.</Text>
              <Text style={styles.heroSubtitle}>
                TRADNEX analyse vos donn{'\u00e9'}es biom{'\u00e9'}triques pour vous dire quand trader et quand vous reposer.
              </Text>
              <View style={styles.spacer} />
              <Pressable style={styles.primaryButton} onPress={() => animateTransition(1)} testID="onboarding-start">
                <Text style={styles.primaryButtonText}>Commencer</Text>
                <ChevronRight color={tradnexTheme.white} size={18} />
              </Pressable>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Quelles sessions tradez-vous ?</Text>
              <Text style={styles.stepSubtitle}>S{'\u00e9'}lectionnez une ou plusieurs sessions</Text>
              <View style={styles.sessionsGrid}>
                {TRADING_SESSIONS.map(session => {
                  const isActive = selectedSessions.includes(session.id);
                  return (
                    <Pressable
                      key={session.id}
                      style={[styles.sessionCard, isActive && styles.sessionCardActive]}
                      onPress={() => toggleSession(session.id)}
                      testID={`onboarding-session-${session.id}`}
                    >
                      <Text style={styles.sessionFlag}>{SESSION_FLAGS[session.id]}</Text>
                      <Text style={[styles.sessionLabel, isActive && styles.sessionLabelActive]}>{session.label}</Text>
                      {isActive ? (
                        <View style={styles.sessionCheck}>
                          <Check color={tradnexTheme.accent} size={14} strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.spacer} />
              <Pressable style={styles.primaryButton} onPress={handleSessionsContinue} testID="onboarding-sessions-continue">
                <Text style={styles.primaryButtonText}>Continuer</Text>
                <ChevronRight color={tradnexTheme.white} size={18} />
              </Pressable>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepContent}>
              <View style={styles.healthIconWrap}>
                <Heart color={tradnexTheme.accent} size={36} />
              </View>
              <Text style={styles.stepTitle}>Connectez vos donn{'\u00e9'}es sant{'\u00e9'}</Text>
              <Text style={styles.stepSubtitle}>
                TRADNEX lit votre fr{'\u00e9'}quence cardiaque, HRV et sommeil depuis Apple Sant{'\u00e9'} ou Google Sant{'\u00e9'}. Vos donn{'\u00e9'}es restent sur votre t{'\u00e9'}l{'\u00e9'}phone.
              </Text>
              <View style={styles.spacer} />
              <Pressable
                style={styles.primaryButton}
                onPress={() => void handleHealthAuthorize()}
                testID="onboarding-health-authorize"
              >
                <Text style={styles.primaryButtonText}>
                  {acceptHealthConsentMutation.isPending ? 'Connexion...' : 'Autoriser l\u2019acc\u00e8s'}
                </Text>
              </Pressable>
              <Pressable onPress={handleSkipHealth} style={styles.skipButton} testID="onboarding-skip-health">
                <Text style={styles.skipText}>Plus tard</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepContent}>
              <View style={styles.trialBadge}>
                <Sparkles color={tradnexTheme.warning} size={16} />
                <Text style={styles.trialBadgeText}>Essai gratuit</Text>
              </View>
              <Text style={styles.stepTitle}>5 jours gratuits, sans carte bancaire</Text>
              <View style={styles.featureList}>
                {[
                  'Tradnex Score personnalis\u00e9',
                  'Insights et patterns IA',
                  'Alertes pr\u00e9-session',
                  'Journal de trading biom\u00e9trique',
                  'Historique illimit\u00e9',
                ].map((feat, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Check color={tradnexTheme.success} size={16} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.spacer} />
              <Pressable style={styles.primaryButton} onPress={handleFinish} testID="onboarding-finish">
                <Text style={styles.primaryButtonText}>D{'\u00e9'}marrer mon essai gratuit</Text>
              </Pressable>
              <Pressable onPress={handleFinish} style={styles.skipButton} testID="onboarding-login">
                <Text style={styles.skipText}>Me connecter</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tradnexTheme.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center' as const,
    gap: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  logoWrap: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderWidth: 2,
    borderColor: tradnexTheme.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logoText: {
    color: tradnexTheme.accent,
    fontSize: 40,
    fontWeight: '800' as const,
  },
  heroTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 30,
    fontWeight: '800' as const,
    lineHeight: 38,
    textAlign: 'center' as const,
  },
  heroSubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center' as const,
  },
  stepTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 26,
    fontWeight: '800' as const,
    lineHeight: 34,
  },
  stepSubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  sessionsGrid: {
    gap: 12,
    marginTop: 12,
  },
  sessionCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sessionCardActive: {
    backgroundColor: 'rgba(10,132,255,0.1)',
    borderColor: tradnexTheme.accent,
  },
  sessionFlag: {
    fontSize: 28,
  },
  sessionLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 17,
    fontWeight: '600' as const,
    flex: 1,
  },
  sessionLabelActive: {
    color: tradnexTheme.accent,
  },
  sessionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10,132,255,0.18)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  healthIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(10,132,255,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  trialBadge: {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(255,149,0,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trialBadgeText: {
    color: tradnexTheme.warning,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  featureList: {
    gap: 14,
    marginTop: 12,
  },
  featureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  featureText: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  primaryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: 999,
    backgroundColor: tradnexTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: tradnexTheme.white,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  skipButton: {
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  skipText: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dotsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: {
    backgroundColor: tradnexTheme.accent,
    width: 24,
  },
});
