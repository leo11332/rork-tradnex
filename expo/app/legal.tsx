import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { ArrowLeft, FileText, Shield } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tradnexTheme } from '@/constants/tradnex-theme';

type LegalTab = 'privacy' | 'terms';

export default function LegalScreen() {
  const [tab, setTab] = useState<LegalTab>('privacy');

  return (
    <View style={styles.background}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#040810', '#000000']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12} testID="legal-back-button">
            <ArrowLeft color={tradnexTheme.white} size={20} />
          </Pressable>
          <Text style={styles.headerTitle}>Informations l{'\u00e9'}gales</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, tab === 'privacy' && styles.tabButtonActive]}
            onPress={() => setTab('privacy')}
            testID="legal-tab-privacy"
          >
            <Shield color={tab === 'privacy' ? tradnexTheme.accent : tradnexTheme.textMuted} size={16} />
            <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>Confidentialit{'\u00e9'}</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tab === 'terms' && styles.tabButtonActive]}
            onPress={() => setTab('terms')}
            testID="legal-tab-terms"
          >
            <FileText color={tab === 'terms' ? tradnexTheme.accent : tradnexTheme.textMuted} size={16} />
            <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>CGU</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PrivacyPolicy() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Politique de confidentialit{'\u00e9'}</Text>
      <Text style={styles.lastUpdated}>Derni{'\u00e8'}re mise {'\u00e0'} jour : mars 2026</Text>

      <Text style={styles.heading}>1. Nature de l{'\u2019'}application</Text>
      <Text style={styles.paragraph}>
        TRADNEX est une application de visualisation de donn{'\u00e9'}es biom{'\u00e9'}triques destin{'\u00e9'}e aux traders. Elle lit et pr{'\u00e9'}sente des donn{'\u00e9'}es d{'\u00e9'}j{'\u00e0'} enregistr{'\u00e9'}es dans Apple Sant{'\u00e9'} (HealthKit) ou Health Connect afin d{'\u2019'}aider l{'\u2019'}utilisateur {'\u00e0'} mieux comprendre son {'\u00e9'}tat physique avant et pendant ses sessions de trading.{'\n\n'}TRADNEX n{'\u2019'}est pas une application m{'\u00e9'}dicale, ne fournit aucun diagnostic et ne remplace en aucun cas un avis m{'\u00e9'}dical professionnel. Les suggestions g{'\u00e9'}n{'\u00e9'}r{'\u00e9'}es par l{'\u2019'}IA sont des recommandations de bien-{'\u00ea'}tre g{'\u00e9'}n{'\u00e9'}ral et de prudence, et ne constituent ni des conseils m{'\u00e9'}dicaux ni des conseils financiers.
      </Text>

      <Text style={styles.heading}>2. Donn{'\u00e9'}es collect{'\u00e9'}es</Text>
      <Text style={styles.paragraph}>
        TRADNEX collecte les donn{'\u00e9'}es suivantes avec votre consentement explicite :{'\n'}
        {'\u2022'} Fr{'\u00e9'}quence cardiaque (BPM){'\n'}
        {'\u2022'} Variabilit{'\u00e9'} de la fr{'\u00e9'}quence cardiaque (HRV){'\n'}
        {'\u2022'} Donn{'\u00e9'}es de sommeil (dur{'\u00e9'}e et qualit{'\u00e9'}){'\n'}
        {'\u2022'} Adresse email (pour l{'\u2019'}authentification){'\n'}
        {'\u2022'} Pr{'\u00e9'}f{'\u00e9'}rences utilisateur (seuils d{'\u2019'}alerte, profil trader)
      </Text>

      <Text style={styles.heading}>3. Source des donn{'\u00e9'}es de sant{'\u00e9'}</Text>
      <Text style={styles.paragraph}>
        Les donn{'\u00e9'}es de sant{'\u00e9'} sont lues exclusivement depuis Apple Sant{'\u00e9'} (HealthKit) sur iOS et Health Connect sur Android. TRADNEX ne collecte jamais de donn{'\u00e9'}es directement depuis les capteurs de votre appareil. L{'\u2019'}application se contente de lire, regrouper et pr{'\u00e9'}senter des donn{'\u00e9'}es que vous avez d{'\u00e9'}j{'\u00e0'} autoris{'\u00e9'}es dans votre application de sant{'\u00e9'}.
      </Text>

      <Text style={styles.heading}>4. Utilisation des donn{'\u00e9'}es</Text>
      <Text style={styles.paragraph}>
        Vos donn{'\u00e9'}es sont utilis{'\u00e9'}es uniquement pour :{'\n'}
        {'\u2022'} Calculer et afficher votre score de stress{'\n'}
        {'\u2022'} G{'\u00e9'}n{'\u00e9'}rer des suggestions de prudence personnalis{'\u00e9'}es via l{'\u2019'}IA{'\n'}
        {'\u2022'} Afficher votre historique de donn{'\u00e9'}es biom{'\u00e9'}triques{'\n'}
        {'\u2022'} D{'\u00e9'}clencher des alertes selon vos seuils personnalis{'\u00e9'}s{'\n\n'}
        Nous ne vendons, ne partageons et ne transf{'\u00e9'}rons jamais vos donn{'\u00e9'}es de sant{'\u00e9'} {'\u00e0'} des tiers. Aucune donn{'\u00e9'}e n{'\u2019'}est utilis{'\u00e9'}e {'\u00e0'} des fins publicitaires.
      </Text>

      <Text style={styles.heading}>5. Stockage et s{'\u00e9'}curit{'\u00e9'}</Text>
      <Text style={styles.paragraph}>
        Les donn{'\u00e9'}es sont stock{'\u00e9'}es de mani{'\u00e8'}re s{'\u00e9'}curis{'\u00e9'}e avec chiffrement au repos et en transit (TLS 1.3). Les donn{'\u00e9'}es de sant{'\u00e9'} sont conserv{'\u00e9'}es pendant 30 jours glissants. Les donn{'\u00e9'}es plus anciennes sont automatiquement supprim{'\u00e9'}es.
      </Text>

      <Text style={styles.heading}>6. Vos droits</Text>
      <Text style={styles.paragraph}>
        Conform{'\u00e9'}ment au RGPD, vous disposez d{'\u2019'}un droit d{'\u2019'}acc{'\u00e8'}s, de rectification, de suppression et de portabilit{'\u00e9'} de vos donn{'\u00e9'}es. Pour exercer ces droits, contactez-nous {'\u00e0'} l{'\u2019'}adresse indiqu{'\u00e9'}e ci-dessous.
      </Text>

      <Text style={styles.heading}>7. Suppression du compte</Text>
      <Text style={styles.paragraph}>
        Vous pouvez supprimer votre compte et toutes les donn{'\u00e9'}es associ{'\u00e9'}es directement depuis l{'\u2019'}application, dans R{'\u00e9'}glages {'>'} {'\u00ab'}{'\u00a0'}Supprimer mon compte et mes donn{'\u00e9'}es{'\u00a0'}{'\u00bb'}. La suppression est imm{'\u00e9'}diate et irr{'\u00e9'}versible.
      </Text>

      <Text style={styles.heading}>8. Cookies et trackers</Text>
      <Text style={styles.paragraph}>
        TRADNEX n{'\u2019'}utilise aucun cookie publicitaire ni tracker tiers. Seuls des cookies techniques n{'\u00e9'}cessaires au fonctionnement de l{'\u2019'}application sont utilis{'\u00e9'}s.
      </Text>

      <Text style={styles.heading}>9. Contact</Text>
      <Text style={styles.paragraph}>
        Pour toute question relative {'\u00e0'} vos donn{'\u00e9'}es personnelles : contact.tradnex@gmail.com
      </Text>
    </View>
  );
}

