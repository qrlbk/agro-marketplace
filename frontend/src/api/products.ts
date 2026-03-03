import { request, uploadFile } from "./core";
import type { ProductReviewsResponse, VendorRating } from "./types";

export type { Product, Review, ProductReviewsResponse, VendorRating } from "./types";

export async function uploadProductImage(file: File, token: string): Promise<string> {
  const data = await uploadFile<{ url?: string | null }>("/vendor/upload-image", file, token);
  if (data == null || typeof data.url !== "string" || data.url === "") {
    throw new Error("Сервер не вернул URL изображения");
  }
  return data.url;
}

export function getProductReviews(
  productId: number,
  params?: { limit?: number; offset?: number }
): Promise<ProductReviewsResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return request<ProductReviewsResponse>(`/products/${productId}/reviews${q ? `?${q}` : ""}`);
}

export function postProductReview(
  productId: number,
  body: { rating: number; text?: string | null },
  token: string
): Promise<ProductReviewsResponse> {
  return request<ProductReviewsResponse>(`/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export function getVendorRating(vendorId: number): Promise<VendorRating> {
  return request<VendorRating>(`/vendors/${vendorId}/rating`);
}
