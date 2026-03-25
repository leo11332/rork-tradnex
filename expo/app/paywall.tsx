import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import React, { useCallback } from 'react';
import { BrainCircuit, Check, Crown, Loader, RefreshCw, Shield, Sparkles, TrendingUp, X } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PurchasesPackage } from 'react-native-purchases';

import { tradnexTheme, tradnexFonts } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/services/revenuecat';

export default function PaywallScreen() {
  const { onPurchaseSuccess } = useTradnex();

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: () => getOfferings(),
    staleTime: 5 * 60 * 1000,
  });

  const monthlyPkg = offeringsQuery.data?.availablePackages?.find(
    (p) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly',
  ) ?? null;

  const yearlyPkg = offeringsQuery.data?.availablePackages?.find(
    (p) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual',
  ) ?? null;

  const buyMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      return purchasePackage(pkg);
    },
    onSuccess: (result) => {
      if (result.success) {
        onPurchaseSuccess();
        router.back();
      } else if (result.error && result.error !== 'cancelled') {
        Alert.alert('Erreur', result.error);
      }
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      return restorePurchases();
    },
    onSuccess: (result) => {
      if (result.success) {
        onPurchaseSuccess();
        Alert.alert('Restauré', 'Votre abonnement TRADNEX Pro a été restauré.');
        router.back();
      } else {
        Alert.alert('Aucun achat', 'Aucun abonnement actif trouvé pour ce compte.');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  const handleBuy = useCallback((pkg: PurchasesPackage | null) => {
    if (!pkg) return;
    buyMutation.mutate(pkg);
  }, [buyMutation]);

  const isLoading = buyMutation.isPending || restoreMutation.isPending;

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '14,90 €';
  const yearlyPrice = yearlyPkg?.product?.priceString ?? '119,90 €';
  const yearlyMonthly = yearlyPkg?.product?.price
    ? `${(yearlyPkg.product.price / 12).toFixed(2).replace('.', ',')} €`
    : '9,99 €';

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

            <Text style={styles.title}>Ne tradez plus à l'aveugle.</Text>
            <Text style={styles.subtitle}>
              Votre stress, votre sommeil et votre rythme cardiaque influencent directement vos décisions de trading. TRADNEX rend ces données visibles et les analyse pour vous.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <BrainCircuit color={tradnexTheme.accent} size={18} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Vos données invisibles, révélées</Text>
                  <Text style={styles.featureDesc}>L'IA décrypte votre stress, sommeil et HRV pour vous donner un score de préparation avant chaque session</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <Shield color={tradnexTheme.success} size={18} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Évitez le tilt</Text>
                  <Text style={styles.featureDesc}>Recevez une alerte avant que le stress ne prenne le contrôle de vos décisions</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <TrendingUp color={tradnexTheme.warning} size={18} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Gagnez plus, perdez moins</Text>
                  <Text style={styles.featureDesc}>Identifiez vos meilleures fenêtres de performance grâce à 30 jours d'historique personnalisé</Text>
                </View>
              </View>
            </View>

            <View style={styles.socialProof}>
              <Text style={styles.socialProofText}>« Depuis que j'utilise TRADNEX, j'ai évité de nombreux tilts. L'alerte stress m'a sauvé plus d'une fois. »</Text>
              <Text style={styles.socialProofAuthor}>— Trader prop firm, Paris</Text>
            </View>

            {offeringsQuery.isLoading ? (
              <View style={styles.loadingCard}>
                <Loader color={tradnexTheme.accent} size={18} />
                <Text style={styles.loadingText}>Chargement des offres...</Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={[styles.planCard, styles.primaryPlan, isLoading && styles.planCardDisabled]}
                  onPress={() => handleBuy(monthlyPkg)}
                  disabled={isLoading || !monthlyPkg}
                  testID="monthly-plan-button"
                >
                  {buyMutation.isPending && buyMutation.variables?.identifier === monthlyPkg?.identifier ? (
                    <View style={styles.buyingRow}>
                      <Loader color={tradnexTheme.accent} size={16} />
                      <Text style={styles.buyingText}>Achat en cours...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.planBadge}>Le plus direct</Text>
                      <Text style={styles.planTitle}>Mensuel</Text>
                      <Text style={styles.planPrice}>{monthlyPrice}/mois</Text>
                      <Text style={styles.planDescription}>Essai gratuit 5 jours puis {monthlyPrice}/mois. Sans engagement.</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.planCard, isLoading && styles.planCardDisabled]}
                  onPress={() => handleBuy(yearlyPkg)}
                  disabled={isLoading || !yearlyPkg}
                  testID="yearly-plan-button"
                >
                  {buyMutation.isPending && buyMutation.variables?.identifier === yearlyPkg?.identifier ? (
                    <View style={styles.buyingRow}>
                      <Loader color={tradnexTheme.accent} size={16} />
                      <Text style={styles.buyingText}>Achat en cours...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.planBadge}>Meilleure valeur</Text>
                      <Text style={styles.planTitle}>Annuel</Text>
                      <Text style={styles.planPrice}>{yearlyPrice}/an</Text>
                      <Text style={styles.planDescription}>Soit {yearlyMonthly}/mois — économisez sur l'année.</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            <View style={styles.guaranteeRow}>
              <Check color={tradnexTheme.success} size={14} />
              <Text style={styles.guaranteeText}>5 jours d'essai gratuit</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Check color={tradnexTheme.success} size={14} />
              <Text style={styles.guaranteeText}>Annulez à tout moment depuis les réglages</Text>
            </View>

            <Pressable
              style={styles.restoreButton}
              onPress={() => restoreMutation.mutate()}
              disabled={isLoading}
              testID="restore-purchases-button"
            >
              {restoreMutation.isPending ? (
                <Loader color={tradnexTheme.textMuted} size={14} />
              ) : (
                <RefreshCw color={tradnexTheme.textMuted} size={14} />
              )}
              <Text style={styles.restoreText}>Restaurer mes achats</Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Paiement géré par l'App Store. Vos données restent sur votre appareil.
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
    fontFamily: tradnexFonts.regular,
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
    fontFamily: tradnexFonts.regular,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
    fontFamily: tradnexFonts.regular,
  },
  subtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: tradnexFonts.regular,
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
    fontFamily: tradnexFonts.regular,
  },
  featureDesc: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: tradnexFonts.regular,
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
    fontFamily: tradnexFonts.regular,
  },
  socialProofAuthor: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
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
  planCardDisabled: {
    opacity: 0.6,
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
    fontFamily: tradnexFonts.regular,
  },
  planTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
    fontFamily: tradnexFonts.regular,
  },
  planPrice: {
    color: tradnexTheme.white,
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: tradnexFonts.regular,
  },
  planDescription: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: tradnexFonts.regular,
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
    fontFamily: tradnexFonts.regular,
  },
  restoreButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  restoreText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
  },
  loadingCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    padding: 24,
    borderRadius: 20,
    backgroundColor: tradnexTheme.surface,
  },
  loadingText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontFamily: tradnexFonts.regular,
  },
  buyingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingVertical: 12,
  },
  buyingText: {
    color: tradnexTheme.accent,
    fontSize: 15,
    fontWeight: '700' as const,
    fontFamily: tradnexFonts.regular,
  },
  footer: {
    marginTop: 8,
  },
  footerText: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 18,
    fontFamily: tradnexFonts.regular,
  },
});
