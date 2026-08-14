/**
 * Gabarits des messages — fonctions pures, testables sans réseau ni base.
 *
 * Deux règles tenues partout :
 *
 * 1. **Le texte brut est écrit en premier et se suffit à lui-même.** C'est
 *    lui qui partira par SMS le jour venu, et lui que lit un téléphone
 *    d'entrée de gamme.
 * 2. **Tout ce qui vient de la base est échappé** avant d'entrer dans le
 *    HTML. Un nom de boutique, un nom de client, un libellé de produit :
 *    rien de tout cela n'est de confiance.
 */

export type Rendered = { subject: string; text: string; html: string };

/**
 * Couleurs du message.
 *
 * Un message envoyé au nom d'une boutique porte les couleurs de cette
 * boutique — sinon un marchand aux couleurs rouges envoie des courriers
 * verts, et le client ne reconnaît pas l'expéditeur.
 *
 * Les avis d'abonnement, eux, viennent de la plateforme : ils gardent les
 * valeurs par défaut ci-dessous.
 */
export type MailColors = { primary: string; accent: string; paper: string };

export const PLATFORM_COLORS: MailColors = {
  primary: "#0E3B2E",
  accent: "#5FB63F",
  paper: "#F7F1E4",
};

/**
 * Les couleurs entrent dans un attribut `style` : on n'y laisse passer que
 * de l'hexadécimal. Une valeur venue des réglages d'un marchand ne doit pas
 * pouvoir refermer l'attribut et en ouvrir un autre.
 */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function mailColors(
  primary?: string | null,
  accent?: string | null
): MailColors {
  return {
    primary: HEX.test(primary ?? "") ? primary! : PLATFORM_COLORS.primary,
    accent: HEX.test(accent ?? "") ? accent! : PLATFORM_COLORS.accent,
    paper: PLATFORM_COLORS.paper,
  };
}

/** Échappement HTML. Aucune donnée ne rejoint le gabarit sans passer par là. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Montants en GNF : entiers, séparés par espaces insécables. */
export function formatGNF(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${rounded.toLocaleString("fr-FR").replace(/ | /g, " ")} GNF`;
}

/**
 * Enveloppe HTML commune.
 *
 * Styles en ligne et tableau unique : les clients de messagerie ignorent les
 * feuilles de style externes, et beaucoup ignorent aussi le CSS moderne. Ce
 * qui ressemble à du HTML de 2005 est ce qui s'affiche partout.
 */
function wrap(options: {
  title: string;
  body: string;
  shopName: string;
  footer?: string;
  colors?: MailColors;
}): string {
  const c = options.colors ?? PLATFORM_COLORS;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(options.title)}</title></head>
<body style="margin:0;padding:0;background:${c.paper};font-family:Helvetica,Arial,sans-serif;color:#14110f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.paper};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px 26px;">
<tr><td style="font-size:17px;font-weight:bold;color:${c.primary};padding-bottom:18px;border-bottom:2px solid ${c.primary};">${escapeHtml(options.shopName)}</td></tr>
<tr><td style="padding-top:20px;font-size:15px;line-height:1.6;">${options.body}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;padding:16px 26px;">
<tr><td style="font-size:12px;line-height:1.5;color:#6b6b6b;">${escapeHtml(options.footer ?? "")}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Bouton d'action. Un lien stylé — les vrais boutons ne survivent pas. */
function button(label: string, url: string, colors?: MailColors): string {
  const c = colors ?? PLATFORM_COLORS;
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:${c.primary};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

// ------------------------------------------------------ mot de passe oublié

export function passwordReset(input: {
  colors?: MailColors;
  shopName: string;
  name: string;
  url: string;
  minutes: number;
}): Rendered {
  const text = `Bonjour ${input.name},

Vous avez demandé à réinitialiser votre mot de passe sur ${input.shopName}.

Ouvrez ce lien pour choisir un nouveau mot de passe :
${input.url}

Ce lien expire dans ${input.minutes} minutes et ne fonctionne qu'une fois.

Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.`;

  const html = wrap({
    colors: input.colors,
    title: "Réinitialisation du mot de passe",
    shopName: input.shopName,
    body: `<p>Bonjour ${escapeHtml(input.name)},</p>
<p>Vous avez demandé à réinitialiser votre mot de passe.</p>
${button("Choisir un nouveau mot de passe", input.url, input.colors)}
<p style="font-size:13px;color:#6b6b6b;">Ce lien expire dans ${input.minutes} minutes et ne fonctionne qu'une fois.</p>`,
    footer:
      "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.",
  });

  return {
    subject: `Réinitialiser votre mot de passe — ${input.shopName}`,
    text,
    html,
  };
}

