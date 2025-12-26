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

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getRandomText(mode, wordCount = 10, withAccents = true) {
  let text = "";
  if (mode === "words") {
    const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));
    text = selectedWords.join(" ");
  } else {
    text = phrasesList[Math.floor(Math.random() * phrasesList.length)];
  }

  return withAccents ? text : removeAccents(text);
}

// Middleware
app.use(express.json({ limit: '50kb' })); // Autoriser base64 léger

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
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Erreur leaderboard GET:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Ajouter un score au leaderboard
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { username, wpm, mode, avatar } = req.body;
    
    if (!username || !wpm) {
      return res.status(400).json({ error: "Missing data" });
    }
    
    // Pour le leaderboard Supabase, on tronque l'avatar si c'est un base64 trop long
    // ou on garde l'index si c'est un emoji. 
    // On va stocker l'avatar tel quel (Supabase TEXT supporte bien)
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([{ 
        username: username.trim(), 
        wpm: parseInt(wpm), 
        mode, 
        avatar: avatar.toString().substring(0, 10000) // Sécurité
      }])
      .select();
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur leaderboard POST:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES AUTHENTIFICATION (PIN 4 Chiffres)
// ============================================

// Register - Créer un compte
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length !== 4) {
      return res.status(400).json({ error: "Pseudo ou PIN invalide" });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ username: username.trim(), password: password }]) // En production, il faut hasher !
      .select();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: "Ce pseudo est déjà pris" });
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login - Se connecter
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .limit(1)
      .single();

    if (error || !data) return res.status(400).json({ error: "Utilisateur non trouvé" });
    if (data.password !== password) return res.status(400).json({ error: "Code PIN incorrect" });

    res.json({ success: true, avatar: data.avatar });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update Avatar
