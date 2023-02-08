import { uniq, uniqBy } from "lodash";
import { isRomaji, toHiragana, toKatakana } from "wanakana";
import { kanjiRegexp } from "../regexp/kanjiRegexp";
import { IIndex, IdField } from "./database.types";
import { KanjiDocument, NameDocument, VocabularyDocument } from "./doc.types";
import { Index } from "./index";

export class Database {
  static indices: {
    nameIndex: Index<NameDocument>;
    vocabularyIndex: Index<VocabularyDocument>;
    kanjiIndex: Index<KanjiDocument>;
  };
  static all: Database;
  static kanjiToId: Record<string, number>;

  static async load(
    {
      nameIndexUrl,
      vocabularyIndexUrl,
      kanjiIndexUrl,
    }: {
      nameIndexUrl: string;
      vocabularyIndexUrl: string;
      kanjiIndexUrl: string;
    },
    onProgress: (percentage: number) => void
  ) {
    let percentage = 0;

    const [nameIndex, vocabularyIndex, kanjiIndex] = await Promise.all([
      new Promise<Index<NameDocument>>(async resolve => {
        const index = await this.loadIndex<NameDocument>(nameIndexUrl);
        percentage += 100 / 3;
        onProgress(Math.ceil(percentage));
        resolve(index);
      }),
      new Promise<Index<VocabularyDocument>>(async resolve => {
        const index = await this.loadIndex<VocabularyDocument>(
          vocabularyIndexUrl
        );
        percentage += 100 / 3;
        onProgress(Math.ceil(percentage));
        resolve(index);
      }),
      new Promise<Index<KanjiDocument>>(async resolve => {
        const index = await this.loadIndex<KanjiDocument>(kanjiIndexUrl);
        percentage += 100 / 3;
        onProgress(Math.ceil(percentage));
        resolve(index);
      }),
    ]);
    this.indices = { nameIndex, vocabularyIndex, kanjiIndex };
    this.all = new Database();
    this.all.initKanjiToId();
  }

  private static async loadIndex<DocType>(url: string) {
    return new Promise<Index<DocType>>(async res => {
      const json = (await (await fetch(url)).json()) as IIndex<DocType>;
      return res(Index.from<DocType>(json));
    });
  }

  async searchJapanese(term: string = "") {
    if (!Database.indices) {
      console.error("Database is not loaded; cannot perform search");
      return [];
    }
    term = term.trim();
    if (!term) {
      return [];
    }

    const kana = [toHiragana(term), toKatakana(term)]
      .map(k => {
        if (/[a-zA-Z]/.test(k.charAt(k.length - 1))) {
          return k.slice(0, -1);
        }
        return k;
      })
      .filter(t => t);

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

    const results = (
      await Promise.all(
        termToIndexMap.map(([term, index]) => {
          const scorePenalty = term === validTerm ? 0 : 0.1;
          return new Promise<ReturnType<typeof index.searchText>>(resolve => {
            const results = index.searchText(term, { scorePenalty });
            resolve(results);
          });
        })
      )
    ).flat();

    const sortedResults =
      results.sort(({ _score: a }, { _score: b }) => b - a) || [];

    const kanjis = uniq(terms.map(term => term.match(kanjiRegexp)).flat());
    const kanjiDocuments = kanjis
      .map(kanji => {
        const kanjiId = Database.kanjiToId[kanji];
        if (Number.isInteger(kanjiId)) {
          return Database.indices.kanjiIndex.get(kanjiId);
        }
      })
      .filter(doc => doc);

    return uniqBy([...kanjiDocuments, ...sortedResults], result =>
      [result._id, result._index].join()
    );
  }

  private initKanjiToId() {
    const kanjiToId: Record<string, IdField> = {};
    Database.indices.kanjiIndex.documents.reduce((acc, curr, index) => {
      acc[curr.kanji] = index;
      return acc;
    }, kanjiToId);
    Database.kanjiToId = kanjiToId;
  }
}
