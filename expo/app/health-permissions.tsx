import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Activity, ChevronRight, HeartPulse, MoonStar, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';

export default function HealthPermissionsScreen() {
  const { acceptHealthConsentMutation, healthConsentAccepted, healthPlatformLabel } = useTradnex();

  useEffect(() => {
    if (healthConsentAccepted) {
      router.replace('/(tabs)');
    }
  }, [healthConsentAccepted]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071019', '#020407', '#000000']} style={styles.backgroundGlow} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <ShieldCheck color={tradnexTheme.accent} size={16} />
              <Text style={styles.heroBadgeText}>Connexion santé</Text>
            </View>
            <Text style={styles.title}>Autoriser {healthPlatformLabel}</Text>
            <Text style={styles.body}>
              TRADNEX a besoin de lire le sommeil, la fréquence cardiaque et le HRV pour afficher vos métriques en direct.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.featureRow}>
              <MoonStar color={tradnexTheme.success} size={18} />
              <Text style={styles.featureText}>Sommeil de la nuit</Text>
            </View>
            <View style={styles.featureRow}>
              <HeartPulse color={tradnexTheme.danger} size={18} />
              <Text style={styles.featureText}>Fréquence cardiaque</Text>
            </View>
            <View style={styles.featureRow}>
              <Activity color={tradnexTheme.warning} size={18} />
              <Text style={styles.featureText}>HRV et score de stress</Text>
            </View>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>Mode de travail</Text>
            <Text style={styles.demoBody}>En attendant la vraie connexion santé, l’app démarre avec des données fictives pour que l’on puisse construire l’interface ensemble.</Text>
          </View>

          <Pressable
            onPress={() => void acceptHealthConsentMutation.mutateAsync()}
            style={styles.primaryButton}
            testID="accept-health-permissions-button"
          >
            <Text style={styles.primaryButtonLabel}>{acceptHealthConsentMutation.isPending ? 'Connexion...' : 'Autoriser et continuer'}</Text>
            <ChevronRight color={tradnexTheme.white} size={18} />
          </Pressable>
        </View>
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
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'space-between',
    gap: 24,
  },
  hero: {
    gap: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: tradnexTheme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  body: {
    color: tradnexTheme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(11,11,15,0.92)',
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 20,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  demoCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.18)',
    backgroundColor: 'rgba(10,132,255,0.08)',
    padding: 18,
    gap: 8,
  },
  demoTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  demoBody: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: tradnexTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  primaryButtonLabel: {
    color: tradnexTheme.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
