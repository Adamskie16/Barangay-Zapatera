// Resident/src/core/contentModerationService.ts
// Trilingual Content Moderation Engine: Cebuano/Bisaya, Tagalog, and English
// Specifically tailored for Barangay Zapatera civic discussions, bulletins, and resident submissions

export interface ModerationResult {
  isClean: boolean;
  flaggedWords: string[];
  sanitizedText: string;
  warningMessage: string;
}

// 1. Curated Comprehensive Profanity Lexicon (Cebuano, Tagalog, English)
const FOUL_WORDS_CEBUANO = [
  'yawa',
  'ywa',
  'piste',
  'peste',
  'pisting yawa',
  'pisting',
  'bilat',
  'bilat sa inahan',
  'atay',
  'kayat',
  'iyot',
  'lubot',
  'otot',
  'ototen',
  'boang',
  'buang',
  'buangon',
  'kolera',
  'hinampak',
  'tunto',
  'amaw',
  'inahan nimo',
  'kagwang',
  'burikat',
  'bayot',
  'lasaw',
  'giatay',
];

const FOUL_WORDS_TAGALOG = [
  'puta',
  'putangina',
  'putang ina',
  'tangina',
  'tang ina',
  'tangena',
  'tarantado',
  'gago',
  'gaga',
  'ulol',
  'inutil',
  'kupal',
  'pakyu',
  'pakyuu',
  'kantot',
  'kantutan',
  'kantut',
  'hindot',
  'tite',
  'titi',
  'pepe',
  'puke',
  'kiki',
  'burat',
  'bobo',
  'pokpok',
  'hayop ka',
  'punyeta',
  'leche',
  'letse',
  'lintek',
  'bwisit',
  'buwisit',
  'hudas',
  'syet',
];

const FOUL_WORDS_ENGLISH = [
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'pussy',
  'whore',
  'slut',
  'cock',
  'nigger',
  'faggot',
  'retard',
  'idiot',
];

// Unified set
const ALL_FOUL_WORDS = Array.from(
  new Set([...FOUL_WORDS_CEBUANO, ...FOUL_WORDS_TAGALOG, ...FOUL_WORDS_ENGLISH])
);

/**
 * Normalizes input text to defeat common leetspeak obfuscation:
 * e.g. "y@wa" -> "yawa", "p1ste" -> "piste", "f*ck" -> "fuck"
 */
function normalizeText(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[+]/g, 't')
    .replace(/[*_#^~`]/g, '')
    // collapse repeated characters: e.g. "yaaaawa" -> "yawa"
    .replace(/(.)\1{2,}/g, '$1$1');
}

/**
 * Checks if a string contains foul, profane, or abusive words.
 */
export function checkContentModeration(text: string): ModerationResult {
  if (!text || typeof text !== 'string') {
    return {
      isClean: true,
      flaggedWords: [],
      sanitizedText: '',
      warningMessage: '',
    };
  }

  const rawTrimmed = text.trim();
  const normalized = normalizeText(rawTrimmed);
  const flaggedWords: string[] = [];

  // Match whole-word or delimited bad words
  for (const word of ALL_FOUL_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Check in normalized text
    const regex = new RegExp(`(^|\\b|\\s|_|-)${escaped}(\\b|\\s|_|-|$)`, 'i');
    if (regex.test(normalized) || regex.test(rawTrimmed.toLowerCase())) {
      if (!flaggedWords.includes(word)) {
        flaggedWords.push(word);
      }
    }
  }

  // Generate censored text replacing foul words with asterisks
  let sanitized = rawTrimmed;
  for (const word of flaggedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, (match) => {
      if (match.length <= 2) return '**';
      return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    });
  }

  const isClean = flaggedWords.length === 0;
  let warningMessage = '';

  if (!isClean) {
    warningMessage = `Barangay Zapatera promotes respectful community dialogue. Inappropriate or foul language was detected (${flaggedWords.join(', ')}). Please revise your comment before submitting.`;
  }

  return {
    isClean,
    flaggedWords,
    sanitizedText: sanitized,
    warningMessage,
  };
}

/**
 * Quick helper to censor profanity in text without blocking
 */
export function censorProfanity(text: string): string {
  const res = checkContentModeration(text);
  return res.sanitizedText;
}
