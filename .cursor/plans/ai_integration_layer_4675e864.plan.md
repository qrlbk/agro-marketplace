---
name: AI Integration Layer
overview: "Implement a comprehensive AI layer: improve the price parser with confidence scores and RapidFuzz fallback, add a new maintenance recommendation service wired to /recommendations, introduce an AI compatibility checker for generic parts vs. machine specs, and surface AI maintenance advice and Smart Search suggestions in the frontend."
todos: []
isProject: false
---

# AI Integration Layer for AgroHub

## Current state (summary)

- **Price parser:** [backend/app/services/price_parser.py](backend/app/services/price_parser.py) uses `gpt-4o-mini` to map Excel columns to `article_number`, `name`, `price`, `quantity`. No confidence; fallback is a fixed mapping on missing key or parse error. Called from [backend/app/routers/vendor_upload.py](backend/app/routers/vendor_upload.py).
- **Recommendations:** [backend/app/routers/recommendations.py](backend/app/routers/recommendations.py) does cross-sell only (e.g. oil → oil filters) via `CROSS_SELL_RULES` and `CompatibilityMatrix`. No maintenance-by-hours logic. Frontend does **not** call `/recommendations`.
- **Compatibility:** [backend/app/models/compatibility.py](backend/app/models/compatibility.py) is an explicit `(product_id, machine_id)` table. No AI; no check for generic parts (e.g. battery, oil) vs. John Deere model.
- **Garage:** [backend/app/models/garage.py](backend/app/models/garage.py) has `moto_hours`; [backend/app/routers/garage.py](backend/app/routers/garage.py) returns `GarageWithMachineOut` (brand, model, year, moto_hours). [frontend/src/pages/Garage.tsx](frontend/src/pages/Garage.tsx) lists machines but has no AI/maintenance UI.
- **Search:** Catalog uses `q` with `Product.article_number` / `Product.name` ILIKE. No synonym or related-term expansion; [frontend/src/components/Header.tsx](frontend/src/components/Header.tsx) only passes `q` to `/catalog?q=...`.

---

## 1. Improve price parser

**File:** [backend/app/services/price_parser.py](backend/app/services/price_parser.py)

- **Refine LLM for unstructured Excel:**  
  - Strengthen system prompt: allow column **names** or **0-based indices**, handle merged headers, multiple header rows, and noisy column names (e.g. "Артикул", "Код", "Part No").  
  - Send a small sample (e.g. first 15 rows) as JSON; ask for a single JSON object mapping standard fields to column identifier (index or name string).
- **Confidence score per mapping:**  
  - Change LLM response contract to return both mapping and confidence. Options: (a) ask the model to output a second JSON object with keys like `article_number_confidence` (0.0–1.0), or (b) use a structured output (e.g. JSON schema) with fields `mapping` and `confidence` (dict of field -> float).  
  - Define a Pydantic model for this response and parse into it; normalize to a single `confidence` dict keyed by field name.
- **Fuzzy matching fallback when LLM is unsure:**  
  - Add dependency: `rapidfuzz` in [backend/requirements.txt](backend/requirements.txt).  
  - When confidence for `name` (or another critical field) is below a threshold (e.g. 0.7), optionally run a fuzzy step: for each parsed row, match the raw "name" string against a small set of known part-name patterns or against previously seen product names (e.g. from DB or a static list) using RapidFuzz (e.g. `fuzz.ratio` or `process.extractOne`). Use the best match to normalize or validate the name.  
  - Keep existing `parse_excel_with_mapping` behavior; optionally add a post-process step that accepts mapping + confidence and applies fuzzy correction only for low-confidence fields.
- **Backward compatibility:**  
  - Expose a result type that includes both `mapping: dict[str, int | str]` and `confidence: dict[str, float]`.  
  - In [backend/app/routers/vendor_upload.py](backend/app/routers/vendor_upload.py), keep using the mapping for parsing; optionally log or return confidence in the upload response so vendors can see quality. Do not change the existing create/update product CRUD loop.
- **Model:** Use `gpt-4o` (or configurable in [backend/app/config.py](backend/app/config.py) as `openai_model`) for better robustness on messy Excel; keep all calls `async`.

---

## 2. AI predictive maintenance service

**New file:** `backend/app/services/maintenance.py`

- **Input:** Machine identity (brand, model, year) + moto_hours (int). Reuse existing [backend/app/models/machine.py](backend/app/models/machine.py) and garage’s moto_hours.
- **Logic:**  
  - Async function, e.g. `recommend_maintenance_kits(machine_brand: str, machine_model: str, machine_year: int | None, moto_hours: int) -> list[MaintenanceRecommendation]`.  
  - Call OpenAI (GPT-4o or configurable model) with a prompt that includes: typical ag equipment service intervals (e.g. 500h, 1000h for oil/filters); current moto_hours; machine brand/model/year.  
  - Ask for a short list of recommended “maintenance kit” items (e.g. oil filter, air filter, oil change) with optional interval (e.g. “500h service”) and brief reason.  
  - Parse response into a Pydantic model (e.g. `MaintenanceRecommendation(interval_h: int | None, items: list[str], reason: str)`). Use structured output or clear JSON in the reply for robustness.
