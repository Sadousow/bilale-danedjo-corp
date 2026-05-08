import Link from "next/link";
import Image from "next/image";

type Props = {
  variant?: "light" | "dark";
  showTagline?: boolean;
};

export default function Logo({ variant = "dark", showTagline = false }: Props) {
  const textColor = variant === "light" ? "text-white" : "text-brand-blue";
  const taglineColor = variant === "light" ? "text-brand-gold-light" : "text-brand-gold";

  const wrapperClass =
    variant === "light"
      ? "bg-white rounded-full p-1.5 shadow-sm"
      : "";

  return (
    <Link href="/" className="flex items-center gap-3 group" aria-label="Accueil — Bilale et Danedjo Corporation">
      <div className={wrapperClass}>
        <Image
          src="/brand/logo-mark.png"
          alt="Bilale et Danedjo Corporation"
          width={400}
          height={344}
          priority
          sizes="56px"
          className="h-9 sm:h-11 w-auto transition-transform group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`font-display font-bold text-base sm:text-lg ${textColor}`}>
          Bilale & Danedjo
        </span>
        <span className={`text-[10px] uppercase tracking-widest ${taglineColor}`}>
          {showTagline ? "Corporation SARLU" : "Corporation"}
        </span>
      </div>
    </Link>
  );
}
