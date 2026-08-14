-- Numéro de paiement de l'abonnement.
--
-- Le lien de paiement Djomy exige le numéro du payeur. Il était pris dans
-- `Settings.whatsappNumber` ou `Settings.companyPhone` — deux champs qui
-- s'affichent sur la vitrine. Un marchand qui ne les avait pas renseignés
-- recevait donc une facture sans aucun moyen de la régler, et le seul écran
-- où saisir ces numéros lui était fermé puisque sa boutique l'était.
--
-- Ce champ lui permet de donner le numéro depuis la page Abonnement, qui
-- reste ouverte, sans publier son numéro personnel sur sa devanture.

ALTER TABLE "Subscription" ADD COLUMN "billingPhone" TEXT;
