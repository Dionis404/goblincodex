import { useEffect, useState } from 'react';

// Shared RU/EN toggle for bonus/buff text across the three independently-
// hydrated NFT catalog islands (BoostsCatalog, BudsCatalog, PetsCatalog).
// They don't share a React tree, so the toggle itself lives in plain JS in
// codex/index.astro and broadcasts changes via a window CustomEvent + persists
// to localStorage; each island's useBoostLang() picks that up.

export const BOOST_LANG_STORAGE_KEY = 'gc-boost-lang';
export const BOOST_LANG_EVENT = 'gc:boost-lang-change';
export type BoostLang = 'ru' | 'en';

function readStoredLang(): BoostLang {
  if (typeof window === 'undefined') return 'ru';
  return window.localStorage.getItem(BOOST_LANG_STORAGE_KEY) === 'en' ? 'en' : 'ru';
}

export function useBoostLang(): BoostLang {
  const [lang, setLang] = useState<BoostLang>(readStoredLang);

  useEffect(() => {
    setLang(readStoredLang());
    function handler(e: Event) {
      const detail = (e as CustomEvent<BoostLang>).detail;
      if (detail === 'ru' || detail === 'en') setLang(detail);
    }
    window.addEventListener(BOOST_LANG_EVENT, handler);
    return () => window.removeEventListener(BOOST_LANG_EVENT, handler);
  }, []);

  return lang;
}

/** RU falls back to EN when untranslated; EN falls back to RU when the item has no separate English text. */
export function pickBoostText(lang: BoostLang, ru: string | null | undefined, en: string | null | undefined): string {
  if (lang === 'en') return en || ru || '';
  return ru || en || '';
}
