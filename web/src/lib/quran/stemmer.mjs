// Lightweight Indonesian stemmer (Sastrawi-style confix stripping) for the
// meaning/translation search. It has no root-word dictionary, so it favours
// consistent, conservative stripping: the same rules run over both the query
// and the translation text, and the search layer adds trigram-fuzzy matching on
// top to absorb any residual morphophonemic ambiguity (peluruhan).

const PARTICLE_SUFFIX = /(lah|kah|tah|pun)$/;
const POSSESSIVE_SUFFIX = /(ku|mu|nya)$/;
const DERIVATION_SUFFIX = /(kan|an|i)$/;

// Prefixes ordered longest-first. Nasal prefixes optionally restore the elided
// leading consonant of the root; where a form is ambiguous we keep the plain
// vowel-initial variant (the fuzzy layer recovers the rest).
const PREFIX_RULES = [
  { re: /^menge/, add: '' },
  { re: /^penge/, add: '' },
  { re: /^meny/, add: 's' },
  { re: /^peny/, add: 's' },
  { re: /^meng/, add: '' },
  { re: /^peng/, add: '' },
  { re: /^mem/, add: '' },
  { re: /^pem/, add: '' },
  { re: /^men/, add: '' },
  { re: /^pen/, add: '' },
  { re: /^me/, add: '' },
  { re: /^pe/, add: '' },
  { re: /^ber/, add: '' },
  { re: /^bel/, add: '' },
  { re: /^be/, add: '' },
  { re: /^ter/, add: '' },
  { re: /^tel/, add: '' },
  { re: /^te/, add: '' },
  { re: /^per/, add: '' },
  { re: /^pel/, add: '' },
  { re: /^di/, add: '' },
  { re: /^ke/, add: '' },
  { re: /^se/, add: '' },
];

const MIN_STEM_LENGTH = 3;

function stripSuffixes(word) {
  let w = word;
  if (w.length > 4) {
    const stripped = w.replace(PARTICLE_SUFFIX, '');
    if (stripped.length >= MIN_STEM_LENGTH) {
      w = stripped;
    }
  }
  if (w.length > 4) {
    const stripped = w.replace(POSSESSIVE_SUFFIX, '');
    if (stripped.length >= MIN_STEM_LENGTH) {
      w = stripped;
    }
  }
  if (w.length > 4) {
    const stripped = w.replace(DERIVATION_SUFFIX, '');
    if (stripped.length >= MIN_STEM_LENGTH) {
      w = stripped;
    }
  }
  return w;
}

function stripPrefix(word) {
  if (word.length <= 4) {
    return word;
  }
  for (const rule of PREFIX_RULES) {
    if (rule.re.test(word)) {
      const stripped = word.replace(rule.re, rule.add);
      if (stripped.length >= MIN_STEM_LENGTH) {
        return stripped;
      }
    }
  }
  return word;
}

/**
 * Reduce an Indonesian word to an approximate root form.
 */
export function stemWord(word) {
  const w = String(word ?? '').toLowerCase();
  if (w.length <= MIN_STEM_LENGTH) {
    return w;
  }
  return stripPrefix(stripSuffixes(w));
}
