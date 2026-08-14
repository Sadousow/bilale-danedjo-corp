"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";

import ImageUploader from "@/components/admin/ImageUploader";
import type { FormState } from "./actions";

type Category = { id: string; label: string };

export type ProductFormValues = {
  id?: string;
  sku?: string;
  name?: string;
  description?: string;
  image?: string;
  unit?: string | null;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  popular?: boolean;
  active?: boolean;
  promoDiscount?: number | null;
  oldPrice?: number | null;
  categoryId?: string;
};

const input =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm";
const label = "block text-sm font-medium text-slate-700 mb-1";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-md transition-colors"
    >
      <Save className="w-4 h-4" />
      {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le produit"}
    </button>
  );
}

export default function ProductForm({
  action,
  categories,
  values = {},
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Category[];
  values?: ProductFormValues;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [hasPromo, setHasPromo] = useState(Boolean(values.promoDiscount));
  const [image, setImage] = useState(values.image ?? "");
  const isEdit = Boolean(values.id);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Informations générales</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="name">
              Nom du produit *
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={values.name}
              className={input}
              placeholder="Riz parfumé 25 kg"
            />
          </div>

          <div>
            <label className={label} htmlFor="categoryId">
              Catégorie *
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={values.categoryId ?? ""}
              className={input}
            >
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="unit">
              Unité de vente
            </label>
            <input
              id="unit"
              name="unit"
              defaultValue={values.unit ?? ""}
              className={input}
              placeholder="sac, carton, bidon, unité…"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={values.description}
              className={input}
              placeholder="Description affichée sur le site vitrine"
            />
          </div>

          <div className="sm:col-span-2">
            {/* Le champ reste dans le formulaire : c'est lui qui part au
                serveur. Le téléversement ne fait que le remplir. */}
            <input type="hidden" name="image" value={image} />
            <ImageUploader
              kind="produit"
              value={image}
              onChange={setImage}
              label="Photo du produit"
              hint="Prenez la photo avec votre téléphone : elle est réduite automatiquement avant l'envoi."
            />
          </div>

          {!isEdit && (
            <div className="sm:col-span-2">
              <label className={label} htmlFor="sku">
                Référence (SKU)
              </label>
              <input
                id="sku"
                name="sku"
                defaultValue={values.sku}
                className={input}
                placeholder="Généré automatiquement si vide"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Prix et stock (GNF)</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={label} htmlFor="price">
              Prix de vente *
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={values.price}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="cost">
              Prix d&apos;achat
            </label>
            <input
              id="cost"
              name="cost"
              type="number"
              min={0}
              step={1}
              defaultValue={values.cost ?? 0}
              className={input}
            />
            <p className="mt-1 text-xs text-slate-400">Sert au calcul de la marge.</p>
          </div>
          <div>
            <label className={label} htmlFor="stock">
              {isEdit ? "Stock actuel" : "Stock initial"}
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              defaultValue={values.stock ?? 0}
              disabled={isEdit}
              className={`${input} disabled:bg-slate-100 disabled:text-slate-500`}
            />
            {isEdit && (
              <p className="mt-1 text-xs text-slate-400">
                Modifiable depuis la page Stock.
              </p>
            )}
          </div>
          <div>
            <label className={label} htmlFor="minStock">
              Seuil d&apos;alerte
            </label>
            <input
              id="minStock"
              name="minStock"
              type="number"
              min={0}
              step={1}
              defaultValue={values.minStock ?? 5}
              className={input}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Mise en avant</h2>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="popular"
            defaultChecked={values.popular}
            className="w-4 h-4 accent-brand-blue"
          />
          Produit populaire (affiché en page d&apos;accueil)
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={values.active ?? true}
            className="w-4 h-4 accent-brand-blue"
          />
          Actif (visible sur le site et en caisse)
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={hasPromo}
            onChange={(e) => setHasPromo(e.target.checked)}
            className="w-4 h-4 accent-brand-gold"
          />
          En promotion
        </label>

        {hasPromo && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className={label} htmlFor="promoDiscount">
                Remise affichée (%)
              </label>
              <input
                id="promoDiscount"
                name="promoDiscount"
                type="number"
                min={1}
                max={90}
                defaultValue={values.promoDiscount ?? 10}
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="oldPrice">
                Ancien prix (barré)
              </label>
              <input
                id="oldPrice"
                name="oldPrice"
                type="number"
                min={0}
                defaultValue={values.oldPrice ?? ""}
                className={input}
              />
            </div>
          </div>
        )}
      </div>

      {state.error && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton isEdit={isEdit} />
        <Link
          href="/admin/produits"
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
