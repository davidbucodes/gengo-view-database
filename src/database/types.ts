export interface Document extends Object {}

export type IndexName = "name" | "vocabulary" | "kanji";

export type IdField = number;

export interface Options<TDocument> {
  name: IndexName;
  searchableTextFields: SearchableTextField<TDocument>;
}

type SearchableTextType = string | string[];

type SearchableTextField<TDocument> = {
  [T in keyof TDocument]: TDocument[T] extends SearchableTextType ? T : never;
}[keyof TDocument][];

type SearchableNumberType = number | number[];

export type SearchableNumberField<TDocument> = {
  [T in keyof TDocument]: TDocument[T] extends SearchableNumberType ? T : never;
}[keyof TDocument][];

export interface IIndex<TDocument extends Document> {
  options: Options<TDocument>;
  documents: TDocument[];
}

export type IndexSearchResult<TDocument> = TDocument & {
  _id: IdField;
  _score: number;
  _index: IndexName;
};