// --------------------------------------------------- adresse et récupération

export function emailVerification(input: {
  colors?: MailColors;
  shopName: string;
  name: string;
  url: string;
  hours: number;
}): Rendered {
  const text = `Bonjour ${input.name},

Bienvenue chez ${input.shopName}.

Confirmez votre adresse en ouvrant ce lien :
${input.url}

Ce lien est valable ${input.hours} heures.

Si vous n'avez pas créé de compte chez nous, ignorez ce message.`;

  const html = wrap({
    colors: input.colors,
    title: "Confirmez votre adresse",
    shopName: input.shopName,
    body: `<p>Bonjour ${escapeHtml(input.name)},</p>
<p>Bienvenue chez ${escapeHtml(input.shopName)}. Confirmez votre adresse pour sécuriser votre compte.</p>
${button("Confirmer mon adresse", input.url, input.colors)}
<p style="font-size:13px;color:#6b6b6b;">Ce lien est valable ${input.hours} heures.</p>`,
    footer: "Si vous n'avez pas créé de compte chez nous, ignorez ce message.",
  });

  return {
    subject: `Confirmez votre adresse — ${input.shopName}`,
    text,
    html,
  };
}

/**
 * Un compte existait déjà pour cette adresse, créé lors d'un achat en
 * boutique. Le message ne dit rien du contenu de ce compte : tant que le lien
 * n'est pas ouvert, on ne sait pas qui a demandé.
 */
export function accountRecovery(input: {
  colors?: MailColors;
  shopName: string;
  name: string;
  url: string;
}): Rendered {
  const text = `Bonjour ${input.name},

Un compte existe déjà à cette adresse chez ${input.shopName} — il a probablement été créé lors d'un achat en boutique.

Pour le récupérer et choisir votre mot de passe, ouvrez ce lien :
${input.url}

Ce lien expire dans une heure et ne fonctionne qu'une fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien ne change tant que le lien n'est pas ouvert.`;

  const html = wrap({
    colors: input.colors,
    title: "Récupérez votre compte",
    shopName: input.shopName,
    body: `<p>Bonjour ${escapeHtml(input.name)},</p>
<p>Un compte existe déjà à cette adresse — il a probablement été créé lors d'un achat en boutique.</p>
${button("Récupérer mon compte", input.url, input.colors)}
<p style="font-size:13px;color:#6b6b6b;">Ce lien expire dans une heure et ne fonctionne qu'une fois.</p>`,
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien ne change tant que le lien n'est pas ouvert.",
  });

  return {
    subject: `Récupérez votre compte — ${input.shopName}`,
    text,
    html,
  };
}

// ------------------------------------------------------------- inscription

/**
 * Bienvenue au marchand.
 *
 * Ce message a une fonction très concrète : **conserver l'adresse de la
 * boutique**. Un marchand qui ferme l'onglet après l'inscription n'a plus
 * aucun moyen de retrouver son sous-domaine, et il n'y a pas de page
 * « retrouver ma boutique ».
 */
