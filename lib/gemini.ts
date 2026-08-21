// Client léger pour l'API Google Gemini (REST, pas de SDK — évite une
// dépendance supplémentaire). Utilisé à la place d'Anthropic pour la
// génération de texte IA (carrousel joueur, social-copy) car Gemini a un
// tier gratuit exploitable sans carte bancaire, contrairement à la Console
// Anthropic qui exige des crédits payants. Voir CLAUDE.md du projet.

export type GeminiSchema = {
  type: "OBJECT";
  properties: Record<string, { type: "STRING"; description?: string }>;
  required: string[];
};

export async function generateStructuredCopy(
  prompt: string,
  schema: GeminiSchema
): Promise<Record<string, string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY n'est pas configurée sur le serveur.");
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.9,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Pas de réponse structurée du modèle.");
  }

  return JSON.parse(text) as Record<string, string>;
}
