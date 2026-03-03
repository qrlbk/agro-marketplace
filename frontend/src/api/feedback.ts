import { request } from "./core";
import type { FeedbackCreate, FeedbackOut } from "./types";

export type { FeedbackCreate, FeedbackOut } from "./types";

export function postFeedback(body: FeedbackCreate, token?: string | null): Promise<FeedbackOut> {
  return request<FeedbackOut>("/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    ...(token ? { token } : {}),
  });
}
