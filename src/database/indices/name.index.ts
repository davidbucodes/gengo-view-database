import { Index } from "..";
import { Document, IIndex } from "../types";

export interface NameDoc extends Document {
  n: string;
  d: string;
  t: string;
  r: string[];
}

export const loadNameIndex = async (url: string) =>
  new Promise<Index<NameDoc>>(async res => {
    const json = (await (await fetch(url)).json()) as IIndex<NameDoc>;
    return res(Index.from<NameDoc>(json));
  });
