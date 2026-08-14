"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-5 py-2.5 rounded-md text-sm print:hidden"
    >
      <Printer className="w-4 h-4" />
      Imprimer
    </button>
  );
}
