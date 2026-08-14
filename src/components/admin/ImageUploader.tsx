"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { AlertCircle, ImagePlus, Loader2, Trash2 } from "lucide-react";

import {
  requestUploadAction,
  deleteUploadAction,
} from "@/app/admin/upload-actions";

type Kind = "logo" | "banniere" | "produit";

/**
 * Redimensionne l'image dans le navigateur avant l'envoi.
 *
 * Une photo de téléphone pèse 3 à 6 Mo ; réduite, elle tombe sous 300 Ko. Sur
 * une connexion mobile guinéenne, c'est la différence entre un envoi qui
 * aboutit et un marchand qui abandonne.
 */
async function resizeImage(file: File, maxSide: number): Promise<Blob> {
  // Les PNG à fond transparent (logos) sont conservés tels quels.
  const keepPng = file.type === "image/png" && file.size <= 500 * 1024;
  if (keepPng) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  // Fond blanc : sans cela, un PNG transparent converti en JPEG vire au noir.
  if (file.type === "image/png") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      "image/jpeg",
      0.82
    );
  });
}

export default function ImageUploader({
  kind,
  value,
  onChange,
  label,
  hint,
  aspect = "square",
  maxSide = 1600,
}: {
  kind: Kind;
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  aspect?: "square" | "wide" | "logo";
  maxSide?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const ratio =
    aspect === "wide"
      ? "aspect-[3/1]"
      : aspect === "logo"
        ? "aspect-[3/1]"
        : "aspect-square";

  function handleFile(file: File) {
    setError(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Utilisez une image JPEG, PNG ou WebP.");
      return;
    }

    startTransition(async () => {
      try {
        setProgress("Préparation de l'image…");
        const blob = await resizeImage(file, maxSide);
        const contentType = blob.type || file.type;

        setProgress("Envoi…");
        const presign = await requestUploadAction({
          kind,
          contentType,
          size: blob.size,
        });

        if (!presign.ok) {
          setError(presign.error);
          return;
        }

        const response = await fetch(presign.uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": contentType },
        });

        if (!response.ok) {
          setError("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
          return;
        }

        // L'ancienne image ne sert plus à rien : on libère la place.
        if (value) await deleteUploadAction(value);

        onChange(presign.publicUrl);
      } catch {
        setError("Impossible de traiter cette image.");
      } finally {
        setProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div>
      <p className="block text-sm font-medium text-slate-700 mb-1">{label}</p>

      <div
        className={`relative ${ratio} w-full max-w-sm rounded-lg border-2 border-dashed overflow-hidden ${
          value ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-white"
        }`}
      >
        {value ? (
          <Image
            src={value}
            alt=""
            fill
            sizes="384px"
            className={aspect === "logo" ? "object-contain p-3" : "object-cover"}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-brand-blue hover:bg-slate-50 transition-colors"
          >
            <ImagePlus className="w-7 h-7" />
            <span className="text-sm">Choisir une image</span>
          </button>
        )}

        {pending && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
            <span className="text-xs text-slate-600">{progress}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="text-sm text-brand-blue hover:underline disabled:opacity-50"
        >
          {value ? "Remplacer" : "Choisir un fichier"}
        </button>

        {value && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteUploadAction(value);
                onChange("");
              })
            }
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Retirer
          </button>
        )}
      </div>

      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}

      {error && (
        <p className="mt-2 flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
