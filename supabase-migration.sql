
-- Migration: Passer avatar en TEXT et supprimer les contraintes obsolètes
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_avatar_check;
ALTER TABLE leaderboard ALTER COLUMN avatar TYPE TEXT;
COMMENT ON COLUMN leaderboard.avatar IS 'Emoji ou data-URI de la photo';

-- S'assurer que uuid-ossp est activé pour users
CREATE EXTENSION IF NOT EXISTS \
uuid-ossp\;

-- Si la table users existe déjà, on vérifie la colonne avatar
ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;


-- Migration: Passer avatar en TEXT et supprimer les contraintes obsolètes
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_avatar_check;
ALTER TABLE leaderboard ALTER COLUMN avatar TYPE TEXT;
COMMENT ON COLUMN leaderboard.avatar IS 'Emoji ou data-URI de la photo';

-- S'assurer que uuid-ossp est activé pour users
CREATE EXTENSION IF NOT EXISTS \
uuid-ossp\;

-- Si la table users existe déjà, on vérifie la colonne avatar
ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;

