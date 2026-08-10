import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-sm text-white/50 mb-4 flex items-center flex-wrap gap-1">
      <Link href="/" className="hover:text-bsh-orange">
        BSH
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-white/30">/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-bsh-orange">
              {item.label}
            </Link>
          ) : (
            <span className="text-bsh-gold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
