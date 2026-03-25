import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BrainCircuit, HeartPulse, Loader, MoonStar, RefreshCw, Sparkles } from 'lucide-react-native';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { StressGauge } from '@/components/stress-gauge';
import { tradnexTheme, tradnexFonts } from '@/constants/tradnex-theme';
import { useAuth } from '@/providers/auth-provider';
import { useTradnex } from '@/providers/tradnex-provider';
import { formatSleepDuration, getVitalIndex, getStressColor } from '@/utils/tradnex';
import { getAiAdvice, getFallbackAdvice } from '@/services/ai-coach';

function getRelativeSyncLabel(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '\u00C0 l\'instant';
  if (diffMin === 1) return 'Il y a 1 min';
  if (diffMin < 60) return `Il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return 'Il y a 1h';
  return `Il y a ${diffH}h`;
}

function AiPulse() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.aiPulseDot, { opacity: pulseAnim }]} />
  );
}

export default function HomeScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    healthConsentAccepted,
    healthConnected,
    isHydrating,
    lastSyncAt,
    latestHealth,
    recommendation,
    refreshHealthMutation,
    settings,
    history,
    personalPatterns,
  } = useTradnex();

  useEffect(() => {
    if (authLoading || isHydrating) return;
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    if (!healthConsentAccepted) {
      router.replace('/health-permissions');
    }
  }, [isAuthenticated, authLoading, healthConsentAccepted, isHydrating]);

  const syncLabel = useMemo(() => {
    return getRelativeSyncLabel(lastSyncAt);
  }, [lastSyncAt]);

  const vitalIndex = useMemo(() => {
    if (!latestHealth) return 0;
    return getVitalIndex(latestHealth.stress, latestHealth.sleepScore, latestHealth.hrv);
  }, [latestHealth]);

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!latestHealth) return '';
      const snapshot = {
        stress: latestHealth.stress,
        sleepScore: latestHealth.sleepScore,
        sleepHours: latestHealth.sleepHours,
        heartRate: latestHealth.heartRate,
        hrv: latestHealth.hrv,
      };
      return getAiAdvice(snapshot, settings.traderProfile, history.slice(-7));
    },
    onSuccess: (result) => {
      if (result) setAiAdvice(result);
    },
    onError: () => {
      if (latestHealth) {
        setAiAdvice(getFallbackAdvice({
          stress: latestHealth.stress,
          sleepScore: latestHealth.sleepScore,
          sleepHours: latestHealth.sleepHours,
          heartRate: latestHealth.heartRate,
          hrv: latestHealth.hrv,
        }));
      }
    },
  });

  const aiRequestedRef = useRef(false);

  useEffect(() => {
    if (latestHealth && !aiRequestedRef.current) {
      aiRequestedRef.current = true;
      aiMutation.mutate();
    }
  }, [latestHealth, aiMutation]);

  const handleRefreshAi = useCallback(() => {
    setAiAdvice(null);
    aiMutation.mutate();
  }, [aiMutation]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (authLoading || isHydrating || !isAuthenticated || !healthConsentAccepted) {
    return (
      <View style={styles.background}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.loadingWrap}>
            <Loader color={tradnexTheme.accent} size={20} />
            <Text style={styles.loadingText}>Chargement</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="screen-shell-scroll">
          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.pageTitle}>État actuel</Text>
                <Text style={styles.headerMeta}>{healthConnected ? syncLabel : 'Mode aper\u00e7u'}</Text>
              </View>
              <Pressable onPress={() => void refreshHealthMutation.mutateAsync()} style={styles.refreshButton} testID="refresh-health-button">
                <RefreshCw color={tradnexTheme.textSecondary} size={16} />
              </Pressable>
            </View>

            {latestHealth ? (
              <>
                <StressGauge value={vitalIndex} />

                <View style={[styles.decisionCard, { backgroundColor: recommendation?.color ? recommendation.color + '18' : '#0A1E3D' }]}>
                  <View style={styles.decisionHeader}>
                    <BrainCircuit color={recommendation?.color ?? tradnexTheme.accent} size={18} />
                    <Text style={styles.decisionLabel}>Décision</Text>
                  </View>
                  <Text style={styles.decisionTitle}>{recommendation?.title ?? 'Analyse en attente'}</Text>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIconRow}>
                      <MoonStar color={tradnexTheme.blue} size={16} />
                      <Text style={styles.metricLabel}>SOMMEIL</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueFixed}>{latestHealth.sleepScore}<Text style={styles.metricUnit}>%</Text></Text>
                      <Text style={styles.metricSideInfo}>{formatSleepDuration(latestHealth.sleepHours)}</Text>
                    </View>
                    <View style={[styles.statusBar, { backgroundColor: tradnexTheme.blue + '30' }]}>
                      <View style={[styles.statusBarFill, { width: `${latestHealth.sleepScore}%` as unknown as number, backgroundColor: tradnexTheme.blue }]} />
                    </View>
                  </View>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIconRow}>
                      <HeartPulse color={tradnexTheme.danger} size={16} />
                      <Text style={styles.metricLabel} numberOfLines={1}>FREQ. CARDIAQUE</Text>
                    </View>
                    <Text style={styles.metricValueFixed}>{latestHealth.heartRate}<Text style={styles.metricUnit}> bpm</Text></Text>
                    <View style={[styles.statusBar, { backgroundColor: tradnexTheme.danger + '30' }]}>
                      <View style={[styles.statusBarFill, { width: `${Math.min(100, (latestHealth.heartRate / 120) * 100)}%` as unknown as number, backgroundColor: tradnexTheme.danger }]} />
                    </View>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIconRow}>
                      <Activity color={tradnexTheme.warning} size={16} />
                      <Text style={styles.metricLabel}>STRESS</Text>
                    </View>
                    <Text style={styles.metricValueFixed}>{latestHealth.stress}<Text style={styles.metricUnit}>%</Text></Text>
                    <View style={[styles.statusBar, { backgroundColor: getStressColor(latestHealth.stress) + '30' }]}>
                      <View style={[styles.statusBarFill, { width: `${latestHealth.stress}%` as unknown as number, backgroundColor: getStressColor(latestHealth.stress) }]} />
                    </View>
                  </View>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIconRow}>
                      <Activity color={tradnexTheme.success} size={16} />
                      <Text style={styles.metricLabel}>RÉCUPÉRATION</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueFixed}>{latestHealth.hrv}<Text style={styles.metricUnit}>%</Text></Text>
                      <Text style={styles.metricHrvLabel}>HRV</Text>
                    </View>
                    <View style={[styles.statusBar, { backgroundColor: tradnexTheme.success + '30' }]}>
                      <View style={[styles.statusBarFill, { width: `${Math.min(100, latestHealth.hrv * 1.2)}%` as unknown as number, backgroundColor: tradnexTheme.success }]} />
                    </View>
                  </View>
                </View>

                {personalPatterns && personalPatterns.totalSessions >= 5 ? (
                  <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                      <View style={styles.aiBadge}>
                        <Sparkles color="#000" size={10} />
                        <Text style={styles.aiBadgeText}>IA</Text>
                      </View>
                      <Text style={styles.insightTitle}>VOS TENDANCES</Text>
                    </View>
                    <View style={styles.insightGrid}>
                      <View style={styles.insightItem}>
                        <Text style={styles.insightValue}>{personalPatterns.profitableCount}/{personalPatterns.totalSessions}</Text>
                        <Text style={styles.insightLabel}>Sessions gagnantes</Text>
                      </View>
                      {personalPatterns.lossRateBelow50 !== null ? (
                        <View style={styles.insightItem}>
                          <Text style={[styles.insightValue, { color: tradnexTheme.danger }]}>{personalPatterns.lossRateBelow50}%</Text>
                          <Text style={styles.insightLabel}>Pertes sous score 50</Text>
                        </View>
                      ) : null}
                      {personalPatterns.bestDayName ? (
                        <View style={styles.insightItem}>
                          <Text style={[styles.insightValue, { color: tradnexTheme.success }]}>{personalPatterns.bestDayName}</Text>
                          <Text style={styles.insightLabel}>Meilleur jour ({personalPatterns.bestDayRate}%)</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.aiCard}>
                  <View style={styles.aiHeader}>
                    <View style={styles.aiBadge}>
                      <Sparkles color="#000" size={10} />
                      <Text style={styles.aiBadgeText}>IA</Text>
                    </View>
                    <Text style={styles.aiCardTitle}>ANALYSE EN DIRECT</Text>
                    {aiMutation.isPending ? <AiPulse /> : (
                      <Pressable onPress={handleRefreshAi} style={styles.aiRefresh} testID="refresh-ai-btn">
                        <RefreshCw color={tradnexTheme.textMuted} size={13} />
                      </Pressable>
                    )}
                  </View>
                  {aiMutation.isPending && !aiAdvice ? (
                    <View style={styles.aiLoading}>
                      <Loader color={tradnexTheme.accent} size={14} />
                      <Text style={styles.aiLoadingText}>Analyse de vos données...</Text>
                    </View>
                  ) : (
                    <Text style={styles.aiBody}>{aiAdvice}</Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Données indisponibles</Text>
                <Text style={styles.emptyBody}>Aucune mesure à afficher.</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  inner: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  pageTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    fontFamily: tradnexFonts.regular,
  },
  headerMeta: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    marginTop: 2,
    fontFamily: tradnexFonts.regular,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: tradnexTheme.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  decisionCard: {
    borderRadius: 16,
    backgroundColor: '#0A1E3D',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.25)',
    padding: 16,
    gap: 8,
  },
  decisionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  decisionLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    fontFamily: tradnexFonts.regular,
  },
  decisionTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800' as const,
    fontFamily: tradnexFonts.regular,
  },
  metricsGrid: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    gap: 6,
  },
  metricIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  metricLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontFamily: tradnexFonts.regular,
  },
  metricValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
    fontFamily: tradnexFonts.regular,
  },
  metricValueFixed: {
    color: tradnexTheme.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
    fontFamily: tradnexFonts.regular,
  },
  metricValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 6,
  },
  metricHrvLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
  },
  metricSubHidden: {
    fontSize: 12,
    color: 'transparent' as const,
  },
  metricSideInfo: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
    marginLeft: 4,
    fontFamily: tradnexFonts.regular,
  },
  metricUnit: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
  },
  metricSub: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontFamily: tradnexFonts.regular,
  },
  statusBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  statusBarFill: {
    height: 4,
    borderRadius: 2,
  },
  insightCard: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.1)',
    padding: 16,
    gap: 12,
  },
  insightHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  insightTitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontFamily: tradnexFonts.regular,
  },
  insightGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  insightItem: {
    flex: 1,
    minWidth: 80,
    gap: 3,
  },
  insightValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800' as const,
    fontFamily: tradnexFonts.regular,
  },
  insightLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontFamily: tradnexFonts.regular,
  },
  aiCard: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.1)',
    padding: 16,
    gap: 12,
  },
  aiHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: tradnexTheme.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
    fontFamily: tradnexFonts.regular,
  },
  aiCardTitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    flex: 1,
    fontFamily: tradnexFonts.regular,
  },
  aiBody: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: tradnexFonts.regular,
  },
  aiPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tradnexTheme.accent,
    marginLeft: 'auto' as const,
  },
  aiRefresh: {
    marginLeft: 'auto' as const,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  aiLoading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 4,
  },
  aiLoadingText: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontStyle: 'italic' as const,
    fontFamily: tradnexFonts.regular,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  loadingText: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontFamily: tradnexFonts.regular,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800' as const,
    fontFamily: tradnexFonts.regular,
  },
  emptyBody: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontFamily: tradnexFonts.regular,
  },
});