app.post("/api/update-avatar", async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const { error } = await supabase
      .from('users')
      .update({ avatar })
      .eq('username', username.trim());
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
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

// Désactiver le cache pour les fichiers statiques (pour que les modifs soient directes)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Servir les fichiers statiques avec un chemin absolu
app.use(express.static(path.join(__dirname, "public")));

// Route par défaut (Catch-all) pour servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================
// SOCKET.IO - Multijoueur
// ============================================

io.on("connection", (socket) => {
  console.log("Nouveau joueur connecté:", socket.id);

  socket.on("joinRandom", ({ username, avatar }) => {
    // Cherche une salle joinable
    const joinableRooms = Array.from(rooms.values()).filter(r => 
        !r.gameStarted && 
        !r.gameFinished && 
        r.players.length < 4
    );
    
    if (joinableRooms.length === 0) {
      socket.emit("error", { message: "Aucune salle disponible. Créez-en une !" });
      return;
    }

    const room = joinableRooms[Math.floor(Math.random() * joinableRooms.length)];
    const roomCode = room.code;

    // Logique de jointure directe
    let finalUsername = username;
    if (room.players.some(p => p.username.toLowerCase() === username.toLowerCase())) {
      finalUsername = `${username}_${Math.floor(Math.random() * 999)}`;
    }

    const player = {
      id: socket.id,
      username: finalUsername,
      avatar: avatar || '🦊',
      progress: 0,
      wordsCount: 0,
      finished: false,
      wpm: 0,
      lives: room.livesCount,
      isEliminated: false,
      maxCombo: 0,
      totalMistakes: 0,
      accuracy: 100
    };

    room.players.push(player);
    socket.join(roomCode);

    socket.emit("roomJoined", { roomCode, room });
    io.to(roomCode).emit("playerJoined", { room });
    console.log(`📡 [JoinRandom] ${finalUsername} joined room ${roomCode}`);
  });

  socket.on("createRoom", ({ username, mode, wordCount, avatar }) => {
    const roomCode = generateRoomCode();
    const player = {
      id: socket.id,
      username,
      avatar: avatar || '🦊',
      progress: 0,
      wordsCount: 0,
      finished: false,
      wpm: 0,
      lives: 3,
      isEliminated: false,
      maxCombo: 0,
      totalMistakes: 0,
      accuracy: 100
    };

    rooms.set(roomCode, {
      code: roomCode,
      mode: mode || "words",
      wordCount: wordCount || 10,
      withAccents: true,
      suddenDeath: false,
      isZen: false,
      autoValidate: true,
      lastStressStage: {}, // Suivi des alertes envoyées
      livesCount: 3,
      players: [player],
      currentText: "",
      gameStarted: false,
      gameFinished: false,
      host: socket.id,
    });

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, room: rooms.get(roomCode) });
  });

  socket.on("joinRoom", ({ roomCode, username, avatar }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("error", { message: "Salle introuvable" });
      return;
    }

    if (room.players.length >= 4 || room.gameStarted) {
      socket.emit("error", { message: "Impossible de rejoindre (salle pleine ou en jeu)" });
      return;
    }

    let finalUsername = username;
    let isNameTaken = room.players.some(p => p.username.toLowerCase() === username.toLowerCase());
    
    if (isNameTaken) {
      finalUsername = `${username}_${Math.floor(Math.random() * 999)}`;
    }

    const player = {
      id: socket.id,
      username: finalUsername,
      avatar: avatar || '🦊',
      progress: 0,
      wordsCount: 0,
      finished: false,
      wpm: 0,
      lives: room.livesCount,
      isEliminated: false,
      maxCombo: 0,
      totalMistakes: 0,
      accuracy: 100
    };

    room.players.push(player);
    socket.join(roomCode);

    socket.emit("roomJoined", { roomCode, room });
    io.to(roomCode).emit("playerJoined", { room });
  });

  socket.on("updateSettings", ({ roomCode, settings }) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    // Mise à jour des paramètres autorisés
    const allowed = ["mode", "wordCount", "withAccents", "suddenDeath", "livesCount", "isZen", "autoValidate"];
    allowed.forEach(key => {
      if (settings[key] !== undefined) {
        room[key] = settings[key];
      }
      // Sécurité : s'assurer que autoValidate existe toujours
      if (room.autoValidate === undefined) room.autoValidate = true;
    });

    console.log(`⚙️ Room ${roomCode} status:`, { mode: room.mode, auto: room.autoValidate });
    // Synchronisation pour tout le monde
    io.to(roomCode).emit("settingsUpdated", { room });
  });

  socket.on("startGame", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    room.currentText = getRandomText(room.mode, room.wordCount, room.withAccents);
    room.gameStarted = true;
    room.gameFinished = false;
    room.startTime = Date.now();

    room.players.forEach((player) => {
      player.progress = 0;
      player.wordsCount = 0;
      player.finished = false;
      player.wpm = 0;
      player.lives = room.livesCount;
      player.isEliminated = false;
      player.maxCombo = 0;
      player.totalMistakes = 0;
      player.accuracy = 100;
    });

    io.to(roomCode).emit("gameStarted", {
      text: room.currentText,
      room,
    });
  });

  socket.on("updateProgress", ({ roomCode, progress, finished, errors, wordsCount, maxCombo, totalMistakes, accuracy }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.isEliminated) return;
    
    player.progress = progress;
    if (wordsCount !== undefined) player.wordsCount = wordsCount;
    if (maxCombo !== undefined) player.maxCombo = maxCombo;
    if (totalMistakes !== undefined) player.totalMistakes = totalMistakes;
    if (accuracy !== undefined) player.accuracy = accuracy;

    // Gestion des erreurs (perte de vie / mort subite)
    if (errors > 0 && !room.isZen) {
      if (room.suddenDeath) {
        player.isEliminated = true;
      } else {
        player.lives = Math.max(0, room.livesCount - errors);
        if (player.lives <= 0) {
          player.isEliminated = true;
        }
      }
    }

    if (finished && !player.finished && !player.isEliminated) {
      player.finished = true;
      const timeElapsed = (Date.now() - room.startTime) / 1000;
      const words = room.currentText.split(" ").length;
      player.wpm = Math.round((words / timeElapsed) * 60);
      
      // Fin immédiate pour tout le monde dès que le premier termine
      if (!room.gameFinished) {
          room.gameFinished = true;
          io.to(roomCode).emit("gameFinished", { room });
      }
    }

    io.to(roomCode).emit("progressUpdated", { room });
  });

  const handlePlayerDeparture = (socketId) => {
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex((p) => p.id === socketId);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Salle ${roomCode} supprimée - vide`);
        } else {
          if (room.host === socketId) {
            room.host = room.players[0].id;
          }
          io.to(roomCode).emit("playerLeft", { room });

          // Si la partie est en cours et qu'il ne reste qu'un seul joueur
          if (room.gameStarted && !room.gameFinished && room.players.length === 1) {
            io.to(roomCode).emit("lastPlayerStanding", { 
                message: `Un joueur a quitté, voulez-vous arrêter la partie ?` 
            });
          }
        }
      }
    });
  };

  socket.on("leaveRoom", ({ roomCode }) => {
    handlePlayerDeparture(socket.id);
    socket.leave(roomCode);
  });

  socket.on("stopGame", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.gameFinished = true;
      io.to(roomCode).emit("gameFinished", { room });
    }
  });

  socket.on("backToLobby", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    // Seul l'hôte peut renvoyer tout le monde au lobby
    if (room.host !== socket.id) return;

    room.gameStarted = false;
    room.gameFinished = false;
    
    // Reset players for lobby
    room.players.forEach(p => {
        p.progress = 0;
        p.finished = false;
        p.wpm = 0;
        p.isEliminated = false;
        p.lives = room.livesCount;
    });

    io.to(roomCode).emit("backToLobby", { room });
  });

  socket.on("disconnect", () => {
    console.log("Joueur déconnecté:", socket.id);
    handlePlayerDeparture(socket.id);
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`✅ Supabase connecté à ${supabaseUrl}`);
});
