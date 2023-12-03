import { uniq, uniqBy } from "lodash";
import { isRomaji, toHiragana, toKatakana } from "wanakana";
import { logCalls } from "../decorators/logCall";
import { isKanjiRegexp } from "../regexp/isKanjiRegexp";
import { isLatinCharactersRegexp } from "../regexp/isLatinCharactersRegexp";
import { isValidRomajiRegexp } from "../regexp/isValidRomajiRegexp";
import { IIndex, IdField, IndexName } from "./database.types";
import {
  KanjiDocument,
  NameDocument,
  SentenceDocument,
  VocabularyDocument,
} from "./doc.types";
import { Index } from "./index";

export class Database {
  static indices: {
    nameIndex: Index<NameDocument>;
    vocabularyIndex: Index<VocabularyDocument>;
    kanjiIndex: Index<KanjiDocument>;
    sentenceIndex: Index<SentenceDocument>;
  };
  static termsIndices: Database;
  static kanjiToId: Record<string, number>;

  @logCalls
  static async load(
    {
      nameIndexUrl,
      vocabularyIndexUrl,
      kanjiIndexUrl,
      sentenceIndexUrl,
    }: {
      nameIndexUrl: string;
      vocabularyIndexUrl: string;
      kanjiIndexUrl: string;
      sentenceIndexUrl: string;
    },
    onProgress: (percentage: number) => void
  ) {
    let percentage = 0;

    const [nameIndex, vocabularyIndex, kanjiIndex, sentenceIndex] =
      await Promise.all([
        new Promise<Index<NameDocument>>(async resolve => {
          const index = await this.loadIndex<NameDocument>(nameIndexUrl);
          percentage += 100 / 4;
          onProgress(Math.ceil(percentage));
          resolve(index);
        }),
        new Promise<Index<VocabularyDocument>>(async resolve => {
          const index = await this.loadIndex<VocabularyDocument>(
            vocabularyIndexUrl
          );
          percentage += 100 / 4;
          onProgress(Math.ceil(percentage));
          resolve(index);
        }),
        new Promise<Index<KanjiDocument>>(async resolve => {
          const index = await this.loadIndex<KanjiDocument>(kanjiIndexUrl);
          percentage += 100 / 4;
          onProgress(Math.ceil(percentage));
          resolve(index);
        }),
        new Promise<Index<SentenceDocument>>(async resolve => {
          const index = await this.loadIndex<SentenceDocument>(
            sentenceIndexUrl
          );
          percentage += 100 / 4;
          onProgress(Math.ceil(percentage));
          resolve(index);
        }),
      ]);
    this.indices = { nameIndex, vocabularyIndex, kanjiIndex, sentenceIndex };
    this.termsIndices = new Database();
    this.termsIndices.initKanjiToId();
  }

  @logCalls
  private static async loadIndex<DocType>(url: string) {
    return new Promise<Index<DocType>>(async res => {
      const json = (await (await fetch(url)).json()) as IIndex<DocType>;
      return res(Index.from<DocType>(json));
    });
  }

  @logCalls
  static getById<T>({ dbId, dbIndex }: { dbId: number; dbIndex: IndexName }) {
    return Database.indices[`${dbIndex}Index`].get(dbId) as T;
  }

  @logCalls
  async searchText(
    term: string = "",
    options: {
      forceJapanese?: boolean;
      forceEnglish?: boolean;
      addKanjiAtBottom: boolean;
    } = { addKanjiAtBottom: false }
  ) {
    if (!Database.indices) {
      console.error("Database is not loaded; cannot perform search");
      return [];
    }
    term = term.trim();
    if (!term) {
      return [];
    }

    const kana = [toHiragana(term), toKatakana(term)].filter(t => t);

    const validTerm = !isRomaji(term) ? term : term.length > 1 ? term : "";

    const terms = [...new Set([validTerm, ...kana])].filter(t => t);

    const allIndices = [
      Database.indices.kanjiIndex,
      Database.indices.vocabularyIndex,
      Database.indices.nameIndex,
    ];

    const termToIndexMap = terms
      .map(term =>
        allIndices.map(index => [term, index] as [string, typeof index])
      )
      .flat();

    const isEnglish =
      isLatinCharactersRegexp.test(validTerm) &&
      !isValidRomajiRegexp.test(validTerm);
    console.log({ isEnglish });
    const results = (
      await Promise.all(
        termToIndexMap.map(([term, index]) => {
          const scorePenalty = term === validTerm ? 0 : 0.1;
          return new Promise<ReturnType<typeof index.searchText>>(resolve => {
            const { forceEnglish, forceJapanese } = options || {};
            const query = {
              scorePenalty,
              japanese:
                forceEnglish && !forceJapanese
                  ? false
                  : forceJapanese || !isEnglish,
              english:
                forceJapanese && !forceEnglish
                  ? false
                  : forceEnglish || isEnglish,
            };
            console.log({ term, query });
            const results = index.searchText(term, query);
            resolve(results);
          });
        })
      )
    ).flat();

    const sortedResults =
      results.sort(({ _score: a }, { _score: b }) => b - a) || [];

    const kanjis = uniq(terms.map(term => term.match(isKanjiRegexp)).flat());
    const kanjiDocuments = kanjis
      .map(kanji => {
        const kanjiId = Database.kanjiToId[kanji];
        if (Number.isInteger(kanjiId)) {
          return Database.indices.kanjiIndex.get(kanjiId);
        }
      })
      .filter(doc => doc);
    const resultsWithKanji = options.addKanjiAtBottom
      ? [...sortedResults, ...kanjiDocuments]
      : [...kanjiDocuments, ...sortedResults];

    return uniqBy(resultsWithKanji, result =>
      [result._id, result._index].join()
    );
  }

  @logCalls
  private initKanjiToId() {
    const kanjiToId: Record<string, IdField> = {};
    Database.indices.kanjiIndex.documents.reduce((acc, curr, index) => {
      acc[curr.kanji] = index;
      return acc;
    }, kanjiToId);
    Database.kanjiToId = kanjiToId;
  }
}
