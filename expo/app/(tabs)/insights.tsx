import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useMemo } from 'react';
import { BrainCircuit, Calendar, HeartPulse, Lock, MoonStar, Sparkles, Target, TrendingUp } from 'lucide-react-native';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  index: number;
}

function InsightCard({ icon, title, value, description, index }: InsightCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = 100 + index * 80;
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[cardStyles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={cardStyles.iconRow}>
        <View style={cardStyles.iconWrap}>{icon}</View>
        <Text style={cardStyles.title}>{title}</Text>
      </View>
      <Text style={cardStyles.value}>{value}</Text>
      <Text style={cardStyles.description}>{description}</Text>
    </Animated.View>
  );
}

function LockedCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View style={lockedStyles.container}>
      <View style={lockedStyles.row}>
        <View style={lockedStyles.iconWrap}>{icon}</View>
        <Text style={lockedStyles.title}>{title}</Text>
        <Lock color={tradnexTheme.textMuted} size={14} />
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const { insightPatterns, sessionLogs, isHydrating, healthConsentAccepted } = useTradnex();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const sessionCount = sessionLogs.length;
  const progressRatio = Math.min(sessionCount / 5, 1);

  const insightCards = useMemo(() => {
    if (!insightPatterns) return [];
    const cards: InsightCardProps[] = [];

    if (insightPatterns.scoreThreshold !== null && insightPatterns.lossRateBelowThreshold !== null) {
      cards.push({
        icon: <Target color={tradnexTheme.danger} size={18} />,
        title: 'Seuil de performance',
        value: `Score < ${insightPatterns.scoreThreshold} = ${insightPatterns.lossRateBelowThreshold}% de pertes`,
        description: `Quand votre Tradnex Score est en dessous de ${insightPatterns.scoreThreshold}, vous perdez ${insightPatterns.lossRateBelowThreshold}% du temps.`,
        index: 0,
      });
    }

    if (insightPatterns.bestDayName) {
      cards.push({
        icon: <Calendar color={tradnexTheme.success} size={18} />,
        title: 'Meilleur jour',
        value: `${insightPatterns.bestDayName} \u2014 ${insightPatterns.bestDayRate}% de succ\u00e8s`,
        description: `Vous tradez mieux le ${insightPatterns.bestDayName}. Vos sessions ce jour sont profitables ${insightPatterns.bestDayRate}% du temps.`,
        index: 1,
      });
    }

    if (insightPatterns.avgSleepProfitable !== null && insightPatterns.avgSleepLoss !== null) {
      cards.push({
        icon: <MoonStar color={tradnexTheme.accent} size={18} />,
        title: 'Impact du sommeil',
        value: `${insightPatterns.avgSleepProfitable}h vs ${insightPatterns.avgSleepLoss}h`,
        description: `Vous dormez en moyenne ${insightPatterns.avgSleepProfitable}h avant vos sessions profitables contre ${insightPatterns.avgSleepLoss}h avant vos pertes.`,
        index: 2,
      });
    }

    if (insightPatterns.avgScoreProfit !== null && insightPatterns.avgScoreLoss !== null) {
      const neutralLabel = insightPatterns.avgScoreNeutral !== null ? ` \u00b7 Neutre : ${insightPatterns.avgScoreNeutral}` : '';
      cards.push({
        icon: <TrendingUp color={tradnexTheme.warning} size={18} />,
        title: 'Score par r\u00e9sultat',
        value: `Gain : ${insightPatterns.avgScoreProfit} \u00b7 Perte : ${insightPatterns.avgScoreLoss}${neutralLabel}`,
        description: `Score moyen avant une session profitable : ${insightPatterns.avgScoreProfit}/100. Avant une perte : ${insightPatterns.avgScoreLoss}/100.`,
        index: 3,
      });
    }

    if (insightPatterns.avgHrv !== null) {
      const trendLabel = insightPatterns.hrvTrend7d !== null
        ? (insightPatterns.hrvTrend7d > 0 ? `hausse de ${insightPatterns.hrvTrend7d}%` : `baisse de ${Math.abs(insightPatterns.hrvTrend7d)}%`)
        : 'stable';
      cards.push({
        icon: <HeartPulse color={tradnexTheme.success} size={18} />,
        title: 'Tendance HRV',
        value: `${insightPatterns.avgHrv} ms \u2014 ${trendLabel}`,
        description: `Votre HRV moyen est de ${insightPatterns.avgHrv} ms. Les 7 derniers jours : ${trendLabel}.${insightPatterns.hrvTrend7d !== null && insightPatterns.hrvTrend7d < -5 ? ' Un HRV en baisse prolonge signale une fatigue accumul\u00e9e.' : ''}`,
        index: 4,
      });
    }

    cards.push({
      icon: <Sparkles color={tradnexTheme.accent} size={18} />,
      title: 'Recommandation hebdo',
      value: buildWeeklyRecommendation(insightPatterns),
      description: 'G\u00e9n\u00e9r\u00e9 automatiquement selon vos patterns des 30 derniers jours.',
      index: 5,
    });

    return cards;
  }, [insightPatterns]);

  if (isHydrating || !healthConsentAccepted) {
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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.pageTitle}>Insights</Text>

              {sessionCount < 5 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <BrainCircuit color={tradnexTheme.accent} size={42} />
                  </View>
                  <Text style={styles.emptyTitle}>Vos insights personnels se construisent</Text>
                  <Text style={styles.emptySubtitle}>Loggez vos sessions de trading pour que TRADNEX apprenne vos patterns</Text>

                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{sessionCount}/5 sessions</Text>
                  </View>

                  <View style={styles.lockedList}>
                    <LockedCard title="Seuil de performance" icon={<Target color={tradnexTheme.textMuted} size={16} />} />
                    <LockedCard title="Meilleur jour" icon={<Calendar color={tradnexTheme.textMuted} size={16} />} />
                    <LockedCard title="Impact du sommeil" icon={<MoonStar color={tradnexTheme.textMuted} size={16} />} />
                    <LockedCard title="Score par r\u00e9sultat" icon={<TrendingUp color={tradnexTheme.textMuted} size={16} />} />
                    <LockedCard title="Tendance HRV" icon={<HeartPulse color={tradnexTheme.textMuted} size={16} />} />
                    <LockedCard title="Recommandation hebdo" icon={<Sparkles color={tradnexTheme.textMuted} size={16} />} />
                  </View>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {insightCards.map((card, i) => (
                    <InsightCard key={`insight-${i}`} {...card} />
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function buildWeeklyRecommendation(patterns: NonNullable<ReturnType<typeof useTradnex>['insightPatterns']>): string {
  const parts: string[] = [];
  if (patterns.bestDayName) {
    const worstDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].filter(d => d !== patterns.bestDayName);
    if (worstDays.length > 0) {
      parts.push(`Privil\u00e9giez le ${patterns.bestDayName}`);
    }
  }
  if (patterns.scoreThreshold !== null) {
    parts.push(`\u00e9vitez de trader quand votre score est sous ${patterns.scoreThreshold}`);
  }
  if (patterns.avgSleepProfitable !== null && patterns.avgSleepProfitable >= 7) {
    parts.push(`visez ${patterns.avgSleepProfitable}h+ de sommeil`);
  }
  if (parts.length === 0) return 'Continuez \u00e0 loguer vos sessions pour affiner vos recommandations.';
  return parts.join(', ') + '.';
}

const cardStyles = StyleSheet.create({
  container: {
    borderRadius: 22,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.12)',
    padding: 18,
    gap: 10,
  },
  iconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(10,132,255,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  value: {
    color: tradnexTheme.accent,
    fontSize: 16,
    fontWeight: '800' as const,
    lineHeight: 22,
  },
  description: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});

const lockedStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
});

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
  pageTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  emptyState: {
    alignItems: 'center' as const,
    gap: 16,
    paddingTop: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(10,132,255,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center' as const,
    paddingHorizontal: 10,
  },
  progressRow: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: tradnexTheme.accent,
  },
  progressText: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  lockedList: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  cardList: {
    gap: 14,
  },
  loadingCard: {
    borderRadius: 28,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 24,
    margin: 20,
  },
  loadingTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
});
