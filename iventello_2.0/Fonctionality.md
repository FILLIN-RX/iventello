# CAHIER DES CHARGES FONCTIONNEL & TECHNIQUE : IVENTELLO ENTERPRISE

**Système :** Gestion de Stock, Point de Vente (POS) et Réseau Multi-Boutiques  
**Architecture :** 100% Native (Flutter + Rust / Drift SQLite), Hybride Offline-First & Synchronisation Online Temps Réel  
**Plateformes :** Windows / Linux / macOS (Desktop POS & Manager) & Android / iOS (Mobile Inventory & Dashboard)

---

## 1. CARTOGRAPHIE FONCTIONNELLE DES MODULES

### 1.1. Point de Vente & Caisse (POS)
* **Saisie & Détection :**
  * Scan code-barres / QR / SKU continu sans latence (douchette USB/COM ou caméra mobile).
  * Recherche textuelle indexée en local (< 10 ms sur 50 000 références).
  * Grille visuelle tactile organisée par rayons et catégories.
* **Moteur Tarifaire :**
  * Remises en pourcentage ou montant fixe (par article ou sur le total du panier).
  * Gestion multi-taxes (TVA, centimes additionnels, régimes d'exonération).
  * Prix différenciés selon le profil client (Détail, Demi-Gros, Gros, VIP).
* **Règlements & Paiements :**
  * Espèces avec calculatrice intégrée de rendu de monnaie.
  * Mobile Money (Orange Money, MTN MoMo) avec saisie de référence transactionnelle.
  * Cartes bancaires (TPE) et paiements fractionnés (mixte espèces/MoMo/carte).
  * Vente à terme / Crédit client (validation sous réserve de plafond disponible).
* **Gestion du Matériel de Caisse :**
  * Impression binaire ESC/POS instantanée sans pilote OS (tickets 58mm / 80mm).
  * Commande d'ouverture électrique du tiroir-caisse via impulsion RJ11/imprimante.
  * Gestion des paniers en attente (mise en pause et reprise sans blocage de file).
  * Retours marchandises et avoirs avec réintégration contrôlée en stock.

### 1.2. Stocks, Logistique & Multi-Boutiques
* **Segmentation multi-emplacements & Topologie des magasins :**
  * Choix à l'onboarding : Magasin par boutique (décentralisé), Magasin centralisé unique (*Hub & Spoke*) ou Hybride.
  * Partitionnement strict des stocks par boutique physique et entrepôt central.
  * Visibilité du stock des autres boutiques (en mode connecté ou selon dernier delta reçu).
* **Mouvements & Traçabilité :**
  * Entrées fournisseurs avec contrôle de conformité sur bon de livraison (BL).
  * Sorties d'ajustement (casse, vol, périssable, consommation interne).
  * Transferts inter-boutiques à double validation (statut unifié : `BROUILLON` ➔ `EN_TRANSIT` ➔ `RECU_CONFORME` / `RECU_LITIGE` / `ANNULE`).
* **Campagnes d'Inventaire :**
  * Inventaire tournant par rayon ou inventaire général annuel.
  * Saisie aveugle ou guidée sur terminal mobile en rayon.
  * Calcul automatique des écarts (quantité et valorisation PAMP) avec gel temporaire des mouvements du rayon.

### 1.3. Catalogue Produits & Référentiel Central
* **Structures d'articles :**
  * Modèle de fiche produit universelle (adaptable à tout type de commerce grâce à 10 attributs personnalisables).
  * Produits simples, produits à variantes (taille, couleur, conditionnement).
  * Système Paquet / Détail (déconditionnement d'unités stockées dans `quantity_unites_detachees` à partir des cartons).
  * Lots / Packs / Bundles : décrémentation automatique des composants lors de la vente du lot.
* **Données financières :**
  * Calcul automatique du Prix d'Achat Moyen Pondéré (PAMP) à chaque réception.
  * Alertes paramétrables de rupture et seuils de réapprovisionnement automatique.

---

## 2. GESTION DES RÔLES ET DES PERMISSIONS (RBAC)

Le système applique le principe du moindre privilège. Chaque utilisateur possède un profil rattaché à une ou plusieurs boutiques spécifiques.

### 2.1. Matrice des Rôles

| Fonctionnalité / Droit | Caissier | Responsable de Rayon | Gérant de Boutique | Administrateur Général |
| :--- | :---: | :---: | :---: | :---: |
| **Encaisser une vente** | Oui | Oui | Oui | Oui |
| **Appliquer une remise normale (≤ seuil)** | Oui | Oui | Oui | Oui |
| **Appliquer une remise exceptionnelle** | Non (PIN Manager) | Non (PIN Manager) | Oui | Oui |
| **Annuler une ligne / un ticket validé** | Non (PIN Manager) | Non (PIN Manager) | Oui | Oui |
| **Ouvrir le tiroir sans vente** | Non (PIN Manager) | Non (PIN Manager) | Oui | Oui |
| **Saisir un inventaire physique** | Non | Oui | Oui | Oui |
| **Valider les écarts d'inventaire** | Non | Non | Oui | Oui |
| **Émettre un transfert inter-boutique** | Non | Oui | Oui | Oui |
| **Valider la réception d'un transfert** | Non | Oui | Oui | Oui |
| **Clôturer la caisse (Rapport Z)** | Oui | Oui | Oui | Oui |
| **Consulter le chiffre d'affaires boutique**| Non | Non | Oui | Oui |
| **Consulter les rapports consolidés** | Non | Non | Non | Oui |
| **Modifier le prix de vente d'un article**| Non | Non | Non | Oui |
| **Créer/Supprimer des comptes usagers** | Non | Non | Non | Oui |

### 2.2. Sécurité & Changement Rapide d'Opérateur
* **Code PIN opérateur :** Écran de verrouillage rapide sur la caisse permettant à plusieurs caissiers d'alterner sur le même poste sans relancer l'application.
* **Supervision à la volée :** Lorsqu'un caissier sollicite une action restreinte (ex: remise > 10% ou annulation de ticket), une modale de validation par PIN du Gérant s'affiche sans déconnecter la session du caissier.
* **Journal d'Audit Immuable :** Chaque action sensible enregistre l'horodatage UTC, l'identifiant du caissier, l'identifiant du superviseur ayant validé par PIN, l'ancienne valeur et la nouvelle valeur.

---

## 3. ARCHITECTURE DE SYNCHRONISATION HYBRIDE : OFFLINE-FIRST & ONLINE TEMPS RÉEL

L'application fonctionne selon un mode **hybride temps réel / offline-first résilient** :
* **Autonomie locale totale :** En cas de coupure Internet, chaque terminal encaisse et gère son stock localement sur SQLite FFI (mode WAL).
* **Synchronisation Online Continue :** Dès que la connexion est active, l'application établit une liaison bidirectionnelle sécurisée avec le serveur central Iventello Cloud.

### 3.1. Structure des Données : Locales vs Référentiels Réseau
* **Données Transactionnelles Locales (Étanchéité Stricte - `shop_id` obligatoire) :** Stocks (`product_stocks`), Ventes (`sales`), Sessions de caisse (`cash_sessions`), Transferts (`inter_shop_transfers`), Audit (`audit_logs`).
* **Référentiels Partagés Réseau (`shop_id` Nullable) :** Catalogue (`products`), Fournisseurs Réseau (`suppliers` avec `shop_id = NULL`), Clients Réseau multi-boutiques (`clients` avec `shop_id = NULL`).

### 3.2. Mécanisme de Propagation Online & File d'Attente
1. **Écriture Locale Immédiate :** Toutes les opérations sont exécutées dans une transaction SQLite locale en mode WAL. L'application répond instantanément (< 3 ms).
2. **File d'Événements (`sync_queue`) :** Enregistre la mutation locale avec le statut `PENDING`.
3. **Moteur de Synchronisation Online (Worker Isolate Dédié) :**
   * **Mode Connecté (Online) :** Émission instantanée des événements vers le Cloud et réception en direct des deltas d'autres terminaux.
   * **Mode Déconnecté (Offline) :** Empilement dans la `sync_queue` locale.
   * **Rétablissement de Connexion :** Envoi des paquets par lots (batching 50-100 items), résolution des deltas et mise à jour du `last_synced_timestamp`.

### 3.3. Règles de Résolution des Conflits

| Type de Donnée | Stratégie de Résolution | Règle Opérationnelle |
| :--- | :--- | :--- |
| **Ventes / Encaissements** | **Append-Only (Aucun conflit)** | Les ventes sont additives. Deux ventes du même produit sur deux postes hors-ligne sont toutes les deux validées et insérées. |
| **Niveaux de Stock** | **Event Sourcing / Mouvements** | On ne synchronise jamais une valeur absolue de stock (ex: `stock = 12`), mais des deltas (ex: `stock_change = -2`). Le serveur recalcule le stock final par sommation. |
| **Fiche Produit (Nom, Prix)** | **Last-Write-Wins (LWW) Serveur** | En cas de modification simultanée, l'horodatage serveur de l'administrateur fait foi. |
| **Inventaire Physique** | **Snapshot Temporel** | La validation d'une session d'inventaire écrase l'état du stock à la date d'effet de l'inventaire en traçant le différentiel. |

---

## 4. SYSTÈME DE RAPPORTS & ANALYTIQUE MULTI-BOUTIQUES

Le reporting est découpé en deux niveaux : les rapports opérationnels de caisse (locaux) et les rapports décisionnels consolidés (centraux).

### 4.1. Rapports de Caisse (Niveau Local / Terminal)
* **Rapport X (En cours de journée) :** Consultation sans clôture de session (ventes, paiements, remises).
* **Rapport Z (Clôture journalière) :** Verrouillage définitif, comptage physique à l'aveugle par l'opérateur, calcul automatique des écarts de caisse, impression thermique et archivage crypté en local.

### 4.2. Rapports Opérationnels (Niveau Boutique)
* **Valorisation des stocks :** Calcul de la valeur marchande du stock par boutique au prix de vente et au coût de revient (PAMP).
* **Mouvements de stocks détaillés :** Registre complet entrées / sorties / transferts / pertes sur une période donnée.
* **Palmarès des ventes :** Top 20 des articles les plus vendus en volume et en marge brute générée.
* **Suivi des encours clients :** État nominatif des dettes clients, échéances dépassées et historique des recouvrements.

### 4.3. Rapports Consolidés (Niveau Entreprise / Multi-Boutiques / Online)
* **Tableau de Bord Comparatif des Boutiques :** Classement par CA, marge brute et volume.
* **Gestion des Transferts Réseau :** Suivi en temps réel des marchandises en transit (`EN_TRANSIT`) et détection des anomalies de livraison (`RECU_LITIGE`).
* **Consolidation Fiscale & Financière :** CA global HT/TTC et synthèse des flux (Espèces vs Mobile Money/Banque).