- **Connection to `/recommendations`:**  
  - **Option A (recommended):** Add a sub-route under the same router, e.g. `GET /recommendations/maintenance`, returning maintenance advice per garage machine (and optionally merge with existing cross-sell in one payload from `GET /recommendations`).  
  - **Option B:** Extend `GET /recommendations` response to include a second list, e.g. `maintenance_advice: list[MaintenanceAdviceOut]`, where each entry has machine info + moto_hours + list of recommendations.  
  - Implementation: In [backend/app/routers/recommendations.py](backend/app/routers/recommendations.py), depend on `get_current_user_optional`, load user’s garage (with machine and moto_hours). For each garage item, call `recommend_maintenance_kits(...)` asynchronously (e.g. `asyncio.gather`). If `openai_api_key` is missing, return empty maintenance list. Return combined response (existing cross-sell + maintenance) with strict Pydantic schemas.
- **Types:** Define Pydantic models in `maintenance.py` or in `backend/app/schemas/maintenance.py`; use them in the router. All LLM calls `async`; no blocking.

---

## 3. Smart compatibility checker (AI agent)

**New file:** `backend/app/services/compatibility_checker.py` (or `ai_compatibility.py`)

- **Purpose:** Given a generic part (product name + description) and a specific machine (e.g. John Deere model), determine if the part is suitable for that machine.
- **Input:** Product `name`, `description` (from [backend/app/models/product.py](backend/app/models/product.py)); machine `brand`, `model`, `year` (from Machine).
- **Output:** Structured result, e.g. `CompatibilityVerification(compatible: bool, confidence: float, reason: str)`. Use Pydantic.
- **Implementation:**  
  - Async function `verify_compatibility(product_name: str, product_description: str | None, machine_brand: str, machine_model: str, machine_year: int | None) -> CompatibilityVerification`.  
  - Single LLM call (GPT-4o or configurable): provide product name/description and machine specs; ask whether the part is suitable for that machine (e.g. battery capacity, oil specs, fitment). Request a short reason and a compatible/not_compatible/uncertain plus optional confidence.  
  - Parse into `CompatibilityVerification`; if API key missing, return a safe default (e.g. uncertain, confidence 0).
- **Integration with CompatibilityMatrix:**  
  - **Do not** replace or break existing CRUD ([backend/app/routers/products.py](backend/app/routers/products.py) `POST /products/{product_id}/compatibility`).  
  - Add a **new** endpoint, e.g. `POST /products/check-compatibility` (or `POST /products/{product_id}/check-compatibility?machine_id=...`), that: loads product and machine from DB, calls `verify_compatibility(...)`, and returns the result. This can be used by the frontend (e.g. on a product page) or by admins to decide whether to add a row to `CompatibilityMatrix`.  
  - Optionally: when displaying a product that is **not** in `CompatibilityMatrix` for a user’s machine, call this checker and show “AI-verified: may be compatible” or “not recommended” with the reason. That can be a follow-up to avoid blocking the core implementation.
- **Type safety:** All inputs/outputs Pydantic; async only.

---

## 4. Frontend integration

### 4.1 AI-generated maintenance advice (Garage)

- **Data:** New endpoint or extended `GET /recommendations` that returns maintenance advice per garage machine (see section 2). Frontend needs a type, e.g. `MaintenanceAdvice { machineId, brand, model, year, motoHours, recommendations: { interval_h?, items[], reason }[] }`.
- **UI:** In [frontend/src/pages/Garage.tsx](frontend/src/pages/Garage.tsx), add a section “Рекомендации по ТО” / “AI maintenance advice”:  
  - When garage has items, call the new API (e.g. `GET /recommendations` or `GET /recommendations/maintenance`).  
  - Show per-machine blocks: machine name + moto hours, then a list of recommended kits/intervals and short reasons.  
  - Handle loading and empty state; if API key is not set, backend returns empty and the section can show nothing or a neutral message.
- **API client:** In [frontend/src/api/client.ts](frontend/src/api/client.ts), add `getRecommendations()` (and optionally `getMaintenanceAdvice()`) and the corresponding TypeScript interfaces so that the response is type-safe.

### 4.2 Smart Search (synonyms / related parts)

- **Backend:** New endpoint, e.g. `GET /search/suggest?q=...`, that:  
  - Calls an LLM with the user query (e.g. “filter”) and asks for synonyms or related part terms (e.g. “gaskets”, “seals”, “фильтр”, “прокладки”).  
  - Returns a structured response, e.g. `{ original_query: string, suggestions: string[], expanded_terms?: string[] }`.  
  - All async; optional: if no API key, return `suggestions: [query]` and `expanded_terms: [query]` so search still works.
