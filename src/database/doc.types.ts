export interface IndexDocument extends Object {}

export interface KanjiDocument extends IndexDocument {
  kanji: string;
  freq?: number;
  grade?: number;
  jlpt?: number;
  strokeCount?: number[];
  on?: string[];
  kun?: string[];
  pinyin?: string[];
  meaning?: string[];
  nanori?: string[];
  radicals?: string[];
  appearsAtKanji?: string[];
}

export interface NameDocument extends IndexDocument {
  /**
   * Name
   */
  n: string;
  /**
   * Description
   */
  d: string;
  /**
   * Name type
   */
  t: string;
  /**
   * Reading
   */
  r: string[];
}

export interface VocabularyDocument extends IndexDocument {
  jlpt?: number;
  display: string[];
  expl: string[];
  meaning: string[];
  reading: string[];
}

export interface SentenceDocument extends IndexDocument {
  j: string;
  e: string;
}
