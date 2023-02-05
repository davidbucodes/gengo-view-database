export interface IndexDocument extends Object {}

export interface KanjiDocument extends IndexDocument {
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

export interface NameDocument extends IndexDocument {
  n: string;
  d: string;
  t: string;
  r: string[];
}

export interface VocabularyDocument extends IndexDocument {
  jlpt?: number;
  display: string[];
  expl: string[];
  meaning: string[];
  reading: string[];
}
