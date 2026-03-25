import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Bell, BellRing, ChevronRight, HeartPulse, MoonStar, ShieldCheck, Smartphone, Watch } from 'lucide-react-native';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';
import { registerForPushNotifications } from '@/services/notifications';

type OnboardingStep = 'health' | 'notifications';

export default function HealthPermissionsScreen() {
  const { acceptHealthConsentMutation, healthConsentAccepted } = useTradnex();
  const [step, setStep] = useState<OnboardingStep>('health');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (healthConsentAccepted) {
      router.replace('/(tabs)');
    }
  }, [healthConsentAccepted]);

  const animateTransition = useCallback((nextStep: OnboardingStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleHealthContinue = useCallback(() => {
    animateTransition('notifications');
  }, [animateTransition]);

  const handleNotificationsContinue = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await registerForPushNotifications();
    }
    void acceptHealthConsentMutation.mutateAsync();
  }, [acceptHealthConsentMutation]);

  const handleSkipNotifications = useCallback(() => {
    void acceptHealthConsentMutation.mutateAsync();
  }, [acceptHealthConsentMutation]);

  const isApple = Platform.OS === 'ios' || Platform.OS === 'web';
  const platformName = isApple ? 'Apple Sant\u00e9' : 'Google Sant\u00e9';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071019', '#020407', '#000000']} style={styles.backgroundGlow} />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {step === 'health' ? (
            <>
              <View style={styles.hero}>
                <View style={styles.stepIndicator}>
                  <View style={[styles.stepDot, styles.stepDotActive]} />
                  <View style={styles.stepDot} />
                </View>
                <View style={styles.heroBadge}>
                  <ShieldCheck color={tradnexTheme.accent} size={16} />
                  <Text style={styles.heroBadgeText}>\u00c9tape 1 — Connexion sant\u00e9</Text>
                </View>
                <Text style={styles.title}>Connectez vos donn\u00e9es de sant\u00e9</Text>
                <Text style={styles.body}>
                  TRADNEX analyse votre sommeil, fr\u00e9quence cardiaque et HRV pour \u00e9valuer votre \u00e9tat avant le trading.
                </Text>
              </View>

              <View style={styles.warningCard}>
                <View style={styles.warningIconRow}>
                  <Watch color={tradnexTheme.warning} size={20} />
                  <Text style={styles.warningTitle}>Pr\u00e9requis important</Text>
                </View>
                <Text style={styles.warningBody}>
                  Avant de continuer, assurez-vous que votre montre ou bracelet connect\u00e9 est bien synchronis\u00e9 avec {platformName}.{'\n\n'}
                  Sans cette synchronisation, {platformName} n'aura aucune donn\u00e9e \u00e0 transmettre \u00e0 TRADNEX et l'application ne pourra pas fonctionner correctement.
                </Text>
                <View style={styles.warningSteps}>
                  <View style={styles.warningStepRow}>
                    <View style={styles.warningStepNum}><Text style={styles.warningStepNumText}>1</Text></View>
                    <Text style={styles.warningStepText}>Ouvrez l'app de votre montre et v\u00e9rifiez la synchronisation avec {platformName}</Text>
                  </View>
                  <View style={styles.warningStepRow}>
                    <View style={styles.warningStepNum}><Text style={styles.warningStepNumText}>2</Text></View>
                    <Text style={styles.warningStepText}>Autorisez TRADNEX \u00e0 lire vos donn\u00e9es depuis {platformName}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.featureRow}>
                  <MoonStar color={tradnexTheme.blue} size={18} />
                  <Text style={styles.featureText}>Sommeil de la nuit</Text>
                </View>
                <View style={styles.featureRow}>
                  <HeartPulse color={tradnexTheme.danger} size={18} />
                  <Text style={styles.featureText}>Fr\u00e9quence cardiaque</Text>
                </View>
                <View style={styles.featureRow}>
                  <Activity color={tradnexTheme.warning} size={18} />
                  <Text style={styles.featureText}>HRV et score de stress</Text>
                </View>
              </View>

              <View style={styles.bottomActions}>
                <Pressable
                  onPress={handleHealthContinue}
                  style={styles.primaryButton}
                  testID="accept-health-permissions-button"
                >
                  <Text style={styles.primaryButtonLabel}>Autoriser {platformName}</Text>
                  <ChevronRight color="#000" size={18} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.hero}>
                <View style={styles.stepIndicator}>
                  <View style={[styles.stepDot, styles.stepDotDone]} />
                  <View style={[styles.stepDot, styles.stepDotActive]} />
                </View>
                <View style={styles.heroBadge}>
                  <Bell color={tradnexTheme.accent} size={16} />
                  <Text style={styles.heroBadgeText}>\u00c9tape 2 — Notifications</Text>
                </View>
                <Text style={styles.title}>Restez inform\u00e9 en temps r\u00e9el</Text>
                <Text style={styles.body}>
                  Les notifications vous pr\u00e9viennent quand votre \u00e9tat physiologique change, pour ne jamais trader dans de mauvaises conditions.
                </Text>
              </View>

              <View style={styles.notifCard}>
                <View style={styles.notifFeatureRow}>
                  <View style={[styles.notifIconWrap, { backgroundColor: 'rgba(255,70,84,0.1)' }]}>
                    <Activity color={tradnexTheme.danger} size={16} />
                  </View>
                  <View style={styles.notifFeatureText}>
                    <Text style={styles.notifFeatureTitle}>Alerte stress</Text>
                    <Text style={styles.notifFeatureDesc}>Notification imm\u00e9diate si votre stress d\u00e9passe le seuil configur\u00e9</Text>
                  </View>
                </View>
                <View style={styles.notifFeatureRow}>
                  <View style={[styles.notifIconWrap, { backgroundColor: 'rgba(10,132,255,0.1)' }]}>
                    <BellRing color={tradnexTheme.accent} size={16} />
                  </View>
                  <View style={styles.notifFeatureText}>
                    <Text style={styles.notifFeatureTitle}>Rapport pr\u00e9-session</Text>
                    <Text style={styles.notifFeatureDesc}>Mini-bilan 15 min avant l'ouverture de vos sessions de trading</Text>
                  </View>
                </View>
                <View style={styles.notifFeatureRow}>
                  <View style={[styles.notifIconWrap, { backgroundColor: 'rgba(0,241,155,0.1)' }]}>
                    <Smartphone color={tradnexTheme.success} size={16} />
                  </View>
                  <View style={styles.notifFeatureText}>
                    <Text style={styles.notifFeatureTitle}>Recommandations IA</Text>
                    <Text style={styles.notifFeatureDesc}>Conseils personnalis\u00e9s bas\u00e9s sur vos donn\u00e9es biom\u00e9triques</Text>
                  </View>
                </View>
              </View>

              <View style={styles.previewWrap}>
                <Text style={styles.previewLabel}>APER\u00c7U</Text>
                <View style={styles.previewNotif}>
                  <View style={styles.previewTopRow}>
                    <View style={styles.previewAppIcon}>
                      <Text style={styles.previewAppIconText}>T</Text>
                    </View>
                    <Text style={styles.previewAppName}>TRADNEX</Text>
                    <Text style={styles.previewTime}>maintenant</Text>
                  </View>
                  <Text style={styles.previewTitle}>Rapport pr\u00e9-session — New York</Text>
                  <Text style={styles.previewBody}>Score : 74/100 \u00b7 Stress : 42/100 \u00b7 Sommeil : 7h12{'\n'}Conditions favorables pour trader.</Text>
                </View>
              </View>

              <View style={styles.bottomActions}>
                <Pressable
                  onPress={() => void handleNotificationsContinue()}
                  style={styles.primaryButton}
                  testID="accept-notifications-button"
                >
                  <Text style={styles.primaryButtonLabel}>{acceptHealthConsentMutation.isPending ? 'Connexion...' : 'Activer les notifications'}</Text>
                  <ChevronRight color="#000" size={18} />
                </Pressable>
                <Pressable
                  onPress={handleSkipNotifications}
                  style={styles.skipButton}
                  testID="skip-notifications-button"
                >
                  <Text style={styles.skipButtonText}>Continuer sans notifications</Text>
                </Pressable>
              </View>
            </>
          )}
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
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'space-between' as const,
    gap: 20,
  },
  hero: {
    gap: 12,
  },
  stepIndicator: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 4,
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepDotActive: {
    backgroundColor: tradnexTheme.accent,
  },
  stepDotDone: {
    backgroundColor: tradnexTheme.success,
  },
  heroBadge: {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: tradnexTheme.accent,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800' as const,
  },
  body: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  warningCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
    backgroundColor: 'rgba(255,184,0,0.06)',
    padding: 18,
    gap: 12,
  },
  warningIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  warningTitle: {
    color: tradnexTheme.warning,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  warningBody: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  warningSteps: {
    gap: 10,
    marginTop: 2,
  },
  warningStepRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  warningStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,184,0,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  warningStepNumText: {
    color: tradnexTheme.warning,
    fontSize: 12,
    fontWeight: '800' as const,
  },
  warningStepText: {
    color: tradnexTheme.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(11,11,15,0.92)',
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  featureText: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  notifCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(11,11,15,0.92)',
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 16,
  },
  notifFeatureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notifFeatureText: {
    flex: 1,
    gap: 2,
  },
  notifFeatureTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  notifFeatureDesc: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  previewWrap: {
    gap: 8,
  },
  previewLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  previewNotif: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  previewTopRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 2,
  },
  previewAppIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: tradnexTheme.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  previewAppIconText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900' as const,
  },
  previewAppName: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    flex: 1,
  },
  previewTime: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
  },
  previewTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  previewBody: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  bottomActions: {
    gap: 12,
    marginTop: 'auto' as const,
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
  primaryButtonLabel: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800' as const,
  },
  skipButton: {
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
