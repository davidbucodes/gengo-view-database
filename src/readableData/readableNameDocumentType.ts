import { NameDocument } from "../database/doc.types";

// http://www.edrdg.org/jmdictdb/cgi-bin/edhelp.py?svc=jmdict&sid=#kw_misc
const typesMap: Record<string, string> = {
  given: "Given",
  fem: "Feminine given",
  surname: "Surname",
  organization: "Organization",
  company: "Company",
  station: "Station",
  work: "Work of literature, art, film, etc.",
  masc: "Masculine given",
  person: "Person",
  place: "Place",
  unclass: "Unclassified",
  char: "Character",
  ship: "Ship",
  product: "Product",
  ev: "Event",
  group: "Group/Band",
  dei: "Deity",
  myth: "Mythology",
  serv: "Service",
  fict: "Fictional",
  creat: "Creature",
  leg: "Legend",
  obj: "Object",
  relig: "Religious",
  doc: "Document",
};

export function getReadableNameDocumentType(doc: NameDocument) {
  const result: NameDocument = {
    ...doc,
    t: doc.t
      ?.split("|")
      .filter(type => type)
      .map(type => typesMap[type])
      .join("|"),
  };
  return result;
}
