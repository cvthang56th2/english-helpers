const MAX_SELECTION_CHARS = 200;
const MAX_SELECTION_WORDS = 12;

export function selectionToQuery(text: string): string | null {
  const query = text.replace(/\s+/g, " ").trim();
  if (!query) return null;
  if (query.length > MAX_SELECTION_CHARS) return null;
  if (query.split(" ").length > MAX_SELECTION_WORDS) return null;
  return query;
}
