import {
  IIndex,
  IndexSearchResult,
  Options,
  SearchableNumberField,
} from "./database.types";
import { IndexDocument } from "./doc.types";

export class Index<TDocument extends IndexDocument>
  implements IIndex<TDocument>
{
  options: Options<TDocument> = { name: null, searchableTextFields: [] };
  documents: TDocument[] = [];

  constructor(options: Options<TDocument>) {
    this.options = options;
  }

  addDocuments(documents: TDocument[]): void {
    this.documents = [...this.documents, ...documents];
  }

  async searchText(
    term: string,
    { scorePenalty }: { scorePenalty: number } = { scorePenalty: 0 }
  ): Promise<IndexSearchResult<TDocument>[]> {
    const { searchableTextFields, name: index } = this.options;
    const results: IndexSearchResult<TDocument>[] = [];
    let id = -1;
    for (const doc of this.documents) {
      id++;
      const valContaining = (() => {
        for (const field of searchableTextFields) {
          const val = doc[field];
          const valContaining = Array.isArray(val)
            ? (val.find(i => i?.indexOf(term) >= 0) as string)
            : String(val)?.indexOf(term) >= 0
            ? String(val)
            : null;
          if (valContaining) {
            return valContaining;
          }
        }
      })();
      if (valContaining) {
        const score =
          term === valContaining
            ? 1
            : term.length / valContaining.length - scorePenalty;
        results.push(this.documentToSearchResult(doc, index, id, score));
      }
    }
    return results;
  }

  async searchNumber(
    term: number,
    field: SearchableNumberField<TDocument>[number]
  ): Promise<IndexSearchResult<TDocument>[]> {
    const { name: index } = this.options;
    const results: IndexSearchResult<TDocument>[] = [];
    let id = 0;
    for (const doc of this.documents) {
      const val = doc[field];
      const equalsOrContaining = Array.isArray(val)
        ? (val.find(i => i === term) as number)
        : val === term;

      if (equalsOrContaining) {
        results.push(this.documentToSearchResult(doc, index, id));
      }
      id++;
    }
    return results;
  }

  get(id: number): IndexSearchResult<TDocument> {
    const doc = this.documents[id];
    return this.documentToSearchResult(doc, this.options.name, id);
  }

  export(): string {
    return JSON.stringify({
      options: this.options,
      documents: this.documents,
    } as IIndex<TDocument>);
  }

  static from<TDocument extends IndexDocument>(
    parsedIndex: IIndex<TDocument>
  ): Index<TDocument> {
    const index = new Index<TDocument>(parsedIndex.options);
    index.addDocuments(parsedIndex.documents);
    return index;
  }

  private documentToSearchResult(
    doc: TDocument,
    _index: string,
    _id: number,
    _score?: number
  ): IndexSearchResult<TDocument> {
    return {
      ...doc,
      _index,
      _id,
      _score,
    } as IndexSearchResult<TDocument>;
  }
}
