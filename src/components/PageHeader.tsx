type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function PageHeader({ eyebrow, title, description }: Props) {
  return (
    <section className="bg-brand-gradient text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold-light mb-3">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl sm:text-5xl font-bold">{title}</h1>
        {description && (
          <p className="mt-4 text-slate-200 text-lg max-w-3xl">{description}</p>
        )}
      </div>
    </section>
  );
}
