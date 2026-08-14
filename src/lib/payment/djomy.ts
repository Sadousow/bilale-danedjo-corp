import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Intégration Djomy (https://djomy.africa) — Orange Money, MTN MoMo,
 * Soutra Money, PayCard, cartes VISA / MasterCard.
 *
 * Documentation : https://developers.djomy.africa
 *
 * Authentification (deux en-têtes sur chaque appel) :
 *   X-API-KEY: <clientId>:<HMAC_SHA256(clientId, clientSecret) en hexadécimal>
 *   Authorization: Bearer <token obtenu via POST /v1/auth>
 *
 * Variables d'environnement :
 *   DJOMY_CLIENT_ID       clé API de l'espace marchand
 *   DJOMY_CLIENT_SECRET   clé secrète
 *   DJOMY_API_BASE_URL    base de l'API (sandbox ou production)
 *   DJOMY_COUNTRY_CODE    par défaut GN
 *   DJOMY_PAYMENT_METHODS liste séparée par des virgules (OM,MOMO,CARD…)
 */

const BASE_URL = (
  process.env.DJOMY_API_BASE_URL ?? "https://api.djomy.africa"
).replace(/\/$/, "");

const COUNTRY_CODE = process.env.DJOMY_COUNTRY_CODE ?? "GN";

/**
 * Identifiants Djomy. En multi-tenant, chaque marchand encaisse avec ses
 * propres clés ; les variables d'environnement ne servent qu'à la plateforme
 * (abonnements) et de repli en développement.
 */
export type DjomyCredentials = { clientId: string; clientSecret: string };

export function platformCredentials(): DjomyCredentials {
  return {
    clientId: process.env.DJOMY_CLIENT_ID ?? "",
    clientSecret: process.env.DJOMY_CLIENT_SECRET ?? "",
  };
}

export function isDjomyConfigured(creds: DjomyCredentials): boolean {
  return Boolean(creds.clientId && creds.clientSecret);
}

function allowedMethods(): string[] | undefined {
  const raw = process.env.DJOMY_PAYMENT_METHODS?.trim();
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);
}

/** signature = HMAC_SHA256(message = clientId, clé = clientSecret), en hexa. */
function apiKeyHeader(creds: DjomyCredentials): string {
  const signature = createHmac("sha256", creds.clientSecret)
    .update(creds.clientId)
    .digest("hex");
  return `${creds.clientId}:${signature}`;
}

// ------------------------------------------------------------- jeton d'accès

const tokenCache = new Map<string, { value: string; expiresAt: number }>();

/** Extrait une valeur d'une réponse Djomy, quelle que soit sa profondeur. */
function pick(payload: unknown, keys: string[]): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }

  for (const nested of ["data", "result", "payload"]) {
    const value = record[nested];
    if (value && typeof value === "object") {
      const found = pick(value, keys);
      if (found) return found;
    }
  }
  return null;
}

async function getAccessToken(creds: DjomyCredentials): Promise<string> {
  const now = Date.now();
  const cached = tokenCache.get(creds.clientId);
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.value;
  }

  const response = await fetch(`${BASE_URL}/v1/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKeyHeader(creds),
    },
    body: "{}",
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Djomy — authentification refusée (${response.status}) : ${
        pick(body, ["message"]) ?? "réponse illisible"
      }`
    );
  }

  const token = pick(body, ["accessToken", "access_token", "token", "jwt"]);
  if (!token) throw new Error("Djomy — jeton d'accès absent de la réponse.");

  // Durée non documentée : on rafraîchit prudemment toutes les 10 minutes.
  tokenCache.set(creds.clientId, {
    value: token,
    expiresAt: now + 10 * 60 * 1000,
  });
  return token;
}

