-- Palette de départ neutre pour les boutiques neuves.
--
-- Les valeurs par défaut étaient celles du commerce d'origine : toute
-- boutique créée lui ressemblait tant que le marchand n'y touchait pas.
--
-- Un ardoise très sombre et un ambre chaud s'accordent avec à peu près
-- n'importe quel logo téléversé ensuite.

ALTER TABLE "Settings" ALTER COLUMN "primaryColor" SET DEFAULT '#1F2937';
ALTER TABLE "Settings" ALTER COLUMN "accentColor"  SET DEFAULT '#B45309';

-- Les boutiques existantes gardent leurs couleurs : celles qui ont choisi,
-- comme celles qui n'ont jamais touché aux réglages. Les repeindre d'office
-- serait une surprise désagréable pour un marchand qui a déjà des clients.
