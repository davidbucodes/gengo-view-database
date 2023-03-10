import { Database } from "./database";
import { IndexSearchResult } from "./database.types";
import { KanjiDocument, VocabularyDocument } from "./doc.types";

export type JlptLevel = "1" | "2" | "3" | "4" | "5";

type JlptDB = {
  kanji: Partial<Record<JlptLevel, IndexSearchResult<KanjiDocument>[]>>;
  vocabulary: Partial<
    Record<JlptLevel, IndexSearchResult<VocabularyDocument>[]>
  >;
};

export const jlptLevels: JlptLevel[] = ["5", "4", "3", "2", "1"];

export class Jlpt {
  private static db: JlptDB = {
    kanji: {},
    vocabulary: {},
  };

  static async init() {
    await Promise.all(
      jlptLevels
        .map(level => [
          new Promise(async res => {
            this.db.kanji[level] =
              await Database.indices.kanjiIndex.searchNumber(
                Number(level),
                "jlpt"
              );
            res(true);
          }),
          new Promise(async res => {
            this.db.vocabulary[level] =
              await Database.indices.vocabularyIndex.searchNumber(
                Number(level),
                "jlpt"
              );
            res(true);
          }),
        ])
        .flat()
    );
  }

  static kanji(level: JlptLevel) {
    return this.db.kanji[level] || [];
  }

  static allKanji() {
    return jlptLevels.map(level => this.db.kanji[level] || []).flat();
  }

  static vocabulary(level: JlptLevel) {
    return this.db.vocabulary[level] || [];
  }

  static allVocabulary() {
    return jlptLevels.map(level => this.db.vocabulary[level] || []).flat();
  }
}
