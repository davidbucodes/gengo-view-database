import { toHiragana, toKatakana } from "wanakana";
import { Document, IIndex, Options } from "./types";

export class Index<TDocument extends Document> implements IIndex<TDocument> {
  options: Options<TDocument> = { name: "", searchableTextFields: [] };
  documents: TDocument[] = [];

  constructor(options: Options<TDocument>) {
    this.options = options;
  }

  addDocuments(documents: TDocument[]) {
    this.documents = [...this.documents, ...documents];
  }

  async searchJapanese(term: string) {
    const terms = [...new Set([term, toHiragana(term), toKatakana(term)])];
    const results = (await Promise.all(terms.map(t => this.search(t)))) || [];

    return [...new Set(results?.flat())];
  }

  async search(term: string) {
    const { searchableTextFields } = this.options;
    return this.documents.filter(doc => {
      return searchableTextFields.some(field => {
        const val = doc[field];
        return Array.isArray(val)
          ? val.some(i => i?.indexOf(term) >= 0)
          : String(val)?.indexOf(term) >= 0;
      });
    });
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
