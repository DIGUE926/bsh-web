"use client";

import { useState } from "react";

export default function AnnounceForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/push/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, url: url.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi.");
      setResult(`Envoyé à ${data.sent} fan${data.sent === 1 ? "" : "s"} (${data.failed} échec(s)).`);
      setTitle("");
      setMessage("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm text-white/60 mb-1">Titre</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex: Fleurenceau Legends, champion SUBLE 🏆"
          required
          maxLength={80}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ex: Retour sur une saison de folie -- tous les résultats sur BSH."
          required
          maxLength={200}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none resize-none"
        />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">
          Lien (optionnel, ex: /suble/playoffs)
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
        />
      </div>

      {result && <p className="text-green-400 text-sm">{result}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-bsh-orange text-black font-bold rounded-lg px-6 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Envoi..." : "📣 Envoyer aux fans"}
      </button>
    </form>
  );
}
