import { uniq, uniqBy } from "lodash";
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
import { extractTokensFromTerm } from "./extractTokensFromTerm";

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
      addKanji: boolean;
      documents?: Awaited<ReturnType<typeof Database.termsIndices.searchText>>;
      termIndices?: IndexName[];
    } = { addKanji: true, addKanjiAtBottom: false }
  ) {
    if (!Database.indices) {
      console.error("Database is not loaded; cannot perform search");
      return [];
    }

    let allTermsIndices = [
      Database.indices.kanjiIndex,
      Database.indices.vocabularyIndex,
      Database.indices.nameIndex,
    ];

    if (options.termIndices) {
      allTermsIndices = allTermsIndices.filter(index =>
        options.termIndices.includes(index.options.name)
      );
    }

    const { validTerm, isValidTermInEnglish, tokens } =
      extractTokensFromTerm(term);

    const termToIndexMap = tokens.flatMap(token =>
      allTermsIndices.map(index => [token, index] as [string, typeof index])
    );

    const results = (
      await Promise.all(
        termToIndexMap.map(([term, index]) => {
          const scorePenalty = term === validTerm ? 0 : 0.1;
          return new Promise<ReturnType<typeof index.searchText>>(resolve => {
            const { forceEnglish, forceJapanese } = options || {};
            const query: Parameters<typeof index.searchText>[1] = {
              scorePenalty,
              japanese:
                forceEnglish && !forceJapanese
                  ? false
                  : forceJapanese || !isValidTermInEnglish,
              english:
                forceJapanese && !forceEnglish
                  ? false
                  : forceEnglish || isValidTermInEnglish,
              documents: options.documents?.filter(
                doc => doc._index === index.options.name
              ) as any,
            };
            console.log({ term, query });
            const results = index.searchText(term, query as any);
            resolve(results);
          });
        })
      )
    ).flat();

    const sortedResults =
      results.sort(({ _score: a }, { _score: b }) => b - a) || [];

    const kanjis = uniq(tokens.map(token => token.match(isKanjiRegexp)).flat());
    const kanjiDocuments = kanjis
      .map(kanji => {
        const kanjiId = Database.kanjiToId[kanji];
        if (Number.isInteger(kanjiId)) {
          return Database.indices.kanjiIndex.get(kanjiId);
        }
      })
      .filter(doc => doc);
    const resultsWithKanji = options.addKanji
      ? options.addKanjiAtBottom
        ? [...sortedResults, ...kanjiDocuments]
        : [...kanjiDocuments, ...sortedResults]
      : [...sortedResults];

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
