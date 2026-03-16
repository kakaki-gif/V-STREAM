# AfriStream — Documentation Complète
## Plateforme Vidéo Africaine · Version 1.0

---

## 🗂️ STRUCTURE DU PROJET

```
afristream/
├── index.html              ← Application frontend (SPA)
├── styles.css              ← Tous les styles CSS
├── app.js                  ← Logique JavaScript complète
│
├── backend/
│   ├── server.js           ← API Node.js + Express complète
│   ├── package.json        ← Dépendances NPM
│   └── .env.example        ← Template variables d'environnement
│
└── README.md               ← Cette documentation
```

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### 🎥 Authentification & Utilisateurs
- ✅ Inscription / Connexion avec JWT sécurisé (bcrypt)
- ✅ 4 rôles: Utilisateur · Créateur · Modérateur · Admin
- ✅ Profil avec avatar + bannière (Cloudinary)
- ✅ Vérification email (token crypto)
- ✅ Réinitialisation mot de passe
- ✅ Suspension de compte

### 📹 Vidéos
- ✅ Upload avec compression FFmpeg automatique
- ✅ Génération miniature automatique (FFmpeg)
- ✅ CDN Cloudinary pour streaming
- ✅ Qualité adaptable (1080p/720p/480p/360p)
- ✅ Titre, description, catégorie, hashtags, tags
- ✅ Lecture avec barre de progression, plein écran

### ❤️ Interactions
- ✅ Likes / Unlikes
- ✅ Commentaires + réponses imbriquées
- ✅ Partage (copie lien)
- ✅ Sauvegarde favoris
- ✅ Signalement de contenu

### 👁️ Compteur de vues anti-fraude
- ✅ 1 seule vue par utilisateur par vidéo / 24h
- ✅ Fingerprint: hash(userId + videoId) ou hash(IP + UA)
- ✅ TTL MongoDB (auto-expiration 24h)
- ✅ Résistant au refresh

### 🔎 Recherche
- ✅ Full-text search: vidéos, créateurs, catégories, hashtags
- ✅ Résultats dynamiques en temps réel
- ✅ Index MongoDB text

### 📺 Fil d'actualité
- ✅ Vidéos récentes / Tendances / Par catégorie
- ✅ Filtres dynamiques
- ✅ Pagination côté serveur

### 🔔 Notifications temps réel
- ✅ Socket.IO WebSocket bidirectionnel
- ✅ Nouvelle vidéo, commentaire, pourboire, abonnement
- ✅ Badge non-lu
- ✅ Marquage tout lu

### 💬 Messagerie privée
- ✅ WebSocket temps réel (Socket.IO)
- ✅ Messages lus / non-lus
- ✅ Support médias (image, vidéo, document)
- ✅ Indicateur de frappe

### 👥 Abonnements
- ✅ Abonnement / Désabonnement créateur
- ✅ Compteur abonnés en temps réel
- ✅ Fil abonnements

### 💰 Monétisation Complète
- ✅ **Pourboires**: 100 / 500 / 1000 / 2000 / 5000 FCFA
- ✅ **Avant-première payante**: prix libre + date de publication publique
- ✅ **Live payant**: public ou privé avec accès payant
- ✅ **Abonnement premium créateur**: mensuel
- ✅ **Commission plateforme**: configurable (.env)

### 💳 Wallet interne
- ✅ Solde en temps réel
- ✅ Historique complet des transactions
- ✅ Recharge via Mobile Money (Flooz, T-Money, Wave)
- ✅ Paiement par carte
- ✅ Retraits créateurs avec commission

### 📊 Statistiques créateur
- ✅ Vues totales, revenus, abonnés, vidéos
- ✅ Graphiques: Chart.js (courbes 30 jours + donut revenus)
- ✅ Top vidéos
- ✅ Revenus par source

### 🚨 Modération admin
- ✅ Masquer vidéo
- ✅ Supprimer contenu
- ✅ Suspendre compte
- ✅ Auto-masquage si 10+ signalements
- ✅ Dashboard signalements

### 🎨 Paramètres
- ✅ Thème clair / sombre
- ✅ 5 couleurs d'accent personnalisables
- ✅ Préférences notifications
- ✅ Config monétisation (prix avant-première, premium)

---

## 🚀 INSTALLATION & DÉMARRAGE

### Prérequis
```bash
Node.js >= 18.x
MongoDB >= 6.x (ou MongoDB Atlas)
FFmpeg installé sur le serveur
```

### 1. Cloner et installer
```bash
git clone https://github.com/votrecompte/afristream.git
cd afristream/backend
npm install
```

### 2. Configurer l'environnement
```bash
cp .env.example .env
# Éditer .env avec vos vraies valeurs
nano .env
```

### 3. Démarrer en développement
```bash
npm run dev
# → API disponible sur http://localhost:5000
```

### 4. Démarrer en production
```bash
npm start
# Ou avec PM2 (recommandé):
pm2 start server.js --name afristream-api
pm2 save
pm2 startup
```

### 5. Frontend
```bash
# Servir le frontend avec Nginx ou Node
# Le fichier index.html est prêt à être déployé sur:
# - Netlify, Vercel (drag & drop)
# - Nginx (site statique)
# - GitHub Pages
```

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Backend
```
Node.js + Express.js
├── MongoDB (Mongoose ODM)
│   ├── Modèles: User, Video, Comment, Wallet, Tip, Notification, Message
│   └── Index: text search, TTL views, compound indexes
├── Socket.IO (WebSocket temps réel)
│   ├── Rooms: user_{id}, video_{id}, live_{id}, conv_{id}
│   └── Events: notification, new_message, live_message, viewer_count
├── Cloudinary (CDN vidéos & images)
├── FFmpeg (compression + thumbnails)
├── JWT (authentification stateless)
└── Rate Limiting (anti-spam, anti-DDoS)
```

