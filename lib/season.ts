// Une saison basket va généralement de juillet à juin.
// Ex: un match en janvier 2026 appartient à la saison "2025-2026".
export function seasonLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function currentSeasonLabel(): string {
  return seasonLabel(new Date().toISOString());
}