export function shopWelcome(input: {
  platformName: string;
  shopName: string;
  adminName: string;
  shopUrl: string;
  loginUrl: string;
  trialDays: number;
}): Rendered {
  const text = `Bonjour ${input.adminName},

${input.shopName} est créée. Voici son adresse, gardez ce message :

${input.shopUrl}

Pour vous connecter à votre espace de gestion :
${input.loginUrl}

Votre boutique n'est pas encore visible du public. Ajoutez vos produits, mettez votre logo, puis ouvrez-la quand vous serez prêt — le bouton est sur votre tableau de bord.

Vous avez ${input.trialDays} jours d'essai. Aucun paiement ne vous sera demandé avant la fin.

À bientôt,
L'équipe ${input.platformName}`;

  const html = wrap({
    title: "Votre boutique est créée",
    shopName: input.platformName,
    body: `<p>Bonjour ${escapeHtml(input.adminName)},</p>
<p><strong>${escapeHtml(input.shopName)}</strong> est créée. Voici son adresse — gardez ce message, c'est votre seul moyen de la retrouver :</p>
<p style="font-size:16px;"><a href="${escapeHtml(input.shopUrl)}" style="color:#0e3b2e;">${escapeHtml(input.shopUrl)}</a></p>
${button("Ouvrir mon espace de gestion", input.loginUrl)}
<p>Votre boutique n'est <strong>pas encore visible du public</strong>. Ajoutez vos produits, mettez votre logo, puis ouvrez-la quand vous serez prêt : le bouton vous attend sur votre tableau de bord.</p>
<p style="font-size:13px;color:#6b6b6b;">Vous avez ${input.trialDays} jours d'essai. Aucun paiement ne vous sera demandé avant la fin.</p>`,
    footer: `À bientôt — L'équipe ${input.platformName}`,
  });

  return {
    subject: `${input.shopName} est prête — votre adresse à conserver`,
    text,
    html,
  };
}

/** Alerte interne : une boutique vient d'être créée. */
export function newShopAlert(input: {
  shopName: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  phone: string;
  shopUrl: string;
}): Rendered {
  const text = `Nouvelle boutique : ${input.shopName}

Adresse : ${input.shopUrl}
Responsable : ${input.adminName}
Email : ${input.adminEmail}
Téléphone : ${input.phone || "non renseigné"}`;

  const html = wrap({
    title: "Nouvelle boutique",
    shopName: "Nouvelle inscription",
    body: `<p style="font-size:17px;"><strong>${escapeHtml(input.shopName)}</strong></p>
<p>Adresse : <a href="${escapeHtml(input.shopUrl)}" style="color:#0e3b2e;">${escapeHtml(input.slug)}</a><br>
Responsable : ${escapeHtml(input.adminName)}<br>
Email : ${escapeHtml(input.adminEmail)}<br>
Téléphone : ${escapeHtml(input.phone || "non renseigné")}</p>`,
    footer: "Un appel dans les 24 heures double les chances qu'une inscription devienne un client.",
  });

  return { subject: `Nouvelle boutique : ${input.shopName}`, text, html };
}

// -------------------------------------------------------------- commandes

export type OrderLine = { name: string; quantity: number; total: number };

export function orderConfirmation(input: {
  colors?: MailColors;
  shopName: string;
  customerName: string;
  reference: string;
  lines: OrderLine[];
  total: number;
  url?: string;
  note?: string;
}): Rendered {
  const lines = input.lines
    .map((l) => `  ${l.quantity} × ${l.name} — ${formatGNF(l.total)}`)
    .join("\n");

  const text = `Bonjour ${input.customerName},

Nous avons bien reçu votre commande ${input.reference}.

${lines}

Total : ${formatGNF(input.total)}
${input.note ? `\n${input.note}\n` : ""}${input.url ? `\nSuivre votre commande :\n${input.url}\n` : ""}
Merci de votre confiance.
${input.shopName}`;

  const rows = input.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;">${escapeHtml(l.quantity)} × ${escapeHtml(l.name)}</td><td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(formatGNF(l.total))}</td></tr>`
    )
    .join("");

  const html = wrap({
    colors: input.colors,
    title: "Commande reçue",
    shopName: input.shopName,
    body: `<p>Bonjour ${escapeHtml(input.customerName)},</p>
<p>Nous avons bien reçu votre commande <strong>${escapeHtml(input.reference)}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;font-size:14px;border-top:1px solid #e5e5e5;">
${rows}
<tr><td style="padding:10px 0;border-top:2px solid ${(input.colors ?? PLATFORM_COLORS).primary};font-weight:bold;">Total</td><td style="padding:10px 0;border-top:2px solid ${(input.colors ?? PLATFORM_COLORS).primary};text-align:right;font-weight:bold;white-space:nowrap;">${escapeHtml(formatGNF(input.total))}</td></tr>
</table>
${input.note ? `<p>${escapeHtml(input.note)}</p>` : ""}
${input.url ? button("Suivre ma commande", input.url, input.colors) : ""}`,
    footer: `Merci de votre confiance. — ${input.shopName}`,
  });

  return {
    subject: `Votre commande ${input.reference} — ${input.shopName}`,
    text,
    html,
  };
}

