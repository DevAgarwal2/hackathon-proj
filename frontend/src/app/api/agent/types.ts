// Shared types for the TypeScript AI agent

export interface OrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size?: string | null;
  spice_level?: string | null;
  special_instructions?: string | null;
  category: string;
}

export interface CurrentOrder {
  order_id: string;
  restaurant_id: string;
  items: OrderItem[];
  status: "draft" | "confirmed" | "cancelled";
  created_at: string;
  customer_phone: string;
  special_instructions: string;
}

export interface SessionState {
  restaurant_id: string;
  restaurant_name: string;
  language: string;
  current_order: CurrentOrder | null;
  conversation_history: ConversationMessage[];
}

export type ConversationMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "tool"; tool_call_id: string; content: string };

export interface AgentTextRequest {
  message: string;
  session_id: string;
  restaurant_id: string;
  language?: string;
}

export interface AgentTextResponse {
  success: boolean;
  response: string;
  audio_base64?: string;
  tool_calls: string[];
  current_order: VoiceCurrentOrder | null;
  session_id: string;
  restaurant_id: string;
}

// Matches frontend VoiceCurrentOrder / VoiceOrderItem types in lib/api.ts
export interface VoiceOrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
}

export interface VoiceCurrentOrder {
  order_id?: string;
  restaurant_id?: string;
  items?: VoiceOrderItem[];
  subtotal?: number;
  total?: number;
  status?: string;
}
