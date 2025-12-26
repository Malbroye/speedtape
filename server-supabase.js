// ============================================
// SpeedTape Server - Version Supabase
// ============================================
// Ce fichier remplace server.js pour utiliser Supabase
// Renomme server.js en server.old.js
// Puis renomme ce fichier en server.js

require('dotenv').config();
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  ERREUR: Variables SUPABASE_URL et SUPABASE_KEY manquantes dans .env');
  console.log('Créez un fichier .env avec vos clés Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Stockage des salles de jeu (en mémoire, comme avant)
const rooms = new Map();

// Listes de mots variées (sans répétition dans une partie)
const wordsList = [
  "chat", "chien", "maison", "voiture", "ordinateur", "téléphone", "musique", "danse",
  "soleil", "lune", "étoile", "montagne", "océan", "forêt", "jardin", "fleur",
  "livre", "stylo", "table", "chaise", "fenêtre", "porte", "clavier", "souris",
  "écran", "papier", "crayon", "gomme", "règle", "sac", "veste", "pantalon",
  "chocolat", "café", "thé", "pain", "fromage", "pizza", "salade", "soupe",
  "pomme", "banane", "orange", "fraise", "raisin", "cerise", "poire", "melon",
  "rouge", "bleu", "vert", "jaune", "noir", "blanc", "rose", "violet",
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
  "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
  "septembre", "octobre", "novembre", "décembre", "printemps", "été", "automne", "hiver",
  "amour", "joie", "paix", "espoir", "rêve", "bonheur", "liberté", "courage",
  "force", "sagesse", "beauté", "vérité", "justice", "harmonie", "passion", "fierté",
  "guitare", "piano", "violon", "batterie", "trompette", "saxophone", "flûte", "harpe",
  "football", "tennis", "basket", "natation", "cyclisme", "course", "yoga", "danse",
  "cinéma", "théâtre", "concert", "festival", "exposition", "musée", "galerie", "spectacle",
  "voyage", "aventure", "découverte", "exploration", "randonnée", "camping", "plage", "montagne",
  "dragon", "licorne", "phénix", "sirène", "elfe", "fée", "géant", "nain",
  "robot", "fusée", "satellite", "planète", "galaxie", "cosmos", "astronaute", "étoile",
  "château", "palais", "tour", "pont", "temple", "cathédrale", "monument", "statue",
  "rivière", "lac", "cascade", "source", "ruisseau", "fleuve", "mer", "océan"
];

const phrasesList = [
  "Le chat dort paisiblement sur le canapé",
  "La musique adoucit les mœurs",
  "Un voyage de mille lieues commence par un pas",
  "Le temps passe vite quand on s'amuse",
  "La vie est belle quand on sait en profiter",
  "Les étoiles brillent dans le ciel nocturne",
  "Un bon livre vaut mieux qu'un long discours",
  "La patience est la clé du succès",
  "Chaque jour est une nouvelle aventure",
  "L'amitié est un trésor précieux",
  "Le sourire est contagieux et réchauffe les cœurs",
  "La nature est pleine de merveilles",
  "Apprendre c'est grandir chaque jour",
  "Le courage n'est pas l'absence de peur",
  "La créativité n'a pas de limites",
  "Les rêves sont les graines de la réalité",
  "Chaque échec est une leçon déguisée",
  "L'imagination est plus importante que le savoir",
  "La persévérance mène au succès",
  "Le bonheur se trouve dans les petites choses",
  "La curiosité est le moteur de la découverte",
  "L'art est l'expression de l'âme",
  "La gentillesse ne coûte rien mais vaut tout",
  "Les souvenirs sont les trésors du cœur",
  "La liberté est le plus beau des cadeaux"
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomText(mode, wordCount = 10) {
  if (mode === "words") {
    const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));
    return selectedWords.join(" ");
  } else {
    return phrasesList[Math.floor(Math.random() * phrasesList.length)];
  }
}

// Middleware
app.use(express.json());

// ============================================
// ROUTES API LEADERBOARD (Supabase)
// ============================================

