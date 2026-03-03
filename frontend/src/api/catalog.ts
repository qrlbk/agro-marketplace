import { request } from "./core";
import type { CategoryTree } from "./types";

export type { CategoryTree } from "./types";

export async function getCategoryTree(): Promise<CategoryTree[]> {
  return request<CategoryTree[]>("/categories/tree");
}
