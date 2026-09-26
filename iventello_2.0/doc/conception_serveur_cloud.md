# CAHIER DE CONCEPTION TECHNIQUE : SERVEUR CLOUD CENTRAL & API DE SYNCHRONISATION
**Projet :** Iventello Enterprise 2.0 (Backend Cloud)  
**Version :** 2.0.0  
**Statut :** Validé / En cours d'implémentation  
**Auteur :** Architecte Logiciel Flutter, Rust & Systèmes Distribués  

---

## 1. VISION & OBJECTIFS DU SERVEUR CLOUD CENTRAL

Le serveur central **Iventello Cloud** est le système nerveux central du réseau. Il assure l'ingestion à haute fréquence des mutations émises par les terminaux de caisse, orchestre la réplication bidirectionnelle, gère les sauvegardes de secours (*Disaster Recovery*) et alimente le Dashboard Web de la Direction Générale.

### Objectifs Clés :
1. **Ingestion Haute Performance :** Capacité à absorber des milliers de transactions de caisse par seconde avec latence d'acquittement **< 10 ms**.
2. **Architecture Multi-Tenant Étanche :** Cloisonnement strict par entreprise (`company_id`) et par boutique (`shop_id`).
3. **Passerelle de Synchronisation Hybride (Sync Gateway) :**
   * Endpoint PUSH : Réception et déballage des batches de mutations locales.
   * Endpoint PULL : Distribution des deltas chronologiques selon le `last_synced_timestamp`.
   * Canal WebSockets / SSE : Notification push instantanée aux terminaux connectés lors de modifications critiques (prix, blocage crédit client, arrivage stock).
4. **Service d'Onboarding & Mailer :** Envoi automatique des emails d'invitation avec mots de passe temporaires forts et tokens JWT d'activation (validité 48h).
5. **Sauvegarde Automatique & Résilience :** Snapshots PostgreSQL continus et archivage sécurisé des documents PDF (factures, bons de commande) sur stockage S3 / MinIO.

---

## 2. STACK TECHNIQUE DU BACKEND

```mermaid
graph TD
    subgraph "Terminaux Mobiles & Caisses Desktop"
        POS_A[Terminal Caisse 1 - Boutique A]
        POS_B[Terminal Caisse 2 - Boutique B]
        MGR[App Mobile Gérant]
    end

    subgraph "Infrastructure Iventello Cloud Backend"
        LB[Nginx / Cloudflare Load Balancer (TLS 1.3)]
        API[API Gateway & Sync Engine (Go / Rust / Node / Dart Frog)]
        BROKER[Redis Streams / NATS : Event Bus Temps Réel]
        MAILER[Service d'Envoi d'Emails : SMTP / Resend]
        S3[Stockage Objets S3 / MinIO : PDFs & Images]
        PG[(Base Centrale PostgreSQL Multi-Tenant)]
    end

    subgraph "Accès Direction"
        WEB_DASH[Dashboard Web Direction & Analytics]
    end

    POS_A <-->|Sync Push/Pull & WebSockets| LB
    POS_B <-->|Sync Push/Pull & WebSockets| LB
    MGR <-->|API REST / GraphQL| LB
    WEB_DASH <-->|HTTPS| LB

    LB --> API
    API --> PG
    API --> BROKER
    API --> MAILER
    API --> S3
```

* **Langage / Framework API :** Go / Rust ou Node.js (Fastify / NestJS) pour un débit d'ingestion maximal et une faible empreinte RAM.
* **Base de Données Centrale :** **PostgreSQL 16** avec partitionnement logique par `company_id` et indexation JSONB.
* **Broker Événementiel Temps Réel :** **Redis Streams** ou **NATS** pour le broadcast des deltas en direct.
* **Service d'Envoi d'Emails :** Module SMTP / API Resend pour l'onboarding et les réinitialisations de mot de passe.
* **Stockage de Fichiers :** MinIO / AWS S3 pour l'archivage crypté des factures PDF, bons de commande et images de produits.

