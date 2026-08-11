import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-24 text-center">
      <p className="font-display text-6xl text-bsh-orange mb-2 tracking-wide">
        404
      </p>
      <h1 className="font-display text-xl text-bsh-gold mb-3 tracking-wide">
        AIR BALL
      </h1>
      <p className="text-white/60 text-sm mb-8 max-w-sm mx-auto">
        Cette page n&apos;existe pas ou plus. Le lien est peut-être cassé,
        ou l&apos;équipe/le match a été supprimé.
      </p>
      <Link
        href="/"
        className="inline-block bg-bsh-orange text-black font-bold rounded-lg px-6 py-2 hover:opacity-90 transition-opacity"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