export function orderAlert(input: {
  colors?: MailColors;
  shopName: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  total: number;
  url: string;
}): Rendered {
  const text = `Nouvelle commande ${input.reference}.

Client : ${input.customerName}
Téléphone : ${input.customerPhone}
Total : ${formatGNF(input.total)}

Ouvrir dans le back-office :
${input.url}`;

  const html = wrap({
    colors: input.colors,
    title: "Nouvelle commande",
    shopName: input.shopName,
    body: `<p style="font-size:17px;"><strong>Nouvelle commande ${escapeHtml(input.reference)}</strong></p>
<p>Client : ${escapeHtml(input.customerName)}<br>
Téléphone : ${escapeHtml(input.customerPhone)}<br>
Total : <strong>${escapeHtml(formatGNF(input.total))}</strong></p>
${button("Ouvrir dans le back-office", input.url, input.colors)}`,
    footer: "Vous recevez ce message parce qu'une commande a été passée sur votre boutique.",
  });

  return {
    subject: `Nouvelle commande ${input.reference} — ${formatGNF(input.total)}`,
    text,
    html,
  };
}

// ------------------------------------------------------------ abonnement

export type SubscriptionNotice = "echeance" | "impaye" | "suspension";

export function subscriptionReminder(input: {
  shopName: string;
  notice: SubscriptionNotice;
  amount: number;
  dueDate: string;
  url: string;
  graceDays?: number;
}): Rendered {
  const intro =
    input.notice === "echeance"
      ? `Votre abonnement arrive à échéance le ${input.dueDate}.`
      : input.notice === "impaye"
        ? `Votre abonnement est arrivé à échéance le ${input.dueDate} et n'a pas encore été réglé.`
        : `Faute de règlement, votre boutique en ligne est désormais fermée aux visiteurs.`;

  const consequence =
    input.notice === "echeance"
      ? "Réglez avant cette date pour que rien ne s'interrompe."
      : input.notice === "impaye"
        ? `Il vous reste ${input.graceDays ?? 7} jours avant que votre boutique ne ferme aux visiteurs. Votre caisse et vos données restent accessibles.`
        : "Vos données sont intactes et votre caisse reste accessible. Un règlement rouvre la boutique immédiatement.";

  const text = `${intro}

Montant : ${formatGNF(input.amount)}

${consequence}

Régler maintenant :
${input.url}`;

  const html = wrap({
    title: "Votre abonnement",
    shopName: input.shopName,
    body: `<p>${escapeHtml(intro)}</p>
<p>Montant : <strong>${escapeHtml(formatGNF(input.amount))}</strong></p>
<p>${escapeHtml(consequence)}</p>
${button("Régler maintenant", input.url)}`,
    footer: "Une question ? Répondez simplement à ce message.",
  });

  const subject =
    input.notice === "echeance"
      ? `Votre abonnement arrive à échéance le ${input.dueDate}`
      : input.notice === "impaye"
        ? `Abonnement impayé — ${input.shopName}`
        : `Votre boutique est fermée — ${input.shopName}`;

  return { subject, text, html };
}
