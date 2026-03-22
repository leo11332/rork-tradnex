# Créer TRADNEX, un tracker premium de performance santé pour traders

## Icône de l'app
- [x] Créer une direction visuelle d'icône noire mate avec anneau bleu électrique et tracé biométrique minimal.

## Fonctionnalités
- [x] Afficher sur l'accueil un score de stress 0 à 100 avec code couleur vert, orange ou rouge.
- [x] Afficher le sommeil de la nuit passée avec score et durée.
- [x] Afficher la fréquence cardiaque actuelle dans un bloc premium.
- [x] Générer une recommandation immédiate selon stress et sommeil.
- [x] Ajouter un historique avec bascule 7 jours / 30 jours.
- [x] Ajouter les réglages de seuil d'alerte stress et fréquence cardiaque.
- [x] Ajouter un toggle de notifications.
- [x] Afficher l'état de l'abonnement et un bypass admin.
- [x] Permettre un accès immédiat sans création de compte.
- [x] Afficher un état vide élégant tant que les données santé ne sont pas connectées.
- [x] Remplacer les textes d'introduction inutiles par des titres d'écrans plus proches d'une app mobile réelle.
- [x] Renommer l'accueil en "En direct" pour les données temps réel.
- [x] Injecter des données fictives visibles pour travailler l'interface avant le branchement santé réel.
- [x] Ajouter un consentement santé au premier lancement avant l'accès aux données.

## Design
- [x] Utiliser un univers dark-only avec fond noir profond et accent bleu électrique.
- [x] Créer une interface minimaliste premium inspirée des apps de santé haut de gamme.
- [x] Utiliser jauges, cartes et graphiques avec contraste fort et sensation mobile.
- [x] Ajouter des micro-animations d'apparition discrètes.
- [x] Respecter les couleurs d'état vert, orange et rouge.

## Écrans
- [x] Construire l'écran Accueil avec jauge circulaire, sommeil, fréquence cardiaque et recommandation IA.
- [x] Construire l'écran Historique avec courbe stress, barres sommeil et courbe HRV.
- [x] Construire l'écran Réglages avec seuils, notifications, abonnement, bypass admin et déconnexion.
- [x] Construire l'écran d'accès premium avec essai gratuit 5 jours, mensuel et annuel.
- [x] Construire l'état de connexion santé avec appel à connexion des données.
- [x] Construire un écran d'autorisation Apple Santé / Google Santé au premier lancement.

## Données et comportement
- [x] Prévoir une synchronisation automatique toutes les 5 minutes.
- [x] Prévoir 30 jours d'historique personnel.
- [x] Calculer le stress à partir du HRV.
- [x] Préparer les alertes selon les seuils configurés.
- [x] Garder une première expérience fluide avec accès immédiat et connexion plus tard.
- [x] Basculer temporairement l'expérience sur des données fictives après consentement.

## Sessions de trading
- [x] Ajouter le choix des sessions tradées (Asiatique, Londres, New York) à l'inscription.
- [x] Permettre la modification des sessions dans les Réglages.
- [x] Zoomer le graphique horaire du Journal sur les plages horaires des sessions sélectionnées.

## Tradnex Score — Trading Readiness
- [x] Rebrander le score global en "Tradnex Score" (0-100) avec verdict actionnable.
- [x] Ajouter les métriques Stress et HRV en plus du Sommeil et FC sur l'écran Score.
- [x] Afficher les patterns personnels quand suffisamment de données (5+ sessions).
- [x] Créer un écran Score dédié avec jauge circulaire bleue, composantes détaillées et tendance 7 jours.
- [x] Calculer le score selon formule : Sommeil (30pts) + HRV (30pts) + Stress (20pts) + FC repos (20pts).
- [x] Animation de comptage au chargement du score.
- [x] Afficher 4 cartes de composantes avec barres de progression colorées.

## Journal de trading biométrique
- [x] Renommer l'onglet Historique en "Journal".
- [x] Ajouter le logging de résultat de session (Profitable / Neutre / Perte) par jour.
- [x] Afficher les patterns personnels avec corrélation score/résultat dans le Journal.
- [x] Afficher icône de résultat dans le calendrier pour chaque jour logué.
- [x] Ajouter une vue calendrier mensuelle avec navigation mois par mois.
- [x] Bouton flottant "+" pour logger la session du jour avec modale.
- [x] Champ note rapide optionnel dans le logging.
- [x] Graphique de corrélation score/performance (scatter plot après 5 sessions).
- [x] Placeholder élégant avec barre de progression avant 5 sessions.

## Mémoire de performances
- [x] Stocker les résultats de session dans le state persisté.
- [x] Calculer les patterns personnels (meilleur jour, taux de perte sous score 50, score moyen par résultat).
- [x] Après 5 sessions, afficher "Quand votre score est sous X, vous perdez Y% du temps".

## Insights personnels
- [x] Créer un écran Insights dédié avec 6 cartes d'analyse.
- [x] État vide élégant avec icône cerveau, barre de progression et cartes verrouillées.
- [x] Carte 1 : Seuil de performance (score moyen des sessions perdantes).
- [x] Carte 2 : Meilleur jour de la semaine.
- [x] Carte 3 : Impact du sommeil (corrélation sommeil/résultat).
- [x] Carte 4 : Score moyen par type de session.
- [x] Carte 5 : Tendance HRV personnelle avec variation 7 jours.
- [x] Carte 6 : Recommandation hebdomadaire générée automatiquement.
- [x] Animations d'apparition discrètes sur les cartes.

## Alerte pré-session
- [x] Ajouter la configuration d'alerte pré-session dans les Réglages.
- [x] Toggle par session (Asiatique, Londres, New York).
- [x] Sélecteur de délai (15 min, 30 min, 1h avant).
- [x] Aperçu de la notification en temps réel.
- [ ] Envoyer une notification automatique à l'heure habituelle de trading avec le Tradnex Score du matin.

## Onboarding
- [x] Créer un onboarding 4 étapes au premier lancement.
- [x] Étape 1 : Bienvenue avec logo et slogan.
- [x] Étape 2 : Sélection des sessions de trading avec drapeaux.
- [x] Étape 3 : Autorisation des données santé.
- [x] Étape 4 : Essai gratuit avec liste de fonctionnalités.
- [x] Indicateur de progression (dots) et animations de transition.

## Navigation
- [x] 5 onglets : En direct, Score, Journal, Insights, Réglages.
- [x] Notifications et alertes accessibles depuis Réglages.
- [x] Icônes cohérentes pour chaque onglet.

## Lancement de la première version
- [x] Livrer une première version soignée avec navigation complète, logique de recommandations, historique et réglages.
- [x] Prévoir la structure d'abonnement avec essai gratuit 5 jours, paiement mensuel et annuel.
- [x] Préparer les fondations Supabase, santé, cloud et notifications pour la suite.
