import Link from "next/link";
import Image from "next/image";

type Props = {
  size?: "sm" | "md" | "lg";
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-10",
  md: "h-12 sm:h-14",
  lg: "h-16 sm:h-20",
};

export default function Logo({ size = "md" }: Props) {
  return (
    <Link href="/" aria-label="Accueil — Bilale et Danedjo Corporation" className="inline-block">
      <Image
        src="/brand/logo-full.png"
        alt="Bilale et Danedjo Corporation SARLU"
        width={771}
        height={488}
        priority
        sizes="(min-width: 1024px) 240px, 180px"
        className={`${sizeClass[size]} w-auto transition-transform hover:scale-[1.03]`}
      />
    </Link>
  );
}
