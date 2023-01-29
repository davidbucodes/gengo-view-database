import { toHiragana, toKatakana } from "wanakana";
import {
  Document,
  IIndex,
  IndexSearchResult,
  Options,
  SearchableNumberField,
} from "./types";

export class Index<TDocument extends Document> implements IIndex<TDocument> {
  options: Options<TDocument> = { name: null, searchableTextFields: [] };
  documents: TDocument[] = [];

  constructor(options: Options<TDocument>) {
    this.options = options;
  }

  addDocuments(documents: TDocument[]) {
    this.documents = [...this.documents, ...documents];
  }

  async searchJapanese(term: string) {
    const kana = [toHiragana(term), toKatakana(term)].map(k => {
      if (/[a-zA-Z]/.test(k.charAt(k.length - 1))) {
        return k.slice(0, -1);
      }
      return k;
    });

    const romaji = term.length > 1 ? term : "";

    const terms = [...new Set([romaji, ...kana])].filter(t => t);
    console.log(terms);
    const results =
      (await Promise.all(terms.map(t => this.searchText(t)))) || [];

    return [...new Set(results?.flat())];
  }

  async searchText(term: string): Promise<IndexSearchResult<TDocument>[]> {
    const { searchableTextFields, name: _index } = this.options;
    const results: IndexSearchResult<TDocument>[] = [];
    let _id = 0;
    for (const doc of this.documents) {
      for (const field of searchableTextFields) {
        const val = doc[field];
        const valContaining = Array.isArray(val)
          ? (val.find(i => i?.indexOf(term) >= 0) as string)
          : String(val)?.indexOf(term) >= 0
          ? String(val)
          : null;

        if (valContaining) {
          const _score = term.length / valContaining.length;
          results.push({
            ...doc,
            _index,
            _id,
            _score,
          });
        }
      }
      _id++;
    }
    return results;
  }

  async searchNumber(
    term: number,
    field: SearchableNumberField<TDocument>[number]
  ): Promise<IndexSearchResult<TDocument>[]> {
    const { name: _index } = this.options;
    const results: IndexSearchResult<TDocument>[] = [];
    let _id = 0;
    for (const doc of this.documents) {
      const val = doc[field];
      const equalsOrContaining = Array.isArray(val)
        ? (val.find(i => i === term) as number)
        : val === term;

      if (equalsOrContaining) {
        const _score = 1;
        results.push({
          ...doc,
          _index,
          _id,
          _score,
        });
      }
      _id++;
    }
    return results;
  }

  get(id: number) {
    return this.documents[id];
  }

  export(): string {
    return JSON.stringify({
      options: this.options,
      documents: this.documents,
    } as IIndex<TDocument>);
  }

  static from<TDocument extends Document>(
    parsedIndex: IIndex<TDocument>
  ): Index<TDocument> {
    const index = new Index<TDocument>(parsedIndex.options);
    index.addDocuments(parsedIndex.documents);
    return index;
  }
}
