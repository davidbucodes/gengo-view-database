import { isRomaji, toHiragana, toKatakana } from "wanakana";
import { isLatinCharactersRegexp } from "../regexp/isLatinCharactersRegexp";
import { isValidRomajiRegexp } from "../regexp/isValidRomajiRegexp";

export function extractTokensFromTerm(term: string) {
  term = term.trim();
  if (!term) {
    return {
      validTerm: "",
      isValidTermInEnglish: false,
      tokens: [],
    };
  }

  const kana = [toHiragana(term), toKatakana(term)].filter(t => t);

  const validTerm = !isRomaji(term) ? term : term.length > 1 ? term : "";

  const isValidTermInEnglish =
    isLatinCharactersRegexp.test(validTerm) &&
    !isValidRomajiRegexp.test(validTerm);

  const tokens = [...new Set([validTerm, ...kana])].filter(t => t);

  return { validTerm, isValidTermInEnglish, tokens };
}