// GET - Récupérer le leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('wpm', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Erreur Supabase GET:', error);
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Erreur leaderboard GET:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// POST - Ajouter un score au leaderboard
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { username, wpm, mode, avatar } = req.body;
    
    // Validation
    if (!username || !wpm || !mode || avatar === undefined) {
      return res.status(400).json({ error: "Données manquantes" });
    }
    
    if (username.length > 15) {
      return res.status(400).json({ error: "Pseudo trop long (max 15 caractères)" });
    }
    
    if (wpm < 0 || wpm > 500) {
      return res.status(400).json({ error: "WPM invalide" });
    }
    
    // Insertion dans Supabase
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([{ 
        username: username.trim(), 
        wpm: parseInt(wpm), 
        mode, 
        avatar: parseInt(avatar) 
      }])
      .select();
    
    if (error) {
      console.error('Erreur Supabase POST:', error);
      throw error;
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur leaderboard POST:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Route de test pour vérifier la connexion Supabase
app.get("/api/health", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('count')
      .limit(1);
    
    res.json({ 
      status: 'ok', 
      supabase: error ? 'error' : 'connected',
      error: error ? error.message : null
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Servir les fichiers statiques
app.use(express.static("public"));

// ============================================
// SOCKET.IO - Multijoueur
// ============================================

io.on("connection", (socket) => {
  console.log("Nouveau joueur connecté:", socket.id);

  socket.on("createRoom", ({ username, mode, wordCount, avatar }) => {
    const roomCode = generateRoomCode();
    const player = {
      id: socket.id,
      username,
      avatar: avatar !== undefined ? avatar : Math.floor(Math.random() * 8),
      progress: 0,
      finished: false,
      wpm: 0,
    };

    rooms.set(roomCode, {
      code: roomCode,
      mode,
      wordCount: wordCount || 10,
      players: [player],
      currentText: "",
      gameStarted: false,
      gameFinished: false,
      host: socket.id,
    });

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, room: rooms.get(roomCode) });
    console.log(`Salle créée: ${roomCode} par ${username}`);
  });

  socket.on("joinRoom", ({ roomCode, username, avatar }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("error", { message: "Salle introuvable" });
      return;
    }

    if (room.players.length >= 4) {
      socket.emit("error", { message: "Salle pleine (max 4 joueurs)" });
      return;
    }

    if (room.gameStarted) {
      socket.emit("error", { message: "La partie a déjà commencé" });
      return;
    }

    const player = {
      id: socket.id,
      username,
      avatar: avatar !== undefined ? avatar : Math.floor(Math.random() * 8),
      progress: 0,
      finished: false,
      wpm: 0,
    };

    room.players.push(player);
    socket.join(roomCode);

    socket.emit("roomJoined", { roomCode, room });
    io.to(roomCode).emit("playerJoined", { room });
    console.log(`${username} a rejoint la salle ${roomCode}`);
  });

  socket.on("startGame", ({ roomCode }) => {
    const room = rooms.get(roomCode);

    if (!room || room.host !== socket.id) {
      return;
    }

    room.currentText = getRandomText(room.mode, room.wordCount);
    room.gameStarted = true;
    room.gameFinished = false;
    room.startTime = Date.now();

    room.players.forEach((player) => {
      player.progress = 0;
      player.finished = false;
      player.wpm = 0;
    });

    io.to(roomCode).emit("gameStarted", {
      text: room.currentText,
      room,
    });
    console.log(`Partie démarrée dans la salle ${roomCode}`);
  });

  socket.on("updateProgress", ({ roomCode, progress, finished }) => {
    const room = rooms.get(roomCode);

    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.progress = progress;

    if (finished && !player.finished) {
      player.finished = true;
      const timeElapsed = (Date.now() - room.startTime) / 1000;
      const words = room.currentText.split(" ").length;
      player.wpm = Math.round((words / timeElapsed) * 60);
    }

    io.to(roomCode).emit("progressUpdated", { room });

    const allFinished = room.players.every((p) => p.finished);
    if (allFinished && !room.gameFinished) {
      room.gameFinished = true;
      io.to(roomCode).emit("gameFinished", { room });
    }
  });

  socket.on("disconnect", () => {
    console.log("Joueur déconnecté:", socket.id);

    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Salle ${roomCode} supprimée (vide)`);
        } else {
          if (room.host === socket.id) {
            room.host = room.players[0].id;
          }
          io.to(roomCode).emit("playerLeft", { room });
        }
      }
    });
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`✅ Supabase connecté à ${supabaseUrl}`);
});
