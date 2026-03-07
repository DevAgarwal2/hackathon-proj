// ============================================================
// API client for FastAPI backend (http://localhost:8000)
// All calls are scoped to the logged-in restaurant via localStorage
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

// ---------- Auth helpers ----------

export function getRestaurantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("restaurant_id");
}

export function getRestaurantName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("restaurant_name");
}

export function setAuth(restaurantId: string, restaurantName: string) {
  localStorage.setItem("restaurant_id", restaurantId);
  localStorage.setItem("restaurant_name", restaurantName);
}

export function clearAuth() {
  localStorage.removeItem("restaurant_id");
  localStorage.removeItem("restaurant_name");
}

export function isAuthenticated(): boolean {
  return !!getRestaurantId();
}

// ---------- Analytics types (from GET /api/analytics/<restaurant_id>) ----------

export interface AnalyticsSummary {
  menu_items: number;
  total_orders: number;
  total_order_lines: number;
  total_revenue: number;
  avg_order_value: number;
  avg_contribution_margin_pct: number;
}

export interface ContributionMarginItem {
  item_id: string;
  item_name: string;
  selling_price: number;
  estimated_food_cost: number;
  contribution_margin: number;
  margin_pct: number;
  category: string;
}

export interface ItemProfitability {
  item_id: string;
  item_name: string;
  quantity_sold: number;
  unit_price: number;
  total_revenue: number;
  estimated_profit: number;
  category: string;
}

export interface SalesVelocityItem {
  item_id: string;
  item_name: string;
  quantity_sold: number;
  unique_orders: number;
  popularity_score: number;
  velocity_tier: "High" | "Medium" | "Low";
}

export interface UnderpromotedItem {
  item_id: string;
  item_name: string;
  margin_pct: number;
  quantity_sold: number;
  revenue: number;
  recommendation: string;
  category: string;
}

export interface RiskItem {
  item_id: string;
  item_name: string;
  margin_pct: number;
  quantity_sold: number;
  revenue: number;
  risk_reason: string;
  category: string;
}

export interface ComboRecommendation {
  items: string[];
  item_ids: string[];
  frequency: number;
  recommendation: string;
}

export interface UpsellPriority {
  item_id: string;
  item_name: string;
  margin_pct: number;
  unit_price: number;
  category: string;
  upsell_script: string;
}

export interface PriceOptimization {
  item_id: string;
  item_name: string;
  current_price: number;
  suggested_price: number;
  action: string;
  reason: string;
  expected_volume_improvement: string;
}

export interface AnalyticsResponse {
  restaurant_id: string;
  restaurant_name: string;
  cuisine: string;
  area: string;
  summary: AnalyticsSummary;
  contribution_margin_analysis: {
    description: string;
    count: number;
    items: ContributionMarginItem[];
  };
  item_profitability: {
    description: string;
    count: number;
    items: ItemProfitability[];
  };
  sales_velocity: {
    description: string;
    count: number;
    items: SalesVelocityItem[];
  };
  underpromoted_high_margin: {
    description: string;
    count: number;
    items: UnderpromotedItem[];
  };
  risk_items: {
    description: string;
    count: number;
    items: RiskItem[];
  };
  combo_recommendations: {
    description: string;
    count: number;
    combos: ComboRecommendation[];
  };
  upsell_priorities: {
    description: string;
    count: number;
    items: UpsellPriority[];
  };
  price_optimization: {
    description: string;
    count: number;
    recommendations: PriceOptimization[];
  };
}

// ---------- Voice order types ----------

export interface VoiceOrderRow {
  order_item_id: number;
  order_id: string;
  bill_number: string | null;
  restaurant_id: string;
  order_type: string;
  order_source: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  order_datetime: string;
}

export interface VoiceOrdersResponse {
  success: boolean;
  count: number;
  orders: VoiceOrderRow[];
}

// ---------- Voice agent text chat types ----------

export interface VoiceTextRequest {
  message: string;
  session_id: string;
  restaurant_id: string;
  language: string;
}

export interface VoiceTextResponse {
  success: boolean;
  response: string;
  tool_calls: unknown[];
  current_order: unknown;
}

// ---------- Voice process (audio pipeline) types ----------

export interface VoiceProcessRequest {
  audio_base64: string;
  session_id: string;
  restaurant_id: string;
  language: string;
}

export interface VoiceProcessResponse {
  success: boolean;
  transcript: string;
  response: string;
  audio_base64: string;
  tool_calls: unknown[];
  current_order: VoiceCurrentOrder | null;
  session_id: string;
}

export interface VoiceCurrentOrder {
  order_id?: string;
  restaurant_id?: string;
  items?: VoiceOrderItem[];
  subtotal?: number;
  total?: number;
  status?: string;
}

export interface VoiceOrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
}

// ---------- API fetch helpers ----------

