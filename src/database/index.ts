import { toHiragana, toKatakana } from "wanakana";
import { Document, IIndex, IndexSearchResult, Options } from "./types";

export class Index<TDocument extends Document> implements IIndex<TDocument> {
  options: Options<TDocument> = { name: null, searchableTextFields: [] };
  documents: TDocument[] = [];
  private _cache: Record<string, TDocument[]> = {};

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

    const terms = [...new Set([term, ...kana])];
    console.log(terms);
    const results = (await Promise.all(terms.map(t => this.search(t)))) || [];

    return [...new Set(results?.flat())];
  }

  async search(term: string): Promise<IndexSearchResult<TDocument>[]> {
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
    this._cache[term] = results;
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
