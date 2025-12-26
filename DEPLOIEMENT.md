# 🚀 Déploiement SpeedTape avec Railway + Supabase

## Pourquoi Railway + Supabase ?

- ✅ **Railway** : Supporte Socket.IO parfaitement
- ✅ **Supabase** : Base de données PostgreSQL gratuite
- ✅ **Gratuit** : Les deux ont des plans gratuits généreux
- ✅ **Simple** : Déploiement en quelques clics

---

## 📋 Étape 1 : Créer la Base de Données Supabase

### 1.1 Créer un compte Supabase

1. Va sur [supabase.com](https://supabase.com)
2. Clique sur "Start your project"
3. Connecte-toi avec GitHub

### 1.2 Créer un nouveau projet

1. Clique sur "New Project"
2. **Name** : `speedtape`
3. **Database Password** : Choisis un mot de passe fort (note-le !)
4. **Region** : Choisis le plus proche (ex: Europe West)
5. Clique sur "Create new project"
6. ⏳ Attends 2-3 minutes que le projet se crée

### 1.3 Créer la table leaderboard

1. Dans le menu de gauche, clique sur **SQL Editor**
2. Copie-colle ce code SQL :

```sql
-- Créer la table leaderboard
CREATE TABLE leaderboard (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  wpm INTEGER NOT NULL,
  mode TEXT NOT NULL,
  avatar INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index pour trier par WPM
CREATE INDEX idx_leaderboard_wpm ON leaderboard(wpm DESC);

-- Activer Row Level Security (sécurité)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

-- Politique : Tout le monde peut insérer
CREATE POLICY "Anyone can insert scores"
  ON leaderboard FOR INSERT
  WITH CHECK (true);
```

3. Clique sur **Run** (ou F5)
4. ✅ Tu devrais voir "Success. No rows returned"

### 1.4 Récupérer les clés d'API

1. Dans le menu de gauche, clique sur **Settings** (⚙️)
2. Clique sur **API**
3. Note ces deux valeurs :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (commence par `eyJ...`)

---

## 📋 Étape 2 : Modifier le Code pour Supabase

### 2.1 Installer le client Supabase

```bash
npm install @supabase/supabase-js
```

### 2.2 Créer un fichier de configuration

Crée un fichier `.env` à la racine du projet :

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
```

⚠️ **Important** : Remplace par tes vraies valeurs Supabase !

### 2.3 Modifier `server.js`

Ajoute en haut du fichier (après les imports) :

```javascript
const { createClient } = require("@supabase/supabase-js");

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
```

Remplace les routes leaderboard par :

```javascript
// Route pour obtenir le leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("wpm", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erreur leaderboard:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour ajouter un score au leaderboard
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { username, wpm, mode, avatar } = req.body;

    if (!username || !wpm) {
      return res.status(400).json({ error: "Missing data" });
    }

    const { data, error } = await supabase
      .from("leaderboard")
      .insert([{ username, wpm, mode, avatar }])
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error("Erreur insertion:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
```

### 2.4 Charger les variables d'environnement

Ajoute tout en haut de `server.js` :

```javascript
require("dotenv").config();
```

Installe dotenv :

```bash
npm install dotenv
```

---

## 📋 Étape 3 : Déployer sur Railway

### 3.1 Créer un compte Railway

1. Va sur [railway.app](https://railway.app)
2. Clique sur "Login" → "Login with GitHub"
3. Autorise Railway

### 3.2 Créer un nouveau projet

1. Clique sur "New Project"
2. Sélectionne "Deploy from GitHub repo"
3. Connecte ton repository `speedtape`
4. Railway détecte automatiquement que c'est du Node.js

### 3.3 Configurer les variables d'environnement

1. Dans le dashboard Railway, clique sur ton service
2. Clique sur l'onglet **Variables**
3. Ajoute ces variables :
   - `SUPABASE_URL` : ton URL Supabase
   - `SUPABASE_KEY` : ta clé anon Supabase
   - `PORT` : `3000` (optionnel, Railway le fait auto)

### 3.4 Déployer

1. Railway déploie automatiquement !
2. Attends 2-3 minutes
3. Clique sur "Settings" → "Generate Domain"
4. ✅ Ton app sera sur `https://speedtape-production.up.railway.app`

---

## 🎉 C'est Fini !

Ton app est maintenant en ligne avec :

- ✅ **Multijoueur** fonctionnel (Socket.IO)
- ✅ **Leaderboard permanent** (Supabase)
- ✅ **Accessible de partout**
- ✅ **Gratuit** (dans les limites des plans gratuits)

### Limites du Plan Gratuit Railway

- **$5 de crédit/mois** (suffisant pour un petit jeu)
- Si tu dépasses, l'app s'arrête jusqu'au mois suivant
- Pas de limite de temps d'activité (contrairement à Render)

### Limites du Plan Gratuit Supabase

- **500 MB de base de données**
- **Largement suffisant** pour des milliers de scores

---

## 🔧 Tester en Local avec Supabase

Avant de déployer, teste en local :

```bash
# Assure-toi que .env est configuré
npm install
npm start
```

Ouvre `http://localhost:3000` et teste le leaderboard !

---

## 📊 Voir les Données Supabase

1. Va sur ton projet Supabase
2. Clique sur **Table Editor**
3. Sélectionne la table `leaderboard`
4. Tu verras tous les scores en temps réel !

---

## 🆘 Problèmes Courants

### "Cannot connect to Supabase"

- Vérifie que `SUPABASE_URL` et `SUPABASE_KEY` sont corrects
- Vérifie que les politiques RLS sont activées

### "Leaderboard vide"

- Vérifie que la table `leaderboard` existe
- Vérifie les politiques de sécurité (RLS)

### "Railway ne démarre pas"

- Vérifie les logs dans Railway Dashboard
- Vérifie que toutes les variables d'env sont définies

---

## 🎯 Prochaines Étapes

Une fois déployé, tu peux :

- Partager l'URL avec tes amis
- Ajouter un nom de domaine personnalisé
- Monitorer les performances
- Ajouter plus de fonctionnalités !

**Besoin d'aide pour configurer ? Dis-moi où tu bloques !** 🚀
