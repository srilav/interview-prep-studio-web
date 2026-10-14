import { Difficulty, KeyStatus, PlatformKind } from "../gen/prepstudio/catalog/v1/catalog_pb";

export const DIFFICULTIES = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD] as const;
export const STATUSES = [KeyStatus.DRAFT, KeyStatus.IN_REVIEW, KeyStatus.PUBLISHED] as const;
export const PLATFORM_KINDS = [PlatformKind.LANGUAGE, PlatformKind.FRAMEWORK, PlatformKind.PLATFORM, PlatformKind.TOOL] as const;

export function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case Difficulty.EASY: return "Easy";
    case Difficulty.MEDIUM: return "Medium";
    case Difficulty.HARD: return "Hard";
    default: return "Unrated";
  }
}

export function statusLabel(s: KeyStatus): string {
  switch (s) {
    case KeyStatus.DRAFT: return "Draft";
    case KeyStatus.IN_REVIEW: return "In review";
    case KeyStatus.PUBLISHED: return "Published";
    default: return "Unknown";
  }
}

export function statusClass(s: KeyStatus): string {
  return "pill st-" + statusLabel(s).replace(" ", "-");
}

export function kindLabel(k: PlatformKind): string {
  switch (k) {
    case PlatformKind.LANGUAGE: return "Language";
    case PlatformKind.FRAMEWORK: return "Framework";
    case PlatformKind.PLATFORM: return "Platform";
    case PlatformKind.TOOL: return "Tool";
    default: return "Other";
  }
}