---

## 3. SCHÉMA DE BASE DE DONNÉES CENTRALE (POSTGRESQL MULTI-TENANT)

### 3.1. Structure du Journal des Événements Central (`server_event_log`)
Le serveur enregistre l'ensemble des mutations de manière immuable (*Event Store*) pour permettre la distribution différentielle à tous les terminaux :

```sql
CREATE TABLE server_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload JSONB NOT NULL,
    server_version BIGSERIAL,    -- Incrément global par entreprise
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_server_event_lookup ON server_event_log(company_id, shop_id, server_version);
CREATE INDEX idx_server_event_table ON server_event_log(company_id, table_name, created_at);
```

### 3.2. Tables Miroirs Consolidées (Multi-Tenant)
Toutes les tables locales SQLite (`products`, `product_stocks`, `sales`, `cash_sessions`, `clients`, `suppliers`, `audit_logs`) existent en miroir dans PostgreSQL avec un champ obligatoire `company_id UUID NOT NULL`.

---

## 4. ENDPOINTS CLÉS DE L'API DE SYNCHRONISATION

### 4.1. `POST /api/v1/sync/push` (Ingestion des Mutations de Caisse)
* **Payload reçu du terminal :**
```json
{
  "device_id": "POS-PARIS-01",
  "shop_id": "018f2d5a-8b1e-7000-8000-000000000001",
  "mutations": [
    {
      "queue_id": "018f2d7c-...",
      "table": "sales",
      "action": "INSERT",
      "record_id": "018f2d8d-...",
      "timestamp": 1727265000000,
      "data": {
        "id": "018f2d8d-...",
        "invoice_number": "FAC-2026-0045",
        "final_total_cents": 12500,
        "payment_method": "ESPECES"
      }
    }
  ]
}
```
* **Traitement Serveur :**
  1. Validation du jeton JWT et des droits du terminal.
  2. Transaction SQL atomique : insertion/mise à jour dans la table PostgreSQL cible.
  3. Enregistrement dans `server_event_log`.
  4. Publication d'une notification sur le channel Redis Stream de l'entreprise.
  5. Réponse `200 OK` avec acquittement des `queue_id` traités avec succès.

### 4.2. `GET /api/v1/sync/pull` (Distribution Différentielle des Deltas)
* **Paramètres de requête :** `?shop_id=...&last_version=14205&limit=100`
* **Réponse du Serveur :**
```json
{
  "last_server_version": 14280,
  "has_more": false,
  "events": [
    {
      "table": "products",
      "action": "UPDATE",
      "record_id": "018f2c3b-...",
      "data": { "selling_price_cents": 5500, "version": 4 }
    }
  ]
}
```

### 4.3. `POST /api/v1/users/invite` (Onboarding & Envoi d'Email)
* Génération automatique d'un mot de passe fort aléatoire (12 caractères).
* Hash Argon2id enregistré en base avec `must_change_password = true`.
* Génération d'un token JWT d'activation (validité 48 heures).
* Expédition d'un email transactionnel au collaborateur :
  * Objet : *« Bienvenue sur Iventello — Vos identifiants d'accès »*
  * Contenu : Lien d'activation direct + Mot de passe temporaire.

---

## 5. DÉPLOIEMENT & INFRASTRUCTURE (DOCKER & CI/CD)

Le serveur Cloud est conteneurisé avec **Docker** et **Docker Compose** pour un déploiement en 1 clic sur n'importe quel VPS ou serveur dédié (Ubuntu / Debian) :

```yaml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://iventello:secret@postgres:5432/iventello_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=votre_super_cle_secrete_jwt
      - SMTP_HOST=smtp.resend.com
      - SMTP_USER=resend
      - SMTP_PASS=re_xxxxxxxxx
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=iventello_db
      - POSTGRES_USER=iventello
      - POSTGRES_PASSWORD=secret

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```
