import { generateText } from '@rork-ai/toolkit-sdk';
import { HealthDay } from '@/mocks/health';
import { TraderProfile } from '@/providers/tradnex-provider';

export interface HealthSnapshot {
  stress: number;
  sleepScore: number;
  sleepHours: number;
  heartRate: number;
  hrv: number;
}

function buildSystemPrompt(profile: TraderProfile): string {
  return `Tu es une IA d'analyse biométrique intégrée à TRADNEX, une app pour traders. Tu analyses les données physiologiques du trader pour lui donner un récapitulatif clair de son état.

PROFIL DU TRADER :
- Psychologie de nature : ${profile.psychology}
- Patience : ${profile.patience}
- Tolérance au risque : ${profile.riskTolerance}

RÈGLES STRICTES :
- Réponds TOUJOURS en français
- Maximum 3 à 4 phrases courtes, pas plus. Le texte doit tenir en 5 lignes sur un écran mobile
- Tu décris l'état actuel du trader à partir de ses données (stress, sommeil, FC, HRV)
- Tu donnes des observations factuelles : "votre stress est élevé", "votre sommeil était court"
- Tu peux ajouter un conseil LÉGER : "soyez particulièrement patient aujourd'hui", "restez vigilant sur vos émotions"
- Si le stress est TRÈS élevé (>80) ou la FC très haute (>100), tu peux suggérer une pause. C'est le MAXIMUM de conseil que tu donnes.
- Ne recommande JAMAIS un type ou style de trading (pas de day trading, scalping, swing, etc.)
- Ne dis JAMAIS de changer de stratégie ou d'approche de trading
- Ne parle JAMAIS d'hydratation
- Ne fais JAMAIS de recommandation d'achat/vente
- Tu ne donnes PAS de conseils techniques sur le trading, seulement sur l'état physique/mental
- Sois factuel et bienveillant, pas alarmiste. Le trader peut être dans un état instable, ne le stresse pas davantage
- Phrases courtes et claires`;
}

export function buildHealthContext(snapshot: HealthSnapshot, recentHistory?: HealthDay[]): string {
  const lines: string[] = [
    `DONNÉES ACTUELLES :`,
    `- Stress : ${snapshot.stress}/100`,
    `- Score sommeil : ${snapshot.sleepScore}/100`,
    `- Durée sommeil : ${snapshot.sleepHours}h`,
    `- Fréquence cardiaque : ${snapshot.heartRate} bpm`,
    `- HRV : ${snapshot.hrv} ms`,
  ];

  if (snapshot.stress > 80) {
    lines.push(`⚠️ ALERTE : Stress en zone critique`);
  }
  if (snapshot.heartRate > 95) {
    lines.push(`⚠️ ALERTE : Fréquence cardiaque élevée`);
  }
  if (snapshot.sleepHours < 5.5) {
    lines.push(`⚠️ ALERTE : Déficit de sommeil important`);
  }

  if (recentHistory && recentHistory.length > 1) {
    const last3 = recentHistory.slice(-3);
    const avgStress = Math.round(last3.reduce((s, d) => s + d.stress, 0) / last3.length);
    const avgSleep = (last3.reduce((s, d) => s + d.sleepHours, 0) / last3.length).toFixed(1);
    const avgHR = Math.round(last3.reduce((s, d) => s + d.heartRate, 0) / last3.length);
    lines.push('');
    lines.push(`TENDANCE 3 DERNIERS JOURS :`);
    lines.push(`- Stress moyen : ${avgStress}/100`);
    lines.push(`- Sommeil moyen : ${avgSleep}h`);
    lines.push(`- FC moyenne : ${avgHR} bpm`);

    const stressTrend = snapshot.stress - avgStress;
    if (stressTrend > 10) {
      lines.push(`📈 Le stress est en hausse significative`);
    } else if (stressTrend < -10) {
      lines.push(`📉 Le stress est en baisse, bonne tendance`);
    }
  }

  return lines.join('\n');
}

export async function getAiAdvice(
  snapshot: HealthSnapshot,
  profile: TraderProfile,
  recentHistory?: HealthDay[],
): Promise<string> {
  try {
    const systemPrompt = buildSystemPrompt(profile);
    const healthContext = buildHealthContext(snapshot, recentHistory);

    const result = await generateText({
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${healthContext}\n\nFais un bref récap de mon état actuel avec un conseil léger si nécessaire. Maximum 3-4 phrases courtes, le tout doit être très concis.`,
        },
      ],
    });

    console.log('[ai-coach] advice generated successfully');
    return result;
  } catch (error) {
    console.log('[ai-coach] error generating advice:', error);
    return getFallbackAdvice(snapshot);
  }
}

export function getFallbackAdvice(snapshot: HealthSnapshot): string {
  if (snapshot.stress > 80 && snapshot.sleepHours < 5.5) {
    return 'Indicateurs en zone critique. Évitez toute prise de position. Pause complète recommandée.';
  }
  if (snapshot.stress > 70) {
    return 'Stress élevé détecté. Réduisez votre exposition et faites des pauses régulières.';
  }
  if (snapshot.heartRate > 95 && snapshot.stress > 55) {
    return 'FC élevée + stress. Prenez 5 min de respiration avant votre prochaine analyse.';
  }
  if (snapshot.sleepHours < 5.5) {
    return 'Déficit de sommeil. Limitez-vous aux setups les plus clairs avec stops serrés.';
  }
  if (snapshot.stress < 35 && snapshot.sleepScore > 80) {
    return 'Conditions excellentes. Profitez de cette fenêtre pour vos meilleures analyses.';
  }
  return 'État stable. Restez discipliné et respectez votre plan de trading.';
}

export function getCoachSystemMessage(profile: TraderProfile, snapshot: HealthSnapshot, recentHistory?: HealthDay[]): string {
  const systemPrompt = buildSystemPrompt(profile);
  const healthContext = buildHealthContext(snapshot, recentHistory);

  return `${systemPrompt}\n\n${healthContext}\n\nLe trader va maintenant te poser des questions. Réponds en te basant sur ses données biométriques actuelles et son profil. Sois un vrai coach personnel de trading.`;
}
