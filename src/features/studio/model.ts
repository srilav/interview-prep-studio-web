import type { MessageInitShape } from "@bufbuild/protobuf";
import { Difficulty, KeyStatus, type Key, type KeySchema, type Platform } from "../../gen/prepstudio/catalog/v1/catalog_pb";

export const SHORT_MAX = 280;

/** Editor state: list fields are kept as the comma-separated text the user types. */
export type KeyForm = {
  term: string;
  aliases: string;
  shortDefinition: string;
  detail: string;
  javaExample: string;
  difficulty: Difficulty;
  status: KeyStatus;
  tags: string;
  relatedTerms: string;
  subcategoryId: string;
};

export function emptyForm(subcategoryId: string): KeyForm {
  return {
    term: "", aliases: "", shortDefinition: "", detail: "", javaExample: "",
    difficulty: Difficulty.MEDIUM, status: KeyStatus.DRAFT, tags: "", relatedTerms: "", subcategoryId,
  };
}

export function toForm(k: Key): KeyForm {
  return {
    term: k.term,
    aliases: k.aliases.join(", "),
    shortDefinition: k.shortDefinition,
    detail: k.detail,
    javaExample: k.javaExample,
    difficulty: k.difficulty === Difficulty.DIFFICULTY_UNSPECIFIED ? Difficulty.MEDIUM : k.difficulty,
    status: k.status === KeyStatus.KEY_STATUS_UNSPECIFIED ? KeyStatus.DRAFT : k.status,
    tags: k.tags.join(", "),
    relatedTerms: k.relatedTerms.join(", "),
    subcategoryId: k.subcategoryId,
  };
}

export const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function toKeyInit(f: KeyForm, id: string, subcategoryId: string): MessageInitShape<typeof KeySchema> {
  return {
    id,
    subcategoryId,
    term: f.term.trim(),
    aliases: splitList(f.aliases),
    shortDefinition: f.shortDefinition.trim(),
    detail: f.detail.trim(),
    javaExample: f.javaExample.replace(/\s+$/, ""),
    difficulty: f.difficulty,
    status: f.status,
    tags: splitList(f.tags),
    relatedTerms: splitList(f.relatedTerms),
  };
}

export type TreePath = { platformId: string; platformName: string; categoryId: string; categoryName: string; subcategoryId: string; subcategoryName: string };

export function findPath(tree: Platform[], subcategoryId: string): TreePath | null {
  for (const p of tree) {
    for (const c of p.categories) {
      const s = c.subcategories.find((x) => x.id === subcategoryId);
      if (s) return { platformId: p.id, platformName: p.name, categoryId: c.id, categoryName: c.name, subcategoryId: s.id, subcategoryName: s.name };
    }
  }
  return null;
}

export type AddTarget =
  | { level: "platform" }
  | { level: "category"; platformId: string }
  | { level: "subcategory"; platformId: string; categoryId: string };
