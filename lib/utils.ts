import { nanoid } from "nanoid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BlockType } from "@/types/workflow";

export function generateId(): string {
  return nanoid(21);
}

export function generateBlockId(type: BlockType): string {
  return `${type}_${nanoid(8)}`;
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function parseJSON<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function parseJsonFields<T extends Record<string, unknown>>(
  record: T,
  fields: (keyof T)[]
): T {
  const result = { ...record };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      try {
        result[field] = JSON.parse(result[field] as string) as T[keyof T];
      } catch {
        // leave as string if parse fails
      }
    }
  }
  return result;
}
