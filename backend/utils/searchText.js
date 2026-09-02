const ITEM_ALIASES = [
  { canonical: 'pen', aliases: ['pen'] },
  { canonical: 'pencil', aliases: ['pencil'] },
  { canonical: 'pouch', aliases: ['pouch'] },
  { canonical: 'id card', aliases: ['student id card', 'student id', 'college id card', 'college id', 'identity card', 'id card'] },
  { canonical: 'wireless earbuds', aliases: ['wireless earbuds', 'earbuds', 'earphones'] },
  { canonical: 'laptop charger', aliases: ['laptop charger', 'charger'] },
  { canonical: 'wallet', aliases: ['wallet', 'purse'] },
  { canonical: 'glasses', aliases: ['spectacles', 'glasses'] },
  { canonical: 'mobile phone', aliases: ['mobile phone', 'mobile', 'phone'] }
];

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[_-]+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function containsPhrase(text, phrase) {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = normalizeText(phrase);
  return Boolean(normalizedPhrase) && normalizedText.includes(` ${normalizedPhrase} `);
}

function canonicalItemType(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  for (const group of ITEM_ALIASES) {
    if (group.aliases.some((alias) => containsPhrase(normalized, alias))) return group.canonical;
  }
  return normalized;
}

function expandItemTerms(value) {
  const canonical = canonicalItemType(value);
  const group = ITEM_ALIASES.find((entry) => entry.canonical === canonical);
  return new Set([canonical, ...(group?.aliases || [])].map(normalizeText).filter(Boolean));
}

module.exports = { ITEM_ALIASES, normalizeText, containsPhrase, canonicalItemType, expandItemTerms };
