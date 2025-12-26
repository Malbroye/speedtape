-- ============================================
-- SpeedTape - Configuration Base de Données
-- Supabase PostgreSQL
-- ============================================

-- Activer l'extension pour les UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer la table leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  wpm INTEGER NOT NULL CHECK (wpm >= 0 AND wpm <= 500),
  mode TEXT NOT NULL CHECK (mode IN ('words', 'phrases')),
  avatar TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_leaderboard_wpm ON leaderboard(wpm DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_mode ON leaderboard(mode);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard(created_at DESC);

-- Activer Row Level Security (sécurité)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Anyone can read leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Anyone can insert scores" ON leaderboard;

-- Politique : Tout le monde peut lire le leaderboard
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

-- Politique : Tout le monde peut insérer des scores
CREATE POLICY "Anyone can insert scores"
  ON leaderboard FOR INSERT
  WITH CHECK (
    username IS NOT NULL 
    AND length(username) > 0 
    AND length(username) <= 15
    AND wpm > 0
  );

-- Créer une vue pour le top 100
CREATE OR REPLACE VIEW top_leaderboard AS
SELECT 
  id,
  username,
  wpm,
  mode,
  avatar,
  created_at,
  ROW_NUMBER() OVER (ORDER BY wpm DESC) as rank
FROM leaderboard
ORDER BY wpm DESC
LIMIT 100;

-- Créer la table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commentaires pour documentation
COMMENT ON TABLE leaderboard IS 'Stocke les scores des joueurs de SpeedTape';
COMMENT ON COLUMN leaderboard.username IS 'Pseudo du joueur (max 15 caractères)';
COMMENT ON COLUMN leaderboard.wpm IS 'Mots par minute (0-500)';
COMMENT ON COLUMN leaderboard.mode IS 'Mode de jeu: words ou phrases';
COMMENT ON COLUMN leaderboard.avatar IS 'Emoji ou data-URI de la photo';
COMMENT ON COLUMN leaderboard.created_at IS 'Date et heure du score';

COMMENT ON TABLE users IS 'Stocke les comptes utilisateurs';
