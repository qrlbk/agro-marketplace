export interface User {
  id: number;
  role: string;
  phone: string;
  name: string | null;
  region?: string | null;
  company_id?: number | null;
  company_details: Record<string, unknown> | null;
  company_status?: string | null;
  company_role?: string | null;
  chat_storage_opt_in?: boolean;
  has_password?: boolean;
}

export interface TokenOut {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface BinLookupResult {
  name: string | null;
  legal_address: string | null;
  chairman_name: string | null;
  manual_input_required?: boolean;
}

export interface OnboardingBody {
  role: "user" | "farmer" | "vendor";
  name?: string | null;
  region?: string | null;
  bin?: string | null;
  company_name?: string | null;
  legal_address?: string | null;
  chairman_name?: string | null;
  bank_iik?: string | null;
  bank_bik?: string | null;
  contact_name?: string | null;
}

export interface ProfileUpdateBody {
  name?: string | null;
  region?: string | null;
  chat_storage_opt_in?: boolean | null;
}

export interface Product {
  id: number;
  vendor_id: number;
  category_id: number | null;
  category_slug?: string | null;
  name: string;
  article_number: string;
  price: number;
  stock_quantity: number;
  description: string | null;
  characteristics?: Record<string, string> | null;
  composition?: string | null;
  images: string[] | null;
  status: string;
  average_rating?: number | null;
  reviews_count?: number;
}

export interface Review {
  id: number;
  user_id: number;
  author_display: string;
  rating: number;
  text: string | null;
  created_at: string;
}

export interface ProductReviewsResponse {
  items: Review[];
  total_count: number;
  average_rating: number | null;
}

export interface VendorRating {
  average_rating: number;
  total_reviews: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  suggested_terms?: string[] | null;
}

export interface Machine {
  id: number;
  brand: string;
  model: string;
  year: number | null;
}

export interface GarageItem {
  id: number;
  user_id: number;
  machine_id: number;
  serial_number: string | null;
  moto_hours: number | null;
  brand?: string;
  model?: string;
  year?: number | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_order: number;
  name?: string | null;
  article_number?: string | null;
}

export interface Order {
  id: number;
  order_number?: string | null;
  user_id: number;
  vendor_id: number;
  total_amount: number;
  status: string;
  delivery_address: string | null;
  comment: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
}

export interface CategoryTree {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  children: CategoryTree[];
}

export interface CartItem {
  product_id: number;
  quantity: number;
  vendor_id: number;
  price: number;
  name: string;
  article_number: string;
}

export interface MaintenanceRecommendation {
  interval_h: number | null;
  items: string[];
  reason: string;
}

export interface MaintenanceAdvice {
  garage_id: number;
  machine_id: number;
  brand: string;
  model: string;
  year: number | null;
  moto_hours: number | null;
  recommendations: MaintenanceRecommendation[];
  error_message?: string | null;
}

export interface SearchSuggest {
  original_query: string;
  suggestions: string[];
  expanded_terms: string[];
}

export interface RecommendationOut {
  product_id: number;
  name: string;
  article_number: string;
  price: number;
  category_name: string | null;
  message: string;
}

export interface CompatibilityVerification {
  compatible: boolean;
  confidence: number;
  reason: string;
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface ChatMessageIn {
  message: string;
  history: ChatHistoryItem[];
}

export interface ChatMessageOut {
  reply: string;
  suggested_catalog_url?: string | null;
}

export interface OpenAIHealth {
  key_set: boolean;
  ok?: boolean;
  error?: string;
  reply?: string;
}

export interface ChatSessionItem {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionMessage {
  role: string;
  content: string;
  suggested_catalog_url?: string | null;
}

export interface ChatStreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (suggestedCatalogUrl: string | null, suggestedFollowUps?: string[]) => void;
  onError: (message: string) => void;
}

export interface FeedbackCreate {
  subject: string;
  message: string;
  contact_phone?: string | null;
  order_id?: number | null;
  product_id?: number | null;
}

export interface FeedbackOut {
  id: number;
  message?: string;
}