- **Frontend:**  
  - When the user focuses the search input or after a short debounce on typing, call `GET /search/suggest?q=...` (optional, to avoid excessive calls: e.g. only when `q` length >= 2).  
  - Show “Smart Search” explanation: e.g. “По запросу «filter» также ищем: gaskets, seals” and/or use `expanded_terms` to run the catalog search with OR logic.  
  - Implementation options: (a) Display suggestions as chips/links that set `q` to the suggestion or (b) Backend accepts `q` and `expand=true` and performs an expanded search using LLM-suggested terms; frontend just shows the explanation. Prefer (b) for a single search request: endpoint `GET /products?q=...&expand=true` could call the suggest logic and then query products with expanded terms; response includes `suggested_terms` for UI.  
  - Minimal change: add a small “Smart Search” area in [frontend/src/components/Header.tsx](frontend/src/components/Header.tsx) or above results in [frontend/src/pages/Catalog.tsx](frontend/src/pages/Catalog.tsx) that shows the explanation when `expand=true` and backend returns `suggested_terms`.
- **Type safety:** TypeScript interfaces for suggest response and for any extended product list response.

---

## 5. Cross-cutting

- **LLM provider and model:** Use **OpenAI GPT-4o** (or Claude 3.5 Sonnet if you add `anthropic` and a separate path). Centralize model name in [backend/app/config.py](backend/app/config.py), e.g. `openai_model: str = "gpt-4o"`. Use the same key `openai_api_key`; all services check for missing key and degrade gracefully (no exceptions, return empty or fallback).
- **Async:** All LLM calls must be `async` and awaited; no `run_in_executor` or blocking calls in request handlers.
- **Types:** Python: Pydantic for every request/response and internal DTOs in new services. TypeScript: interfaces for all new API responses and props.
- **Existing CRUD:** No changes to existing create/update/delete of products, garage, compatibility matrix, or cart/checkout; only additive endpoints and optional response extensions.

---

## 6. Suggested file and dependency changes


| Area                                                                                                                                             | Action                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| [backend/requirements.txt](backend/requirements.txt)                                                                                             | Add `rapidfuzz`.                                                                                                             |
| [backend/app/config.py](backend/app/config.py)                                                                                                   | Add `openai_model: str = "gpt-4o"`.                                                                                          |
| [backend/app/services/price_parser.py](backend/app/services/price_parser.py)                                                                     | Refine prompt; return mapping + confidence; add RapidFuzz fallback for low-confidence name field.                            |
| [backend/app/routers/vendor_upload.py](backend/app/routers/vendor_upload.py)                                                                     | Use new parser response; optionally return confidence in upload response.                                                    |
| New: `backend/app/services/maintenance.py`                                                                                                       | `recommend_maintenance_kits(...)` + Pydantic models.                                                                         |
| New: `backend/app/schemas/maintenance.py` (optional)                                                                                             | Response schemas for maintenance.                                                                                            |
| [backend/app/routers/recommendations.py](backend/app/routers/recommendations.py)                                                                 | Add maintenance: load garage, call maintenance service, return combined or separate `GET /recommendations/maintenance`.      |
| New: `backend/app/services/compatibility_checker.py`                                                                                             | `verify_compatibility(...)` + Pydantic.                                                                                      |
| [backend/app/routers/products.py](backend/app/routers/products.py)                                                                               | Add `POST /products/check-compatibility` (or under a new `search` router).                                                   |
| New router (optional): `backend/app/routers/search.py`                                                                                           | `GET /search/suggest?q=...` and optionally `GET /products?q=...&expand=true` logic (or integrate expand in products router). |
| [frontend/src/api/client.ts](frontend/src/api/client.ts)                                                                                         | Types and `request` calls for recommendations (with maintenance) and search suggest.                                         |
| [frontend/src/pages/Garage.tsx](frontend/src/pages/Garage.tsx)                                                                                   | Fetch and display “AI-Generated Maintenance Advice” section.                                                                 |
| [frontend/src/components/Header.tsx](frontend/src/components/Header.tsx) and/or [frontend/src/pages/Catalog.tsx](frontend/src/pages/Catalog.tsx) | Smart Search: call suggest/expand, show “also searching for: …” and use expanded terms if backend supports.                  |


---

## 7. Optional: shared LLM client

To avoid instantiating `AsyncOpenAI` in every service, add a small module, e.g. `backend/app/services/llm_client.py`, that exposes `get_openai_client() -> AsyncOpenAI | None` (returns `None` if `openai_api_key` is empty). Use it from `price_parser`, `maintenance`, `compatibility_checker`, and search suggest. Keeps behavior the same and centralizes config.