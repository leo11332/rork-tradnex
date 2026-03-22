import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BrainCircuit, HeartPulse, Loader, MoonStar, RefreshCw, Sparkles } from 'lucide-react-native';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { StressGauge } from '@/components/stress-gauge';
import { tradnexTheme } from '@/constants/tradnex-theme';
import { useAuth } from '@/providers/auth-provider';
import { useTradnex } from '@/providers/tradnex-provider';
import { formatSleepDuration, getVitalIndex, getStressColor } from '@/utils/tradnex';
import { getAiAdvice, getFallbackAdvice } from '@/services/ai-coach';

function getRelativeSyncLabel(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'À l\'instant';
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
    onboardingCompleted,
  } = useTradnex();

  useEffect(() => {
    if (authLoading || isHydrating) return;
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    if (!onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }
    if (!healthConsentAccepted) {
      router.replace('/health-permissions');
    }
  }, [isAuthenticated, authLoading, healthConsentAccepted, isHydrating, onboardingCompleted]);

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
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (authLoading || isHydrating || !isAuthenticated || !onboardingCompleted || !healthConsentAccepted) {
    return (
      <View style={styles.background}>
        <LinearGradient colors={['#04101E', '#020810', '#000000']} style={styles.gradient}>
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.loadingCard}><Text style={styles.loadingTitle}>Chargement</Text></View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <LinearGradient colors={['#04101E', '#020810', '#000000']} style={styles.gradient}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="screen-shell-scroll">
            <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.headerRow}>
                <Text style={styles.pageTitle}>{"\u00c9"}tat g{"\u00e9"}n{"\u00e9"}ral</Text>
                <Pressable onPress={() => void refreshHealthMutation.mutateAsync()} style={styles.refreshButton} testID="refresh-health-button">
                  <RefreshCw color={tradnexTheme.accent} size={16} />
                </Pressable>
              </View>
              <Text style={styles.headerMeta}>{healthConnected ? syncLabel : 'Mode aper\u00e7u'}</Text>

              {latestHealth ? (
                <>
                  <StressGauge value={vitalIndex} />

                  <View style={styles.row}>
                    <View style={styles.metricCard}>
                      <MoonStar color={tradnexTheme.success} size={20} />
                      <Text style={styles.metricValue}>{latestHealth.sleepScore}</Text>
                      <Text style={styles.metricLabel}>Sommeil</Text>
                      <Text style={styles.metricSubvalue}>{formatSleepDuration(latestHealth.sleepHours)}</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <HeartPulse color={tradnexTheme.danger} size={20} />
                      <Text style={styles.metricValue}>{latestHealth.heartRate}</Text>
                      <Text style={styles.metricLabel}>Cardiaque</Text>
                      <Text style={styles.metricSubvalue}>bpm</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.metricCard}>
                      <Activity color={tradnexTheme.accent} size={20} />
                      <Text style={styles.metricValue}>{latestHealth.stress}</Text>
                      <Text style={styles.metricLabel}>Stress</Text>
                      <View style={[styles.metricDot, { backgroundColor: getStressColor(latestHealth.stress) }]} />
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.hrvChipSmall}>HRV</Text>
                      <Text style={styles.metricValue}>{latestHealth.hrv}</Text>
                      <Text style={styles.metricLabel}>R{"\u00e9"}cup{"\u00e9"}ration</Text>
                      <Text style={styles.metricSubvalue}>ms</Text>
                    </View>
                  </View>

                  <LinearGradient colors={['rgba(10,132,255,0.18)', 'rgba(10,132,255,0.04)']} style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                      <BrainCircuit color={recommendation?.color ?? tradnexTheme.accent} size={20} />
                      <Text style={styles.recommendationTitle}>D{"\u00e9"}cision</Text>
                    </View>
                    <Text style={styles.recommendationBody}>{recommendation?.title ?? 'Analyse en attente'}</Text>
                  </LinearGradient>

                  {personalPatterns && personalPatterns.totalSessions >= 5 ? (
                    <View style={styles.patternsCard}>
                      <View style={styles.patternsHeader}>
                        <View style={styles.aiBadge}>
                          <Sparkles color="#fff" size={11} />
                          <Text style={styles.aiBadgeText}>IA</Text>
                        </View>
                        <Text style={styles.patternsTitle}>Vos patterns</Text>
                      </View>
                      <View style={styles.patternsGrid}>
                        <View style={styles.patternItem}>
                          <Text style={styles.patternValue}>{personalPatterns.profitableCount}/{personalPatterns.totalSessions}</Text>
                          <Text style={styles.patternLabel}>Sessions gagnantes</Text>
                        </View>
                        {personalPatterns.lossRateBelow50 !== null ? (
                          <View style={styles.patternItem}>
                            <Text style={[styles.patternValue, { color: tradnexTheme.danger }]}>{personalPatterns.lossRateBelow50}%</Text>
                            <Text style={styles.patternLabel}>Pertes sous score 50</Text>
                          </View>
                        ) : null}
                        {personalPatterns.bestDayName ? (
                          <View style={styles.patternItem}>
                            <Text style={[styles.patternValue, { color: tradnexTheme.success }]}>{personalPatterns.bestDayName}</Text>
                            <Text style={styles.patternLabel}>Meilleur jour ({personalPatterns.bestDayRate}%)</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.aiCard}>
                    <View style={styles.aiHeader}>
                      <View style={styles.aiBadge}>
                        <Sparkles color="#fff" size={11} />
                        <Text style={styles.aiBadgeText}>IA</Text>
                      </View>
                      <Text style={styles.aiTitle}>Conseil en direct</Text>
                      {aiMutation.isPending ? <AiPulse /> : (
                        <Pressable onPress={handleRefreshAi} style={styles.aiRefresh} testID="refresh-ai-btn">
                          <RefreshCw color={tradnexTheme.textMuted} size={14} />
                        </Pressable>
                      )}
                    </View>
                    {aiMutation.isPending && !aiAdvice ? (
                      <View style={styles.aiLoading}>
                        <Loader color={tradnexTheme.accent} size={16} />
                        <Text style={styles.aiLoadingText}>Analyse de vos donn{"\u00e9"}es...</Text>
                      </View>
                    ) : (
                      <Text style={styles.aiBody} numberOfLines={5}>{aiAdvice}</Text>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingTitle}>Donn{"\u00e9"}es indisponibles</Text>
                  <Text style={styles.loadingBody}>Aucune mesure {"\u00e0"} afficher.</Text>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: tradnexTheme.background,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  inner: {
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  headerMeta: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    marginTop: -10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 8,
  },
  metricValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 30,
    fontWeight: '800' as const,
  },
  metricLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
  },
  metricSubvalue: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hrvChipSmall: {
    alignSelf: 'flex-start' as const,
    color: tradnexTheme.warning,
    backgroundColor: 'rgba(255,149,0,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden' as const,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  patternsCard: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.12)',
    padding: 18,
    gap: 14,
  },
  patternsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  patternsTitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  patternsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  patternItem: {
    flex: 1,
    minWidth: 80,
    gap: 4,
  },
  patternValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  patternLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
  },
  recommendationCard: {
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.18)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recommendationTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  recommendationBody: {
    color: tradnexTheme.textPrimary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800' as const,
  },
  aiCard: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.12)',
    padding: 18,
    gap: 14,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tradnexTheme.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  aiTitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  aiBody: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    borderRadius: 28,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 24,
    gap: 10,
  },
  loadingTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  loadingBody: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
  },
  aiPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tradnexTheme.accent,
    marginLeft: 'auto',
  },
  aiRefresh: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  aiLoadingText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
