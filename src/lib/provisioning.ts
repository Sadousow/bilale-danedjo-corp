import "server-only";

import bcrypt from "bcryptjs";

import { platformDb } from "@/lib/db";
import { isSlugAvailableFormat } from "@/lib/host";
import { categories as defaultCategories } from "@/lib/products";
import { addDays, TRIAL_DAYS } from "@/lib/plans";
import { normalizePhone } from "@/lib/orders";
import { attachDomainToVercel } from "@/lib/domains";
import { decideRattachement } from "@/lib/shop-domain";

/**
 * Création d'une boutique.
 *
 * Tout se fait dans une seule transaction : soit la boutique existe avec son
 * administrateur, ses catégories et ses zones de livraison, soit rien n'est
 * écrit. Une boutique à moitié créée serait impossible à utiliser et pénible
 * à réparer.
 */

const DEFAULT_ZONES = [
  { name: "Conakry — centre", fee: 25000, freeAbove: 0, delay: "24 h", position: 0 },
  { name: "Conakry — banlieue", fee: 50000, freeAbove: 0, delay: "24 à 48 h", position: 1 },
  { name: "Intérieur du pays", fee: 150000, freeAbove: 0, delay: "3 à 5 jours", position: 2 },
];

export type CreateTenantInput = {
  slug: string;
  name: string;
  adminName: string;
  adminEmail: string;
  /**
   * Numéro du marchand, au format international sans `+`.
   *
   * C'est le seul canal fiable pour le joindre en Guinée : une adresse email
   * saisie à l'inscription est souvent créée pour l'occasion et jamais
   * relevée. Sans numéro, un marchand dont l'abonnement arrive à échéance est
   * injoignable.
   */
  phone?: string;
  password: string;
  status?: "ESSAI" | "ACTIF";
};

/**
 * Résultat du rattachement de l'adresse chez l'hébergeur.
 *
 * Volontairement séparé du succès de la création : une boutique créée dont
 * l'adresse n'est pas encore déclarée existe bel et bien et se répare d'un
 * script. L'inverse — refuser l'inscription parce que l'API de l'hébergeur
 * est indisponible — ferait perdre un client pour une panne qui n'est pas la
 * sienne.
 */
export type RattachementDomaine = {
  ok: boolean;
  message: string;
  host?: string;
};

export type CreateTenantResult =
  | { ok: true; tenantId: string; slug: string; domaine: RattachementDomaine }
  | { ok: false; error: string };

/** Le slug est-il bien formé et encore libre ? */
export async function checkSlug(
  raw: string
): Promise<{ available: boolean; reason?: string }> {
  const slug = raw.trim().toLowerCase();

  if (slug.length < 3) {
    return { available: false, reason: "Au moins 3 caractères." };
  }
  if (!isSlugAvailableFormat(slug)) {
    return {
      available: false,
      reason: "Lettres minuscules, chiffres et tirets uniquement.",
    };
  }

  const existing = await platformDb.tenant.findUnique({ where: { slug } });
  if (existing) return { available: false, reason: "Cette adresse est déjà prise." };

  return { available: true };
}

/** Transforme un nom d'entreprise en slug proposable. */
export function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
}

/**
 * Déclare l'adresse de la boutique chez l'hébergeur, sans jamais lever.
 *
 * Un échec est retourné, pas propagé : la boutique existe déjà en base à ce
 * stade. `scripts/rattacher-domaines.mjs` rattrape les adresses restées en
 * arrière.
 */
