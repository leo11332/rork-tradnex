import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import React from 'react';
import { BrainCircuit, Check, Crown, Shield, Sparkles, TrendingUp, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';

export default function PaywallScreen() {
  const { activatePlan, subscription } = useTradnex();

  return (
    <View style={styles.background}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <LinearGradient colors={['#041221', '#000000', '#000000']} style={styles.gradient}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <Pressable onPress={() => router.back()} style={styles.closeButton} testID="paywall-close-button">
              <X color={tradnexTheme.white} size={18} />
            </Pressable>

            <View style={styles.heroRow}>
              <View style={styles.heroBadge}>
                <Crown color={tradnexTheme.warning} size={18} />
                <Text style={styles.heroBadgeText}>TRADNEX Pro</Text>
              </View>
              <View style={styles.aiBadge}>
                <Sparkles color="#fff" size={12} />
                <Text style={styles.aiBadgeText}>IA</Text>
              </View>
            </View>

            <Text style={styles.title}>Ne tradez plus {"\u00e0"} l'aveugle.</Text>
            <Text style={styles.subtitle}>
              Stress, sommeil, rythme cardiaque : des donn{"\u00e9"}es invisibles qui influencent {"\u00e9"}norm{"\u00e9"}ment vos gains et vos pertes. L'IA TRADNEX les analyse en temps r{"\u00e9"}el et vous alerte au bon moment.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <BrainCircuit color={tradnexTheme.accent} size={18} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Donn{"\u00e9"}es r{"\u00e9"}v{"\u00e9"}l{"\u00e9"}es & analys{"\u00e9"}es par l'IA</Text>
                  <Text style={styles.featureDesc}>Stress, sommeil, rythme cardiaque : l'IA d{"\u00e9"}crypte vos donn{"\u00e9"}es invisibles et vous alerte en temps r{"\u00e9"}el</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <Shield color={tradnexTheme.success} size={18} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{"\u00c9"}vitez le tilt</Text>
                  <Text style={styles.featureDesc}>Alertes IA avant que le stress ne prenne le contr{"\u00f4"}le de vos d{"\u00e9"}cisions</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <TrendingUp color={tradnexTheme.warning} size={18} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Gagnez plus en perdant moins</Text>
                  <Text style={styles.featureDesc}>Suivez vos tendances sur 30 jours et identifiez vos meilleures fen{"\u00ea"}tres de performance</Text>
                </View>
              </View>
            </View>

            <View style={styles.socialProof}>
              <Text style={styles.socialProofText}>{"\u00ab"} Depuis que j'utilise TRADNEX, j'ai {"\u00e9"}vit{"\u00e9"} de nombreux tilts. L'alerte stress m'a sauv{"\u00e9"} plus d'une fois. {"\u00bb"}</Text>
              <Text style={styles.socialProofAuthor}>— Trader prop firm, Paris</Text>
            </View>

            <Pressable
              style={[styles.planCard, styles.primaryPlan]}
              onPress={() => {
                activatePlan('monthly');
                router.back();
              }}
              testID="monthly-plan-button"
            >
              <Text style={styles.planBadge}>Le plus direct</Text>
              <Text style={styles.planTitle}>Mensuel</Text>
              <Text style={styles.planPrice}>{"19,90\u20AC/mois"}</Text>
              <Text style={styles.planDescription}>{"Essai gratuit 5 jours puis 19,90\u20AC/mois. Sans engagement."}</Text>
            </Pressable>

            <Pressable
              style={styles.planCard}
              onPress={() => {
                activatePlan('yearly');
                router.back();
              }}
              testID="yearly-plan-button"
            >
              <Text style={styles.planBadge}>Meilleure valeur</Text>
              <Text style={styles.planTitle}>Annuel</Text>
              <Text style={styles.planPrice}>{"159,90\u20AC/an"}</Text>
              <Text style={styles.planDescription}>{"Soit 13,32\u20AC/mois \u2014 \u00e9conomisez 79\u20AC par an."}</Text>
            </Pressable>

            <View style={styles.guaranteeRow}>
              <Check color={tradnexTheme.success} size={14} />
              <Text style={styles.guaranteeText}>5 jours d'essai gratuit, sans carte bancaire</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Check color={tradnexTheme.success} size={14} />
              <Text style={styles.guaranteeText}>Annulez {"\u00e0"} tout moment depuis les r{"\u00e9"}glages</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {subscription.adminBypass ? 'Bypass admin actif.' : "Vos donn\u00e9es restent sur votre appareil. Aucun partage avec des tiers."}
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: tradnexTheme.background,
  },
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  heroRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  heroBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,149,0,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroBadgeText: {
    color: tradnexTheme.warning,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  aiBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  subtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  featureList: {
    gap: 16,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  featureContent: {
    flex: 1,
    gap: 3,
  },

  featureTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },

  featureDesc: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  socialProof: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    gap: 8,
  },
  socialProofText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic' as const,
  },
  socialProofAuthor: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planCard: {
    borderRadius: 28,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 20,
    gap: 8,
  },
  primaryPlan: {
    borderColor: tradnexTheme.borderStrong,
    backgroundColor: '#08111D',
  },
  planBadge: {
    alignSelf: 'flex-start' as const,
    color: tradnexTheme.accent,
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden' as const,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  planTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
  },
  planPrice: {
    color: tradnexTheme.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  planDescription: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  guaranteeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 4,
  },
  guaranteeText: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
  },
  footer: {
    marginTop: 8,
  },
  footerText: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});
