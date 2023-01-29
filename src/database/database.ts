import { Index } from "./index";
import { KanjiDoc, loadKanjiIndex } from "./indices/kanji.index";
import { NameDoc, loadNameIndex } from "./indices/name.index";
import { VocabularyDoc, loadVocabularyIndex } from "./indices/vocabulary.index";
import {
  Document,
  IdField,
  IndexName,
  IndexSearchResult,
  SearchableNumberField,
} from "./types";

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

  static async searchText(term: string) {
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
      ...kanjiIndexResults,
      ...vocabularyIndexResults,
      ...nameIndexResults,
    ].sort(({ _score: a }, { _score: b }) => b - a);
  }

  static async searchNumber(
    term: number,
    indexName: "name",
    field: SearchableNumberField<NameDoc>[number]
  ): Promise<IndexSearchResult<NameDoc>[]>;
  static async searchNumber(
    term: number,
    indexName: "vocabulary",
    field: SearchableNumberField<VocabularyDoc>[number]
  ): Promise<IndexSearchResult<VocabularyDoc>[]>;
  static async searchNumber(
    term: number,
    indexName: "kanji",
    field: SearchableNumberField<KanjiDoc>[number]
  ): Promise<IndexSearchResult<KanjiDoc>[]>;
  static async searchNumber<T extends Document>(
    term: number,
    indexName: IndexName,
    field: SearchableNumberField<T>[number]
  ): Promise<IndexSearchResult<T>[]> {
    if (!this.indices) {
      console.error("Database is not loaded; cannot perform search");
    }
    const index = this.indices.find(
      i => i.options.name === indexName
    ) as unknown as Index<Document>;
    const results = await index.searchNumber(term, field as never);

    return results.sort(
      ({ _score: a }, { _score: b }) => b - a
    ) as IndexSearchResult<T>[];
  }

  static get(id: IdField, indexName: "name"): IndexSearchResult<NameDoc>;
  static get(
    id: IdField,
    indexName: "vocabulary"
  ): IndexSearchResult<VocabularyDoc>;
  static get(id: IdField, indexName: "kanji"): IndexSearchResult<KanjiDoc>;
  static get<T extends Document>(
    id: IdField,
    indexName: IndexName
  ): IndexSearchResult<T> {
    if (!this.indices) {
      console.error("Database is not loaded; cannot perform search");
    }
    const index = this.indices.find(
      i => i.options.name === indexName
    ) as unknown as Index<Document>;

    return index.documents[id] as IndexSearchResult<T>;
  }
}