export async function rattacherAdresse(
  slug: string
): Promise<RattachementDomaine> {
  const decision = decideRattachement(slug);

  if (!decision.rattacher) {
    const messages = {
      "developpement-local":
        "Adresse non déclarée : domaine racine de développement.",
      "domaine-racine-absent":
        "Adresse non déclarée : NEXT_PUBLIC_ROOT_DOMAIN n'est pas défini.",
      "slug-invalide": "Adresse non déclarée : slug invalide.",
    } as const;
    return { ok: false, message: messages[decision.raison] };
  }

  try {
    const resultat = await attachDomainToVercel(decision.host);
    if (!resultat.ok) {
      console.warn(
        `[provisioning] ${decision.host} non rattaché : ${resultat.message}`
      );
    }
    return { ...resultat, host: decision.host };
  } catch (error) {
    /*
     * `attachDomainToVercel` capture déjà ses erreurs réseau, mais une
     * exception inattendue ici annulerait une inscription réussie. Ce filet
     * n'est pas du zèle : c'est la dernière chose entre une panne d'API et un
     * client perdu.
     */
    console.warn(`[provisioning] rattachement de ${decision.host} échoué`, error);
    return {
      ok: false,
      message: "L'adresse n'a pas pu être déclarée. Elle le sera au prochain passage.",
      host: decision.host,
    };
  }
}

export async function createTenant(
  input: CreateTenantInput
): Promise<CreateTenantResult> {
  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();
  const adminName = input.adminName.trim();
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const phone = (input.phone ?? "").trim();

  if (!name) return { ok: false, error: "Le nom de l'entreprise est obligatoire." };
  if (!adminName) return { ok: false, error: "Votre nom est obligatoire." };
  if (!adminEmail.includes("@"))
    return { ok: false, error: "Adresse email invalide." };
  if (input.password.length < 8)
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };

  const check = await checkSlug(slug);
  if (!check.available) {
    return { ok: false, error: check.reason ?? "Adresse indisponible." };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const tenant = await platformDb.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: { slug, name, status: input.status ?? "ESSAI" },
      });

      await tx.settings.create({
        data: {
          tenantId: created.id,
          companyName: name,
          companyEmail: adminEmail,
          companyPhone: phone,
          // Le même numéro sert de contact WhatsApp par défaut : c'est ce que
          // le marchand aurait saisi de toute façon.
          whatsappNumber: normalizePhone(phone) ?? "",
        },
      });

      await tx.user.create({
        data: {
          tenantId: created.id,
          email: adminEmail,
          name: adminName,
          role: "ADMIN",
          passwordHash,
        },
      });

      await tx.category.createMany({
        data: defaultCategories.map((c, index) => ({
          tenantId: created.id,
          key: c.key,
          label: c.label,
          description: c.description,
          position: index,
        })),
      });

      await tx.deliveryZone.createMany({
        data: DEFAULT_ZONES.map((z) => ({ tenantId: created.id, ...z })),
      });

      // L'essai donne accès à l'offre intermédiaire : le marchand voit ce
      // qu'il achètera, sans découvrir un produit amputé au premier jour.
      const trialPlan =
        (await tx.plan.findUnique({ where: { code: "boutique" } })) ??
        (await tx.plan.findFirst({
          where: { active: true },
          orderBy: { position: "asc" },
        }));

      if (trialPlan) {
        await tx.subscription.create({
          data: {
            tenantId: created.id,
            planId: trialPlan.id,
            status: input.status === "ACTIF" ? "ACTIF" : "ESSAI",
            currentPeriodEnd: addDays(new Date(), TRIAL_DAYS),
          },
        });
      }

      return created;
    });

    /*
     * Rattachement de l'adresse **après** la transaction, jamais dedans.
     *
     * Un appel réseau dans une transaction la maintiendrait ouverte le temps
     * d'un aller-retour vers Vercel, et un délai d'attente annulerait une
     * boutique déjà entièrement écrite.
     *
     * Ce que ça fait : l'enregistrement `*` du DNS fait résoudre
     * `<slug>.guygou.com`, mais Vercel ne présente un certificat que pour les
     * noms déclarés sur le projet. Sans cet appel, la boutique résout et
     * refuse la connexion — erreur de certificat côté navigateur, ou 525 si
     * Cloudflare proxifie. Le marchand voit une boutique morte le jour de son
     * inscription.
     */
    const domaine = await rattacherAdresse(tenant.slug);

    return { ok: true, tenantId: tenant.id, slug: tenant.slug, domaine };
  } catch {
    return {
      ok: false,
      error: "La création a échoué. Réessayez dans un instant.",
    };
  }
}
