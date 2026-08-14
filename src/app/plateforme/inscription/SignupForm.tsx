"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight, Check, Loader2, X } from "lucide-react";

import { checkSlugAction, signupAction, type SignupState } from "./actions";

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark disabled:opacity-60 text-white font-semibold px-6 py-3.5 rounded-md transition-colors"
    >
      {pending ? "Création…" : "Créer ma boutique"}
      {!pending && <ArrowRight className="w-4 h-4" />}
    </button>
  );
}

type SlugCheck = {
  /** Saisie à laquelle ce résultat correspond, pour ne rien afficher de périmé. */
  forInput: string;
  slug: string;
  available: boolean;
  reason?: string;
} | null;

export default function SignupForm({ rootDomain }: { rootDomain: string }) {
  const [state, formAction] = useActionState<SignupState, FormData>(
    signupAction,
    {}
  );

  const [slugInput, setSlugInput] = useState("");
  const [check, setCheck] = useState<SlugCheck>(null);
  const [checking, startChecking] = useTransition();

  // Vérification différée : on interroge le serveur une fois la frappe calmée.
  useEffect(() => {
    const value = slugInput.trim();
    if (!value) return;

    const timer = window.setTimeout(() => {
      startChecking(async () => {
        const result = await checkSlugAction(value);
        setCheck({ forInput: value, ...result });
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [slugInput]);

  // Un résultat qui ne correspond plus à la saisie en cours est ignoré.
  const current = check && check.forInput === slugInput.trim() ? check : null;

  if (state.createdSlug) {
    const url = `${rootDomain.startsWith("localhost") ? "http" : "https"}://${state.createdSlug}.${rootDomain}`;
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-brand-blue">
          Votre boutique est créée
        </h2>
        <p className="mt-3 text-slate-600">
          Elle n&apos;est pas encore visible du public : ajoutez vos produits et
          votre logo, puis ouvrez-la quand vous serez prêt.
        </p>

        <a
          href={`${url}/login`}
          className="mt-6 inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-6 py-3 rounded-md transition-colors"
        >
          Aller à mon espace de gestion
          <ArrowRight className="w-4 h-4" />
        </a>

        <p className="mt-4 font-mono text-sm text-slate-500 break-all">{url}</p>

        {/* L'adresse est la seule chose qu'un marchand peut perdre
            définitivement en fermant cet onglet. */}
        <p className="mt-5 text-sm text-slate-600 bg-paper border border-slate-200 rounded-md px-3 py-2.5">
          Notez cette adresse, ou retrouvez-la dans l&apos;email que nous
          venons de vous envoyer.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={label} htmlFor="name">
          Nom de votre entreprise
        </label>
        <input
          id="name"
          name="name"
          required
          className={input}
          placeholder="Ma Boutique SARL"
          onChange={(e) => {
            if (!slugInput) setSlugInput(e.target.value);
          }}
        />
      </div>

      <div>
        <label className={label} htmlFor="slug">
          Adresse de votre boutique
        </label>
        <div className="flex items-center">
          <input
            id="slug"
            name="slug"
            required
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            className={`${input} rounded-r-none`}
            placeholder="ma-boutique"
          />
          <span className="px-3 py-2.5 border border-l-0 border-slate-300 rounded-r-md bg-slate-50 text-sm text-slate-500 whitespace-nowrap">
            .{rootDomain}
          </span>
        </div>

        <div className="mt-1.5 min-h-[20px] text-xs">
          {checking && (
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Vérification…
            </span>
          )}
          {!checking && current?.available && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <Check className="w-3 h-3" />
              {current.slug}.{rootDomain} est disponible
            </span>
          )}
          {!checking && current && !current.available && (
            <span className="inline-flex items-center gap-1.5 text-red-600">
              <X className="w-3 h-3" />
              {current.reason}
            </span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-3 mt-3">
          Votre compte administrateur
        </p>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="adminName">
              Votre nom
            </label>
            <input id="adminName" name="adminName" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="adminEmail">
              Email
            </label>
            <input
              id="adminEmail"
              name="adminEmail"
              type="email"
              required
              className={input}
              autoComplete="email"
            />
          </div>
          <div>
            <label className={label} htmlFor="phone">
              Téléphone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className={input}
              autoComplete="tel"
              placeholder="+224 6XX XX XX XX"
            />
            <p className="mt-1 text-xs text-slate-400">
              Pour vous joindre, et pour vos clients sur WhatsApp. Modifiable
              plus tard.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={input}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
            />
          </div>
        </div>
      </div>

      {state.error && (
        <p className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {state.error}
        </p>
      )}

      <Submit />

      <p className="text-center text-xs text-slate-500">
        Essai gratuit. Aucune carte bancaire demandée.
      </p>
    </form>
  );
}
