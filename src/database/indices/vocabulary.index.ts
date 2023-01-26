import { Index } from "..";
import { Document, IIndex } from "../types";

export interface VocabularyDoc extends Document {
  jlpt?: number;
  display: string[];
  expl: string[];
  meaning: string[];
  reading: string[];
}

export const loadVocabularyIndex = async (url: string) =>
  new Promise<Index<VocabularyDoc>>(async res => {
    const json = (await (await fetch(url)).json()) as IIndex<VocabularyDoc>;
    return res(Index.from<VocabularyDoc>(json));
  });
