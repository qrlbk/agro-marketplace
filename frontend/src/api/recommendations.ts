import { request } from "./core";
import type { CompatibilityVerification, MaintenanceAdvice, RecommendationOut, SearchSuggest } from "./types";

export type {
  CompatibilityVerification,
  MaintenanceAdvice,
  MaintenanceRecommendation,
  RecommendationOut,
  SearchSuggest,
} from "./types";

export function checkCompatibility(body: { product_id: number; machine_id: number }): Promise<CompatibilityVerification> {
  return request<CompatibilityVerification>("/products/check-compatibility", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getRecommendations(token: string): Promise<RecommendationOut[]> {
  return request<RecommendationOut[]>("/recommendations", { token });
}

export function getMaintenanceAdvice(token: string): Promise<MaintenanceAdvice[]> {
  return request<MaintenanceAdvice[]>("/recommendations/maintenance", { token });
}

export function getSearchSuggest(q: string): Promise<SearchSuggest> {
  const params = new URLSearchParams({ q: q.trim() });
  return request<SearchSuggest>(`/search/suggest?${params}`);
}
