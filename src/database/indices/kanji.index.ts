import { Index } from "..";
import { Document, IIndex } from "../types";

export interface KanjiDoc extends Document {
  kanji: string;
  freq?: number;
  grade?: number;
  jlpt?: number;
  strokeCount?: number[];
  onReading?: string[];
  kunReading?: string[];
  meaning?: string[];
  nanori?: string[];
  radicals?: string[];
  appearsAtKanji?: string[];
}

export const loadKanjiIndex = async (url: string) =>
  new Promise<Index<KanjiDoc>>(async res => {
    const json = (await (await fetch(url)).json()) as IIndex<KanjiDoc>;
    return res(Index.from<KanjiDoc>(json));
  });
