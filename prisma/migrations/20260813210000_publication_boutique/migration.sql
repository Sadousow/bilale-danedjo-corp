-- Publication explicite de la vitrine.
--
-- Jusqu'ici, une boutique était servie aux visiteurs dès la seconde de son
-- inscription — sans produit, sans logo, avec les textes par défaut. Un
-- marchand qui partageait son adresse le premier jour montrait une coquille
-- vide.
--
-- Désormais la vitrine attend que le marchand la publie.

ALTER TABLE "Settings"
  ADD COLUMN "shopPublished" BOOLEAN NOT NULL DEFAULT false;

-- Les boutiques déjà en ligne le restent : leur vitrine tourne, parfois
-- depuis des mois, et la refermer serait une régression pour leurs clients.
UPDATE "Settings" SET "shopPublished" = true;

-- Les prochaines inscriptions repartiront de la valeur par défaut, false.
