import { Index } from "./index";
import { KanjiDoc, loadKanjiIndex } from "./indices/kanji.index";
import { NameDoc, loadNameIndex } from "./indices/name.index";
import { VocabularyDoc, loadVocabularyIndex } from "./indices/vocabulary.index";
import { IndexSearchResult } from "./types";

export class Database {
  static indices: [
    nameIndex: Index<NameDoc>,
    vocabularyIndex: Index<VocabularyDoc>,
    kanjiIndex: Index<KanjiDoc>
  ];
  static async load({
    nameIndexUrl = "./indices/name.index.json",
    vocabularyIndexUrl = "./indices/vocabulary.index.json",
    kanjiIndexUrl = "./indices/kanji.index.json",
  }: {
    nameIndexUrl: string;
    vocabularyIndexUrl: string;
    kanjiIndexUrl: string;
  }) {
    const allLoaded = await Promise.all([
      loadNameIndex(nameIndexUrl),
      loadVocabularyIndex(vocabularyIndexUrl),
      loadKanjiIndex(kanjiIndexUrl),
    ]);
    this.indices = allLoaded;
  }

  static async search(term: string) {
    if (!this.indices) {
      console.error("Database is not loaded; cannot perform search");
    }
    const [nameIndexResults, vocabularyIndexResults, kanjiIndexResults] =
      (await Promise.all(
        this.indices.map(async index => await index.searchJapanese(term))
      )) as [
        IndexSearchResult<NameDoc>[],
        IndexSearchResult<VocabularyDoc>[],
        IndexSearchResult<KanjiDoc>[]
      ];

    return [
      ...nameIndexResults,
      ...vocabularyIndexResults,
      ...kanjiIndexResults,
    ].sort(({ _score: a }, { _score: b }) => b - a);
  }
}