function TermsOfService() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Conditions g{'\u00e9'}n{'\u00e9'}rales d{'\u2019'}utilisation</Text>
      <Text style={styles.lastUpdated}>Derni{'\u00e8'}re mise {'\u00e0'} jour : mars 2026</Text>

      <Text style={styles.heading}>1. Objet</Text>
      <Text style={styles.paragraph}>
        TRADNEX est une application de visualisation et d{'\u2019'}analyse de donn{'\u00e9'}es biom{'\u00e9'}triques destin{'\u00e9'}e aux traders. Elle lit des donn{'\u00e9'}es d{'\u00e9'}j{'\u00e0'} pr{'\u00e9'}sentes dans Apple Sant{'\u00e9'} (HealthKit) ou Health Connect, les regroupe sous forme de scores et graphiques, et propose des suggestions de prudence gr{'\u00e2'}ce {'\u00e0'} l{'\u2019'}intelligence artificielle.{'\n\n'}TRADNEX ne constitue en aucun cas un dispositif m{'\u00e9'}dical, une application de sant{'\u00e9'} au sens r{'\u00e9'}glementaire, ni un outil de conseil financier ou d{'\u2019'}investissement. L{'\u2019'}application se concentre exclusivement sur la mise en valeur de donn{'\u00e9'}es existantes et la promotion de la prudence dans le cadre de l{'\u2019'}activit{'\u00e9'} de trading.
      </Text>

      <Text style={styles.heading}>2. Acc{'\u00e8'}s au service</Text>
      <Text style={styles.paragraph}>
        L{'\u2019'}acc{'\u00e8'}s {'\u00e0'} TRADNEX n{'\u00e9'}cessite la cr{'\u00e9'}ation d{'\u2019'}un compte. Un essai gratuit de 5 jours est propos{'\u00e9'} {'\u00e0'} l{'\u2019'}inscription. Au-del{'\u00e0'}, un abonnement mensuel (14,90{'\u20AC'}/mois) ou annuel (119,90{'\u20AC'}/an) est requis.
      </Text>

      <Text style={styles.heading}>3. Abonnement et paiement</Text>
      <Text style={styles.paragraph}>
        Les paiements sont trait{'\u00e9'}s via l{'\u2019'}App Store (Apple) ou le Google Play Store (Android). L{'\u2019'}abonnement se renouvelle automatiquement sauf annulation au moins 24 heures avant la fin de la p{'\u00e9'}riode en cours. Vous pouvez g{'\u00e9'}rer votre abonnement dans les param{'\u00e8'}tres de votre appareil.
      </Text>

      <Text style={styles.heading}>4. Limitation de responsabilit{'\u00e9'}</Text>
      <Text style={styles.paragraph}>
        TRADNEX fournit des informations {'\u00e0'} titre indicatif uniquement. L{'\u2019'}application ne donne aucun conseil financier, m{'\u00e9'}dical ou d{'\u2019'}investissement. Les suggestions de l{'\u2019'}IA sont des recommandations g{'\u00e9'}n{'\u00e9'}rales de bien-{'\u00ea'}tre et de prudence. Aucune fonctionnalit{'\u00e9'} de l{'\u2019'}application n{'\u2019'}incite {'\u00e0'} prendre, modifier ou cl{'\u00f4'}turer une position de trading.{'\n\n'}L{'\u2019'}utilisateur reste seul responsable de ses d{'\u00e9'}cisions. TRADNEX ne saurait {'\u00ea'}tre tenu responsable de pertes financi{'\u00e8'}res, de d{'\u00e9'}cisions de trading ou de cons{'\u00e9'}quences sur la sant{'\u00e9'} li{'\u00e9'}es {'\u00e0'} l{'\u2019'}utilisation de l{'\u2019'}application.
      </Text>

      <Text style={styles.heading}>5. Donn{'\u00e9'}es de sant{'\u00e9'} et usage IA</Text>
      <Text style={styles.paragraph}>
        Les donn{'\u00e9'}es de sant{'\u00e9'} (fr{'\u00e9'}quence cardiaque, HRV, sommeil) sont lues depuis votre application de sant{'\u00e9'} et ne sont jamais partag{'\u00e9'}es avec des tiers. L{'\u2019'}IA int{'\u00e9'}gr{'\u00e9'}e analyse ces donn{'\u00e9'}es pour g{'\u00e9'}n{'\u00e9'}rer des messages de prudence adapt{'\u00e9'}s. Ces messages ne remplacent en aucun cas l{'\u2019'}avis d{'\u2019'}un professionnel de sant{'\u00e9'} ou d{'\u2019'}un conseiller financier.
      </Text>

      <Text style={styles.heading}>6. Propri{'\u00e9'}t{'\u00e9'} intellectuelle</Text>
      <Text style={styles.paragraph}>
        L{'\u2019'}ensemble du contenu de l{'\u2019'}application (design, algorithmes, textes, marques) est prot{'\u00e9'}g{'\u00e9'} par le droit de la propri{'\u00e9'}t{'\u00e9'} intellectuelle. Toute reproduction non autoris{'\u00e9'}e est interdite.
      </Text>

      <Text style={styles.heading}>7. Suppression du compte</Text>
      <Text style={styles.paragraph}>
        L{'\u2019'}utilisateur peut supprimer son compte et toutes ses donn{'\u00e9'}es directement depuis l{'\u2019'}application {'\u00e0'} tout moment. La suppression est imm{'\u00e9'}diate et d{'\u00e9'}finitive.
      </Text>

      <Text style={styles.heading}>8. R{'\u00e9'}siliation</Text>
      <Text style={styles.paragraph}>
        TRADNEX se r{'\u00e9'}serve le droit de suspendre ou r{'\u00e9'}silier l{'\u2019'}acc{'\u00e8'}s au service en cas de violation des pr{'\u00e9'}sentes conditions, d{'\u2019'}utilisation abusive ou de comportement frauduleux.
      </Text>

      <Text style={styles.heading}>9. Droit applicable</Text>
      <Text style={styles.paragraph}>
        Les pr{'\u00e9'}sentes conditions sont r{'\u00e9'}gies par le droit fran{'\u00e7'}ais. Tout litige sera soumis aux tribunaux comp{'\u00e9'}tents.
      </Text>

      <Text style={styles.heading}>10. Contact</Text>
      <Text style={styles.paragraph}>
        Pour toute question : contact.tradnex@gmail.com
      </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderColor: 'rgba(10,132,255,0.3)',
  },
  tabText: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tabTextActive: {
    color: tradnexTheme.accent,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 4,
    marginTop: 12,
  },
  lastUpdated: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  heading: {
    color: tradnexTheme.accent,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});
