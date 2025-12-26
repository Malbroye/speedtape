const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

// Stockage des salles de jeu
const rooms = new Map();

// Leaderboard global
const leaderboard = [];

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
    // Générer plusieurs mots aléatoires SANS RÉPÉTITION
    const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));
    return selectedWords.join(" ");
  } else {
    // Mode phrases : retourner une phrase aléatoire
    return phrasesList[Math.floor(Math.random() * phrasesList.length)];
  }
}

// Middleware pour parser le JSON
app.use(express.json());

// Route pour obtenir le leaderboard
app.get("/api/leaderboard", (req, res) => {
  const topScores = leaderboard
    .sort((a, b) => b.wpm - a.wpm)
    .slice(0, 100);
  res.json(topScores);
});

// Route pour ajouter un score au leaderboard
app.post("/api/leaderboard", (req, res) => {
  const { username, wpm, mode, avatar } = req.body;
  
  if (!username || !wpm) {
    return res.status(400).json({ error: "Missing data" });
  }
  
  leaderboard.push({
    username,
    wpm,
    mode,
    avatar,
    date: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Servir les fichiers statiques
app.use(express.static("public"));

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

    // Envoyer le roomCode au joueur qui rejoint
    socket.emit("roomJoined", { roomCode, room });
    // Notifier tous les joueurs de la salle
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

    // Réinitialiser les joueurs
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
      const timeElapsed = (Date.now() - room.startTime) / 1000; // en secondes
      const words = room.currentText.split(" ").length;
      player.wpm = Math.round((words / timeElapsed) * 60);
    }

    io.to(roomCode).emit("progressUpdated", { room });

    // Vérifier si tous les joueurs ont fini
    const allFinished = room.players.every((p) => p.finished);
    if (allFinished && !room.gameFinished) {
      room.gameFinished = true;
      io.to(roomCode).emit("gameFinished", { room });
    }
  });

  socket.on("disconnect", () => {
    console.log("Joueur déconnecté:", socket.id);

    // Retirer le joueur de toutes les salles
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Salle ${roomCode} supprimée (vide)`);
        } else {
          // Si c'était l'hôte, assigner un nouvel hôte
          if (room.host === socket.id) {
            room.host = room.players[0].id;
          }
          io.to(roomCode).emit("playerLeft", { room });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
