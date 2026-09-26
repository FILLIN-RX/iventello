# CHARTE DE DESIGN & SYSTÈME D'INTERFACE : IVENTELLO ENTERPRISE

**Cible :** Application Native Desktop (Caisse / POS / Back-Office) & Mobile (Inventaire / Manager)  
**Direction Artistique :** Utilitaire Industriel, Natif, Minimaliste, Strict, Sans Décoration Superflue

---

## 1. LES INTERDICTIONS STRICTES ("ANTI-IA" & ANTI-WEB GIMMICK)

Les intelligences artificielles génératives et les maquettes web modernes injectent systématiquement des artifices graphiques qui nuisent à la lisibilité et à l'usage intensif en entreprise. Les éléments suivants sont **formellement bannis** du code et de l'UI :

* ❌ **Zéro dégradé (Linear / Radial Gradients) :** Aucun fond en dégradé, aucun bouton arc-en-ciel, aucun texte coloré en gradient. Toutes les couleurs sont 100% plates (*solid colors*).
* ❌ **Zéro fond coloré sous les icônes :** Pas de mini-carrés ou de cercles pastel/arrondis pour loger une icône (ex: pas d'icône rouge dans une pastille rose clair). L'icône vit directement sur la surface du composant.
* ❌ **Zéro emoji dans l'interface professionnelle :** Aucun emoji (🔥, 🚀, 📦, ⚠️, 💰, etc.) utilisé comme substitut d'icône ou dans les titres, boutons, badges ou messages d'alerte. Utiliser exclusivement des glyphes vectoriels sobres d'un set d'icônes unique.
* ❌ **Zéro effet Glassmorphism / Frosted Glass :** Aucun flou d'arrière-plan (`backdrop-filter`, `ImageFilter.blur`), aucune fausse transparence vitreuse.
* ❌ **Zéro ombre diffuse / Colorée ("Glow") :** Pas d'ombres portées violettes, bleues ou disproportionnées. Les ombres "néon" sont bannies.
* ❌ **Zéro bordures multicolores ou brillantes :** Pas de bordures en gradient ou d'effets néon simulant un faux aspect moderne.
* ❌ **Zéro texte purement descriptif ou décoratif :** Pas de sous-titres verbeux ("Bienvenue sur votre espace de vente intelligent !"). Chaque mot affiché à l'écran doit servir à l'exécution de la tâche métier.

---

## 2. PALETTE CHROMATIQUE RÉDUITE & FONCTIONNELLE

L'interface repose sur une dominante neutre (niveaux de gris industriels) où la couleur n'intervient que pour signifier un statut ou une action prioritaire.

### 2.1. Surfaces & Conteneurs (Mode Sombre Industriel / POS)
* **Surface Primaire (Background App) :** `#0F1115` (Noir atténué neutre, jamais de noir pur `#000000` sur de grands aplats).
* **Surface Secondaire (Cartes, Panneaux, Sidebar) :** `#16191F`.
* **Surface Élevée (Modales, Popovers, Menus) :** `#1E222B`.
* **Bordures & Séparateurs :** `#282D37` (Trait fin de 1 px, net, opaque).

### 2.2. Typographie & Contrastes
* **Texte Primaire (Titres, Valeurs financières, Totaux) :** `#F3F4F6` (Blanc cassé haute lisibilité).
* **Texte Secondaire (Libellés, Références SKU, Métadonnées) :** `#9CA3AF`.
* **Texte Tertiaire (Désactivé, Placeholders) :** `#4B5563`.

### 2.3. Couleurs Sémantiques (Utilisation stricte par statut)
* **Action Primaire (Bouton d'encaissement, validation) :** `#0066FF` ou `#1D4ED8` (Bleu direct, aplat franc).
* **Succès (Vente validée, stock conforme) :** `#15803D` (Vert forêt/industrie, lisible, pas de vert néon).
* **Attention (Seuil de réapprovisionnement, écart caisse mineur) :** `#B45309` (Ambre soutenu).
* **Erreur / Danger (Rupture, annulation ticket, suppression) :** `#B91C1C` (Rouge sang franc).

---

## 3. RÈGLES DE TYPOGRAPHIE & DENSITÉ DE DONNÉES

Dans une caisse ou un entrepôt, la vitesse de lecture prime sur l'élégance artistique.

* **Famille de police :** Police système native (`Inter`, `Segoe UI` sur Windows, `Roboto` sur Android, `San Francisco` sur Apple). Pas de polices fantaisistes ou manuscrites.
* **Chiffres monétaires & Codes-barres :** Utiliser obligatoirement une police à **chiffres tabulaires / à chasse fixe (Monospace)** pour les montants, quantités et colonnes de prix afin d'aligner parfaitement les virgules décimales verticalement.
* **Taille et graisse :**
  * `Total à payer` : 32px à 40px, Semi-Bold, contraste maximal.
  * `Nom d'article / Titre de vue` : 14px à 16px, Medium.
  * `Détails tableau / Métadonnées` : 12px à 13px, Regular.
  * `Labels de champs / Badges` : 11px, Medium, majuscules discrètes ou casse standard.
* **Échelle de composition :** Limiter l'application à un maximum de 4 graisses et 5 tailles sur l'ensemble des écrans.

---

## 4. COMPOSANTS DE BASE & COMPORTEMENT NATIF

### 4.1. Boutons
* **Forme :** Rectangles stricts avec un rayon de courbure minime (`border-radius: 4px` à `6px` maximum). Pas de boutons en pilule arrondie (`rounded-full`).
* **Bouton Primaire :** Fond plein unicolore (ex: bleu ou vert d'encaissement), texte blanc contrasté, sans ombre ou avec ombre portée sèche de 1px (`box-shadow: 0 1px 2px rgba(0,0,0,0.2)`).
* **Bouton Secondaire :** Fond neutre (`#1E222B`), bordure 1px (`#282D37`), texte primaire.
* **États :** Retour visuel immédiat au clic (`active`) par assombrissement de 10% du fond plein. Pas d'effet d'ondulation (*ripple effect*) disproportionné qui ralentit l'impression de rapidité.

### 4.2. Tableaux de Données (Data Grids)
* **Structure :** Hauteur de ligne dense (36px à 44px par ligne de ticket ou de stock).
* **Séparateurs :** Ligne horizontale de 1px entre les lignes.
* **Alignement rigoureux :**
  * Texte (désignation article, catégorie) : **Aligné à gauche**.
  * Statut / Badges / Code : **Centré**.
  * Nombres, quantités, prix unitaires, totaux : **Strictement alignés à droite**.

### 4.3. Badges & Indicateurs de Statut
* Pas de grosses pastilles colorées.
* Structure : Bordure fine de 1px avec texte coloré correspondant au statut sur fond neutre ou fond teinté à très faible opacité (maximum 10%).

---

## 5. SYSTÈME DE GRILLE, ESPACEMENT & ERGONOMIE POS

* **Grille de 8px :** Tous les espacements, marges (`padding`, `margin`) et hauteurs de composants doivent être des multiples stricts de 4px ou 8px (4, 8, 12, 16, 24, 32, 48px).
* **Cibles tactiles de caisse :**
  * Sur écran tactile POS (Desktop/Tablette) : Les touches du pavé numérique et le bouton d'encaissement doivent faire au minimum **56px de haut**.
  * Sur mobile : Cible de scan ou validation de 48px minimum.
* **Navigation clavier prioritaire (Desktop) :**
  * Chaque action courante doit posséder un indicateur visuel de raccourci clavier standardisé (ex: petit label discret `[F1]`, `[Entrée]`, `[Échap]`).
  * La sélection active dans une table de produits est indiquée par une bordure nette de 2px ou un aplat contrasté uniforme, pas par une animation de survol lente.

---

## 6. PROPORTIONS, BREAKPOINTS & ARCHITECTURE D'ÉCRAN (DESKTOP VS MOBILE)

L'application Iventello fonctionne en environnement multiplateforme (Desktop Caisse/Back-office, Tablette de comptoir, Terminal mobile d'inventaire). Les mises en page obéissent à des règles de proportions géométriques strictes.

### 6.1. Breakpoints Standardisés
* **Mobile (Smartphones / Terminaux durcis type Zebra/Honeywell) :** `< 640px` (Orientation Portrait prioritaire).
* **Tablette / Écran Caisse Compact (POS 10" - 12") :** `640px` à `1024px` (Orientation Paysage prioritaire).
* **Desktop Standard & Écrans Larges (Back-Office / Moniteurs POS 15" - 24") :** `> 1024px` (1280x800, 1920x1080).

---

### 6.2. Proportions Desktop & Grand Écran (Caisse POS & Back-Office)

#### A. Écran de Vente / POS (Split-Screen Proportionnel 65% / 35%)
Sur Desktop et Tablette Paysage, l'écran de caisse est divisé en deux zones distinctes à hauteur pleine sans scroll global :
* **Zone Gauche (Panier / Ticket actif en cours) — 38% à 40% de largeur (min. 420px, max. 520px) :**
  * *En-tête Ticket (Client, Type de vente) :* Hauteur fixe `48px`.
  * *Tableau des Lignes d'articles :* Zone extensible flexible avec scroll vertical interne, hauteur de ligne `40px`.
  * *Pavé Numérique & Raccourcis Remise/Qté :* Hauteur `180px` à `220px`.
  * *Bloc Total & Encaissement :* Hauteur fixe `120px` en bas d'écran (Total affiché en `32px` minimum, bouton d'encaissement pleine largeur hauteur `56px`).
* **Zone Droite (Catalogue Produits, Grille Rapide, Recherche) — 60% à 62% de largeur :**
  * *Barre de Recherche & Scan :* Hauteur `48px` avec focus automatique permanent.
  * *Onglets Catégories / Filtres :* Hauteur `40px`.
  * *Grille Bento des Produits / Tuiles rapides :* Grille adaptative avec tuiles de `120px` à `150px` de largeur et `90px` à `110px` de hauteur (format compact, texte 2 lignes max + prix gras monospace).

#### B. Écran Back-Office & Hub SuperAdmin (Navigation + Espace de Travail)
* **Barre de Navigation Latérale (Sidebar) :**
  * *Mode étendu (Écran > 1200px) :* Largeur fixe `240px`.
  * *Mode compact / replié (Écran 1024px - 1200px) :* Largeur fixe `64px` (icônes seules avec infobulle native).
* **Barre Supérieure (TopBar / Header) :** Hauteur fixe `52px` (titre vue, sélecteur de boutique, statut de synchronisation, avatar utilisateur, bouton verrouillage).
* **Zone de Contenu Principal (Main Content) :**
  * *Marges internes (Padding) :* `24px` uniforme.
  * *Grille des Boutiques & KPI Cards :* Cartes métriques de largeur `280px` à `360px`, hauteur `140px` à `180px`.
  * *Tableaux de gestion (Inventaire, Utilisateurs, Fournisseurs) :* Hauteur de ligne `40px`, pagination ou défilement infini virtualisé.

---

### 6.3. Proportions Mobile & Terminal Portable (Scan, Inventaire, Mini-POS)

Sur petit écran (< 640px), l'application passe en disposition verticale stricte optimisée pour l'usage à une main ou avec un lecteur de code-barres laser intégré.

#### A. Structure de Mise en Page Mobile
* **Barre Supérieure (AppBar Mobile) :** Hauteur `52px` fixe avec titre condensé et bouton d'action contextuelle (ex: lampe torche scan, synchronisation).
* **Zone Centrale Déroulante :** `ListView` verticale à 1 colonne (100% de largeur utile avec marges latérales de `12px` ou `16px`).
* **Barre d'Action Inférieure (Bottom Sheet / Sticky Footer) :** Hauteur `64px` fixée au-dessus de la barre système, pour le bouton d'action principale (ex: "Valider Réception", "Ajouter au Panier").
* **Navigation Inférieure (Bottom Navigation Bar) :** Hauteur `56px` avec 3 à 5 onglets maximum.

#### B. Cibles Tactiles & Densité Mobile
* **Taille minimale des cibles de clic :** `48px × 48px` pour tous les boutons tactiles, sélecteurs et cases à cocher.
* **Champs de saisie numérique :** Hauteur `48px` avec ouverture automatique du clavier numérique natif (`keyboardType: TextInputType.number`).
* **Cartes de Produits en Liste Mobile :** Hauteur `64px` à `72px` par ligne pour permettre un tap rapide sans fausse manipulation en rayon.

---

### 6.4. Modales, Tiroirs & Panneaux Coulissants

* **Sur Desktop / Tablette :**
  * *Modale de formulaire (Création produit, fiche client) :* Largeur fixe `560px` à `680px`, centrée à l'écran, hauteur max `80%` de la hauteur d'écran.
  * *Tiroir latéral droit (Détail historique, logs d'audit) :* Largeur fixe `420px` venant glisser depuis le bord droit.
* **Sur Mobile :**
  * Les modales se transforment obligatoirement en **Bottom Sheets coulissants depuis le bas** : largeur `100%`, hauteur ajustable de `50%` à `90%` de l'écran, avec poignée de glissement (`drag handle`) de `32px × 4px`.

---

## 7. CHECKLIST DE CONFORMITÉ DESIGN POUR CHAQUE ÉCRAN

Avant de valider l'intégration d'une vue d'Iventello, vérifier chaque point :

1. [ ] Y a-t-il un seul dégradé visible ? *(Si oui, le remplacer par un aplat unicolore).*
2. [ ] Y a-t-il des emojis dans l'interface ? *(Si oui, les supprimer ou les remplacer par des icônes vectorielles standard).*
3. [ ] Une icône est-elle enfermée dans un cercle/carré de couleur décoratif ? *(Si oui, retirer le fond).*
4. [ ] Les montants monétaires sont-ils tous alignés à droite et en police à espacement fixe ?
5. [ ] L'écran respecte-t-il les proportions Desktop (Split 60/40, barre 52px) et Mobile (Cibles 48px min, sticky footer) ?
6. [ ] L'écran reste-t-il parfaitement lisible si la luminosité de l'écran est réglée à 50% ?
7. [ ] Les boutons ont-ils des coins légèrement adoucis (4-6px) plutôt qu'un arrondi complet ?
8. [ ] L'ensemble des libellés est-il purement informatif et exempt de formulations marketing ?