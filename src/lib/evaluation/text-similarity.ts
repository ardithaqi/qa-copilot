function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

export function areSimilarTexts(a: string, b: string, threshold = 0.55): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (!na || !nb) {
    return false;
  }
  if (na === nb) {
    return true;
  }
  if (na.includes(nb) || nb.includes(na)) {
    return true;
  }

  const wordsA = tokenSet(na);
  const wordsB = tokenSet(nb);
  if (wordsA.size === 0 || wordsB.size === 0) {
    return false;
  }

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersection += 1;
    }
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union >= threshold;
}

export function unionUniqueSimilarStrings(arrays: string[][]): string[] {
  const result: string[] = [];

  for (const array of arrays) {
    for (const item of array) {
      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }
      if (result.some((existing) => areSimilarTexts(existing, trimmed))) {
        continue;
      }
      result.push(trimmed);
    }
  }

  return result;
}