async function djomyFetch(
  creds: DjomyCredentials,
  path: string,
  init: RequestInit = {}
) {
  const token = await getAccessToken(creds);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKeyHeader(creds),
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

// ------------------------------------------------------------- paiement

export type CreatePaymentInput = {
  credentials: DjomyCredentials;
  amount: number;
  payerNumber: string; // format international, ex. 00224624390332
  description: string;
  merchantReference: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string | number | boolean>;
};

export type CreatePaymentResult =
  | { ok: true; redirectUrl: string; transactionId: string | null }
  | { ok: false; error: string };

/**
 * Initie un paiement avec redirection vers le portail Djomy.
 * Le client y choisit son moyen de paiement, puis revient sur `returnUrl`
 * avec les paramètres `transactionId` et `status`.
 */
export async function createGatewayPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  if (!isDjomyConfigured(input.credentials)) {
    return { ok: false, error: "Le paiement en ligne n'est pas configuré." };
  }

  try {
    const { ok, status, body } = await djomyFetch(input.credentials, "/v1/payments/gateway", {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(input.amount),
        countryCode: COUNTRY_CODE,
        payerNumber: input.payerNumber,
        allowedPaymentMethods: allowedMethods(),
        description: input.description.slice(0, 255),
        merchantPaymentReference: input.merchantReference.slice(0, 255),
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        metadata: input.metadata,
      }),
    });

    if (!ok) {
      return {
        ok: false,
        error:
          pick(body, ["message"]) ??
          `Djomy a refusé la demande de paiement (code ${status}).`,
      };
    }

    const redirectUrl = pick(body, [
      "redirectUrl",
      "redirect_url",
      "paymentUrl",
      "payment_url",
      "url",
      "link",
    ]);

    if (!redirectUrl) {
      return {
        ok: false,
        error: "Djomy n'a pas renvoyé d'URL de redirection.",
      };
    }

    return {
      ok: true,
      redirectUrl,
      transactionId: pick(body, ["transactionId", "transaction_id", "reference"]),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur inattendue lors de l'appel à Djomy.",
    };
  }
}

export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN";

/** Vérifie l'état réel d'une transaction auprès de Djomy. */
export async function getPaymentStatus(
  credentials: DjomyCredentials,
  transactionId: string
): Promise<{ status: PaymentStatus; paidAmount: number | null }> {
  if (!isDjomyConfigured(credentials)) {
    return { status: "UNKNOWN", paidAmount: null };
  }

  try {
    const { ok, body } = await djomyFetch(
      credentials,
      `/v1/payments/${encodeURIComponent(transactionId)}/status`
    );
    if (!ok) return { status: "UNKNOWN", paidAmount: null };

    const raw = (pick(body, ["status"]) ?? "").toUpperCase();
    const status: PaymentStatus =
      raw === "SUCCESS" || raw === "SUCCESSFUL" || raw === "COMPLETED"
        ? "SUCCESS"
        : raw === "FAILED" || raw === "CANCELLED"
          ? "FAILED"
          : raw
            ? "PENDING"
            : "UNKNOWN";

    const amountRaw = pick(body, ["paidAmount"]);
    return {
      status,
      paidAmount: amountRaw ? Number(amountRaw) : null,
    };
  } catch {
    return { status: "UNKNOWN", paidAmount: null };
  }
}

// ------------------------------------------------------------- webhook

/**
 * Vérifie l'en-tête `X-Webhook-Signature` (format « v1:signature »).
 * La signature est un HMAC-SHA256 du corps brut, calculé avec la clé secrète.
 */
export function verifyWebhookSignature(
  credentials: DjomyCredentials,
  rawBody: string,
  header: string | null
): boolean {
  if (!isDjomyConfigured(credentials) || !header) return false;

  const provided = header.includes(":")
    ? header.slice(header.indexOf(":") + 1)
    : header;

  const expected = createHmac("sha256", credentials.clientSecret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(provided.trim(), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export type WebhookEvent = {
  eventType: string;
  transactionId: string | null;
  merchantReference: string | null;
  status: string | null;
  paidAmount: number | null;
};

export function parseWebhook(payload: unknown): WebhookEvent {
  const record = (payload ?? {}) as Record<string, unknown>;
  const data = (record.data ?? {}) as Record<string, unknown>;

  const amount = data.paidAmount;

  return {
    eventType: String(record.eventType ?? ""),
    transactionId: data.transactionId ? String(data.transactionId) : null,
    merchantReference: data.merchantPaymentReference
      ? String(data.merchantPaymentReference)
      : null,
    status: data.status ? String(data.status) : null,
    paidAmount: typeof amount === "number" ? amount : null,
  };
}
