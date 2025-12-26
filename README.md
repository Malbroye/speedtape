# ⚡ SpeedTape - Jeu Multijoueur de Vitesse de Frappe

Un jeu multijoueur moderne et compétitif où tu défies tes amis dans des courses de frappe épiques !

## 🎮 Fonctionnalités

### Multijoueur en Temps Réel

- **2 à 4 joueurs** par salle
- **Salles privées** avec codes uniques
- **Synchronisation instantanée** via WebSocket
- **Progression en direct** de tous les joueurs

### Modes de Jeu

- 🔤 **Mode Mots** : Tape des mots simples (5, 10, 20 ou 50 mots)
- 📖 **Mode Phrases** : Tape des phrases complètes

### Personnalisation

- **8 avatars emoji** au choix (🦊 🐼 🦁 🐯 🐸 🦄 🐲 🦉)
- **Sauvegarde automatique** du pseudo et avatar (LocalStorage)
- **Choix du nombre de mots** pour le mode Mots

### Système de Feedback

- ✅ **Lettres vertes** quand tu tapes correctement
- ❌ **Lettres rouges** quand tu fais une erreur
- **Lettre actuelle** mise en surbrillance
- **Barres de progression** en temps réel

### Leaderboard Global

- 🏆 **Classement mondial** des meilleurs scores
- **Filtres** par mode de jeu (Mots / Phrases)
- **Top 100** des meilleurs joueurs
- **Statistiques** : WPM (mots par minute)

### Design Moderne

- **Interface épurée** et professionnelle
- **Thème sombre** élégant
- **Animations fluides** et micro-interactions
- **Responsive** : fonctionne sur mobile et desktop

## 🚀 Installation

1. **Installer les dépendances** :

```bash
npm install
```

2. **Lancer le serveur** :

```bash
npm start
```

3. **Ouvrir le jeu** :

```
http://localhost:3000
```

## 🎯 Comment jouer

### Créer une partie

1. Entre ton pseudo (sauvegardé automatiquement)
2. Choisis ton avatar préféré
3. Sélectionne le mode de jeu
4. Pour le mode Mots, choisis le nombre de mots (5, 10, 20 ou 50)
5. Clique sur "Créer une salle"
6. Partage le code avec tes amis
7. Lance la partie quand tout le monde est prêt

### Rejoindre une partie

1. Entre ton pseudo
2. Choisis ton avatar
3. Entre le code de la salle
4. Clique sur "Rejoindre"
5. Attends que l'hôte démarre

### Pendant la partie

- **Tape le texte affiché** le plus vite possible
- Les lettres deviennent **vertes** ✅ si correct
- Les lettres deviennent **rouges** ❌ si erreur
- Regarde la **progression** de tes adversaires
- Le **plus rapide** gagne ! 🏆

### Après la partie

- Consulte ton **score en WPM** (mots par minute)
- Vérifie ton **classement** dans la partie
- Ton score est **automatiquement ajouté** au leaderboard
- Clique sur "Rejouer" pour une nouvelle manche

## 🛠️ Technologies utilisées

### Backend

- **Node.js** + Express
- **Socket.IO** pour le temps réel
- **API REST** pour le leaderboard

### Frontend

- **HTML5** sémantique
- **CSS3** moderne (variables CSS, Grid, Flexbox)
- **JavaScript** vanilla (ES6+)
- **LocalStorage** pour la persistance

### Design

- **Police Inter** pour une typographie moderne
- **Palette de couleurs** cohérente et accessible
- **Animations CSS** fluides
- **Architecture responsive**

## 📁 Structure du projet

```
speedtape/
├── server.js              # Serveur Node.js + Socket.IO + API
├── package.json           # Dépendances
└── public/
    ├── index.html         # Interface utilisateur
    ├── style.css          # Styles modernes
    └── app.js             # Logique client + WebSocket
```

## 🎨 Fonctionnalités techniques

### Système de Mots Sans Répétition

- Algorithme de **mélange aléatoire** (Fisher-Yates)
- **Aucun mot en double** dans une même partie
- **140+ mots** variés dans la base de données

### Synchronisation Temps Réel

- **WebSocket bidirectionnel** avec Socket.IO
- **Gestion automatique** des déconnexions
- **Transfert d'hôte** si l'hôte quitte
- **Nettoyage automatique** des salles vides

### Calcul de Performance

- **WPM** (Words Per Minute) précis
- Basé sur le **temps réel** de frappe
- **Arrondi intelligent** des résultats

### Persistance des Données

- **LocalStorage** pour pseudo et avatar
- **Leaderboard en mémoire** (serveur)
- **Tri automatique** par performance

## 🌟 Améliorations futures possibles

- [ ] Base de données persistante (MongoDB/PostgreSQL)
- [ ] Authentification utilisateur
- [ ] Profils joueurs avec statistiques
- [ ] Mode entraînement solo
- [ ] Nouveaux modes : Sprint (30s), Marathon (100 mots)
- [ ] Système de niveaux et achievements
- [ ] Chat en jeu
- [ ] Replay des parties
- [ ] Thèmes personnalisables
- [ ] Support multilingue

## 📝 Notes de développement

### Mots Sans Répétition

La fonction `getRandomText()` utilise un algorithme de mélange pour garantir qu'aucun mot n'apparaît deux fois dans une même partie :

```javascript
const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
const selectedWords = shuffled.slice(0, wordCount);
```

### LocalStorage

Le pseudo et l'avatar sont sauvegardés automatiquement :

```javascript
localStorage.setItem("speedtape_username", username);
localStorage.setItem("speedtape_avatar", avatarIndex);
```

### API Leaderboard

- `GET /api/leaderboard` : Récupère le top 100
- `POST /api/leaderboard` : Ajoute un nouveau score

## 📄 Licence

Projet libre d'utilisation - Amuse-toi bien ! 🎉

---

Développé avec ❤️ pour les passionnés de vitesse de frappe !
