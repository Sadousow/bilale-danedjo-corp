import Link from "next/link";

type Props = {
  variant?: "light" | "dark";
  showTagline?: boolean;
};

export default function Logo({ variant = "dark", showTagline = false }: Props) {
  const textColor = variant === "light" ? "text-white" : "text-brand-blue";
  const taglineColor = variant === "light" ? "text-brand-gold-light" : "text-brand-gold";

  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative">
        <div className="w-11 h-11 rounded-full bg-brand-gradient flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
          <span className="font-display font-bold text-white text-lg leading-none">
            B<span className="text-brand-gold">D</span>
          </span>
        </div>
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`font-display font-bold text-base sm:text-lg ${textColor}`}>
          Bilale & Danedjo
        </span>
        {showTagline ? (
          <span className={`text-[10px] uppercase tracking-widest ${taglineColor}`}>
            Corporation SARLU
          </span>
        ) : (
          <span className={`text-[10px] uppercase tracking-widest ${taglineColor}`}>
            Corporation
          </span>
        )}
      </div>
    </Link>
  );
}
