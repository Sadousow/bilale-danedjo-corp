type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: Props) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {eyebrow && (
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-blue">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
