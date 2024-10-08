import { logCalls } from "../decorators/logCall";
import {
  IIndex,
  IndexSearchResult,
  Options,
  SearchableNumberField,
  SearchableTextField,
} from "./database.types";
import { IndexDocument } from "./doc.types";

export class Index<TDocument extends IndexDocument>
  implements IIndex<TDocument>
{
  options: Options<TDocument> = {
    name: null,
    searchableJapaneseTextFields: [],
    searchableEnglishTextFields: [],
  };
  documents: TDocument[] = [];

  constructor(options: Options<TDocument>) {
    this.options = options;
  }

  @logCalls
  addDocuments(documents: TDocument[]): void {
    this.documents = [...this.documents, ...documents];
  }

  @logCalls
  async searchText(
    term: string,
    {
      scorePenalty,
      english,
      japanese,
      sortByScore,
      documents = null,
      indexFields,
    }: {
      scorePenalty: number;
      english: boolean;
      japanese: boolean;
      sortByScore?: true;
      documents?: TDocument[];
      indexFields?: SearchableTextField<TDocument>;
    } = {
      scorePenalty: 0,
      japanese: true,
      english: false,
    }
  ): Promise<IndexSearchResult<TDocument>[]> {
    const { name: index } = this.options;
    const results: IndexSearchResult<TDocument>[] = [];
    const fields = indexFields || [
      ...(english ? this.options.searchableEnglishTextFields : []),
      ...(japanese ? this.options.searchableJapaneseTextFields : []),
    ];
    let id = -1;
    const documentsSet = documents || this.documents;
    for (const doc of documentsSet) {
      id++;
      const valContaining = (() => {
        for (const field of fields) {
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
    if (!sortByScore) {
      return results;
    } else {
      return results.sort(({ _score: a }, { _score: b }) => b - a) || [];
    }
  }

  @logCalls
  async searchNumber(
    term: number,
    field: SearchableNumberField<TDocument>[number],
    documents?: TDocument[]
  ): Promise<IndexSearchResult<TDocument>[]> {
    const { name: index } = this.options;
    const results: IndexSearchResult<TDocument>[] = [];
    let id = 0;
    let documentsSet = documents || this.documents;
    for (const doc of documentsSet) {
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

  @logCalls
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

  @logCalls
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
      _index,
      _id,
      _score,
      ...doc,
    } as IndexSearchResult<TDocument>;
  }
}
