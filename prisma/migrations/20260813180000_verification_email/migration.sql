-- Confirmation de l'adresse email d'un client.
--
-- Ferme la reprise de compte : jusqu'ici, un compte client créé lors d'un
-- achat en caisse — donc sans mot de passe — était rattaché à quiconque
-- s'inscrivait avec la même adresse ou le même téléphone. Connaître l'email
-- d'un client suffisait pour voir ses commandes et son solde de crédit.
--
-- NULL signifie « adresse non confirmée » : le compte existe, mais rien ne
-- prouve qu'elle appartient à son titulaire.

ALTER TABLE "Customer" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Les comptes déjà protégés par un mot de passe choisi en ligne sont
-- considérés comme confirmés : leur titulaire a déjà fait la démarche.
-- Les autres — créés en caisse — restent à confirmer.
UPDATE "Customer"
   SET "emailVerifiedAt" = "createdAt"
 WHERE "passwordHash" IS NOT NULL
   AND "email" IS NOT NULL;

-- La table des jetons prend un nom qui dit ce qu'elle contient désormais.
-- Le nom physique ne change pas : seul le modèle Prisma est renommé, via
-- @@map. Rien à faire ici, ce commentaire sert de trace.
