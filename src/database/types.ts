export interface Document extends Object {}

export type IndexName = "name" | "vocabulary" | "kanji";

export interface Options<TDocument> {
  name: IndexName;
  searchableTextFields: SearchableTextField<TDocument>;
}

type SearchableType = string | string[];

type SearchableTextField<TDocument> = {
  [T in keyof TDocument]: TDocument[T] extends SearchableType ? T : never;
}[keyof TDocument][];

export interface IIndex<TDocument extends Document> {
  options: Options<TDocument>;
  documents: TDocument[];
}

export type IndexSearchResult<TDocument> = TDocument & {
  _id: number;
  _score: number;
  _index: IndexName;
};