export async function fetchAnalytics(
  restaurantId?: string,
): Promise<AnalyticsResponse> {
  const rid = restaurantId || getRestaurantId();
  if (!rid) throw new Error("No restaurant_id found");

  const res = await fetch(`${API_BASE}/api/analytics/${rid}`);
  if (!res.ok) throw new Error(`Analytics API error: ${res.status}`);
  return res.json();
}

export async function fetchVoiceOrders(
  restaurantId?: string,
  limit = 20,
): Promise<VoiceOrdersResponse> {
  const rid = restaurantId || getRestaurantId();
  if (!rid) throw new Error("No restaurant_id found");

  const res = await fetch(
    `${API_BASE}/api/ai/voice-agent/db-orders?restaurant_id=${rid}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`Voice orders API error: ${res.status}`);
  return res.json();
}

// ---------- New TS agent helpers (Next.js API routes) ----------

/**
 * Send a text message to the TypeScript AI agent (Next.js route).
 * This replaces the old FastAPI /api/ai/voice-agent/text endpoint.
 */
export async function sendAgentText(
  req: VoiceTextRequest,
): Promise<VoiceTextResponse & { audio_base64?: string }> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: req.message,
      session_id: req.session_id,
      restaurant_id: req.restaurant_id,
      language: req.language,
    }),
  });
  if (!res.ok) throw new Error(`Agent text API error: ${res.status}`);
  return res.json();
}

/**
 * Send audio to the STT proxy (Next.js route → FastAPI STT).
 * Returns transcript only. Then call sendAgentText for the LLM response.
 */
export async function sendAgentSTT(req: VoiceProcessRequest): Promise<{ success: boolean; transcript: string; language?: string }> {
  const res = await fetch("/api/agent/stt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Agent STT error: ${res.status}`);
  return res.json();
}

/**
 * Convert text to speech via the TTS proxy (Next.js route → SarvamAI SDK, batch).
 * Returns { success, audio_base64 } — caller decodes and plays.
 */
export async function sendAgentTTS(
  text: string,
  language: string,
  sessionId: string,
  restaurantId: string,
): Promise<{ success: boolean; audio_base64: string }> {
  const res = await fetch("/api/agent/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, session_id: sessionId, restaurant_id: restaurantId }),
  });
  if (!res.ok) throw new Error(`Agent TTS error: ${res.status}`);
  return res.json();
}

/**
 * Clear agent session (Next.js route DELETE /api/agent).
 */
export async function clearAgentSession(
  sessionId: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/agent?session_id=${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Clear session API error: ${res.status}`);
  return res.json();
}

// ---------- Legacy FastAPI helpers (kept for backward compat) ----------

export async function sendVoiceText(
  req: VoiceTextRequest,
): Promise<VoiceTextResponse> {
  const res = await fetch(`${API_BASE}/api/ai/voice-agent/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Voice text API error: ${res.status}`);
  return res.json();
}

export async function sendVoiceProcess(
  req: VoiceProcessRequest,
): Promise<VoiceProcessResponse> {
  const res = await fetch(`${API_BASE}/api/ai/voice-agent/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Voice process API error: ${res.status}`);
  return res.json();
}

export async function clearVoiceSession(
  sessionId: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(
    `${API_BASE}/api/ai/voice-agent/session/${sessionId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`Clear session API error: ${res.status}`);
  return res.json();
}

// ---------- Voice session types (from voice_orders + voice_order_items tables) ----------

export interface ConversationLogEntry {
  timestamp: string;
  customer_message: string;
  ai_response: string;
  tool_calls: { tool: string; args: Record<string, unknown> }[];
}

export interface VoiceSessionItem {
  id: number;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string | null;
  spice_level: string | null;
  special_instructions: string | null;
  category: string;
}

export interface VoiceSession {
  id: number;
  order_id: string;
  session_id: string;
  restaurant_id: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  language: string;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string | null;
  conversation_log: ConversationLogEntry[];
  items: VoiceSessionItem[];
}

export interface VoiceSessionsResponse {
  success: boolean;
  count: number;
  sessions: VoiceSession[];
}

export interface VoiceSessionDetailResponse {
  success: boolean;
  session: VoiceSession;
}

// ---------- Voice session fetch helpers ----------

export async function fetchVoiceSessions(
  restaurantId?: string,
  limit = 50,
): Promise<VoiceSessionsResponse> {
  const rid = restaurantId || getRestaurantId();
  const params = new URLSearchParams();
  if (rid) params.set("restaurant_id", rid);
  params.set("limit", String(limit));

  const res = await fetch(
    `${API_BASE}/api/ai/voice-agent/sessions?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Voice sessions API error: ${res.status}`);
  return res.json();
}

export async function fetchVoiceSessionDetail(
  orderId: string,
): Promise<VoiceSessionDetailResponse> {
  const res = await fetch(
    `${API_BASE}/api/ai/voice-agent/sessions/${orderId}`,
  );
  if (!res.ok) throw new Error(`Voice session detail API error: ${res.status}`);
  return res.json();
}