### Frontend (SPA)
```
HTML5 + CSS3 + JavaScript vanilla
├── Architecture: Single Page Application
├── Charts: Chart.js (statistiques)
├── Fonts: Space Grotesk + Syne (Google Fonts)
├── Responsive: Mobile + Desktop
└── Thèmes: Clair / Sombre + couleurs personnalisées
```

### Mobile (React Native — à ajouter)
```bash
# Pour la version mobile native:
npx react-native init AfriStreamMobile
# Ou Expo:
npx create-expo-app AfriStream
```

---

## 📡 API ENDPOINTS

### Auth
```
POST   /api/auth/register        → Inscription
POST   /api/auth/login           → Connexion
POST   /api/auth/refresh         → Renouveler token
GET    /api/auth/me              → Profil connecté
```

### Users
```
GET    /api/users/:id            → Profil utilisateur
PATCH  /api/users/profile        → Modifier profil (multipart)
POST   /api/users/:id/subscribe  → Abonner / Désabonner
```

### Videos
```
POST   /api/videos/upload        → Upload vidéo (multipart)
GET    /api/videos               → Liste vidéos (paginated)
GET    /api/videos/:id           → Détail vidéo
POST   /api/videos/:id/view      → Compter une vue
POST   /api/videos/:id/like      → Like / Unlike
DELETE /api/videos/:id           → Supprimer vidéo
POST   /api/videos/:id/report    → Signaler
```

### Comments
```
GET    /api/videos/:id/comments  → Commentaires (paginated)
POST   /api/videos/:id/comments  → Poster commentaire
```

### Tips & Wallet
```
POST   /api/tips                 → Envoyer pourboire
GET    /api/wallet               → Mon wallet
POST   /api/wallet/deposit       → Recharger
POST   /api/wallet/withdraw      → Retirer
```

### Stats & Notifications
```
GET    /api/stats                → Stats créateur
GET    /api/notifications        → Mes notifications
PATCH  /api/notifications/read-all → Tout lire
```

### Conversations
```
GET    /api/conversations        → Mes conversations
POST   /api/conversations/:id/messages → Envoyer message
```

### Search & Admin
```
GET    /api/search?q=...         → Recherche globale
PATCH  /api/admin/videos/:id/hide    → Masquer vidéo
PATCH  /api/admin/users/:id/suspend  → Suspendre compte
```

---

## ⚡ PERFORMANCE & SCALABILITÉ

### Optimisations implémentées
- **Pagination** côté serveur (limit + skip)
- **Index MongoDB** sur tous les champs de recherche/tri
- **TTL automatique** sur les logs de vues (MongoDB)
- **Lazy loading** vidéos (grid auto-fill)
- **CDN Cloudinary** pour tous les médias
- **Compression FFmpeg** avant upload CDN
- **Rate limiting** par IP et par endpoint
- **WebSocket** pour le temps réel (pas de polling)

### Pour supporter 10,000+ utilisateurs simultanés
```bash
# 1. Activer le clustering Node.js
npm install pm2 -g
pm2 start server.js -i max  # 1 instance par CPU

# 2. Redis pour les sessions Socket.IO distribuées
npm install @socket.io/redis-adapter redis
# Dans server.js:
# const { createAdapter } = require('@socket.io/redis-adapter');
# io.adapter(createAdapter(pubClient, subClient));

# 3. Nginx comme load balancer + cache statique
# 4. MongoDB Atlas M30+ pour haute disponibilité
```

---

## 🔐 SÉCURITÉ

- ✅ JWT avec expiration (7 jours)
- ✅ Mots de passe hashés (bcrypt, salt 12)
- ✅ Rate limiting par IP
- ✅ Validation des entrées (longueurs max, types)
- ✅ Anti-spam commentaires (5/min max)
- ✅ Anti-fraude vues (fingerprint + TTL)
- ✅ Suspension de compte
- ✅ Auto-masquage contenu (10 signalements)
- ✅ Helmet.js (HTTP headers sécurité)
- ⬜ HTTPS obligatoire (Nginx + Let's Encrypt)
- ⬜ 2FA (à intégrer: TOTP/SMS)

---

## 💳 INTÉGRATION PAIEMENTS AFRIQUE

### CinetPay (recommandé — 22 pays)
```javascript
// Dans server.js, remplacer le placeholder deposit:
const CinetPay = require('cinetpay-nodejs');
const cp = new CinetPay(CINETPAY_API_KEY, CINETPAY_SITE_ID);
const payment = await cp.initializePayment({ amount, currency:'XOF', transaction_id: reference });
```

### Wave (Sénégal, Côte d'Ivoire)
```javascript
const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
  method: 'POST', headers: { Authorization: `Bearer ${WAVE_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency:'XOF', amount, success_url, error_url })
});
```

### Flooz / T-Money (Togo)
```javascript
// Intégration via Flexpay ou PaySika (agrégateurs locaux)
```

---

## 🌍 DÉPLOIEMENT RECOMMANDÉ

| Composant | Service | Coût estimé |
|-----------|---------|-------------|
| Backend API | Railway, Render, ou VPS | 5-20$/mois |
| Base de données | MongoDB Atlas M10 | 57$/mois |
| CDN Vidéos | Cloudinary (Free: 25GB) | 0-90$/mois |
| Frontend | Netlify / Vercel | Gratuit |
| Domaine .tg | ANRT Togo | ~50$/an |
| Certificat SSL | Let's Encrypt | Gratuit |

---

## 📞 SUPPORT & CONTACT

Développé par **Urek Digital** — Lomé, Togo 🇹🇬  
Email: contact@urekdigital.tg  
Pour personnalisation et déploiement: contactez-nous directement.
