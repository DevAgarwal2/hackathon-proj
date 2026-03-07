// Tool definitions and implementations for the AI agent
// Uses Vercel AI SDK v6 tool() with zodSchema for type-safe tool calling

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  getSession,
  getOrCreateSession,
  setSession,
  nextOrderId,
  nextBillNumber,
} from "./session";
import type { OrderItem, CurrentOrder } from "./types";

// ── Supabase client (server-side, uses secret key) ────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_KEY env vars");
  return createClient(url, key);
}

// ── Legacy order_item_id counter (stored in module scope) ─────────────────────
let _oidCounter: number = 0;
async function nextOrderItemId(): Promise<number> {
  if (_oidCounter === 0) {
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from("order")
        .select("order_item_id")
        .order("order_item_id", { ascending: false })
        .limit(1);
      _oidCounter = (data?.[0]?.order_item_id as number | undefined) ?? 1000;
    } catch {
      _oidCounter = 1000;
    }
  }
  _oidCounter += 1;
  return _oidCounter;
}

// ── Helper: current order -> VoiceCurrentOrder shape for frontend ─────────────
export function toFrontendOrder(sessionId: string) {
  const session = getSession(sessionId);
  if (!session || !session.current_order) {
    return { order_id: null, items: [], total: 0, subtotal: 0, status: "no_order" };
  }
  const order = session.current_order;
  const items = order.items.map((item) => ({
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total_price,
    notes: item.special_instructions ?? "",
  }));
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  return {
    order_id: order.order_id,
    restaurant_id: session.restaurant_id,
    items,
    subtotal,
    total: subtotal,
    item_count: items.length,
    status: order.status,
  };
}

// ── Helper: ensure an order exists for the session ────────────────────────────
function ensureOrder(sessionId: string): CurrentOrder {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (!session.current_order) {
    const order_id = nextOrderId();
    session.current_order = {
      order_id,
      restaurant_id: session.restaurant_id,
      items: [],
      status: "draft",
      created_at: new Date().toISOString(),
      customer_phone: "",
      special_instructions: "",
    };
    setSession(sessionId, session);
    // Fire-and-forget DB save
    saveVoiceOrderToDB(
      sessionId,
      order_id,
      session.restaurant_id,
      { status: "draft", language: session.language }
    ).catch(console.error);
  }
  return session.current_order;
}

// ── DB helpers (fire-and-forget from tools) ────────────────────────────────────
async function saveVoiceOrderToDB(
  sessionId: string,
  orderId: string,
  restaurantId: string,
  opts: {
    customerPhone?: string;
    totalAmount?: number;
    status?: string;
    language?: string;
  } = {}
) {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const { data: existing } = await sb
    .from("voice_orders")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    const update: Record<string, unknown> = { updated_at: now };
    if (opts.totalAmount !== undefined) update.total_amount = opts.totalAmount;
    if (opts.status) update.status = opts.status;
    if (opts.customerPhone !== undefined) update.customer_phone = opts.customerPhone;
    if (opts.status === "confirmed") update.confirmed_at = now;
    await sb.from("voice_orders").update(update).eq("order_id", orderId);
  } else {
    await sb.from("voice_orders").insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      session_id: sessionId,
      customer_phone: opts.customerPhone ?? "",
      total_amount: opts.totalAmount ?? 0,
      status: opts.status ?? "draft",
      language: opts.language ?? "hi-IN",
      conversation_log: JSON.stringify([]),
    });
  }
}

// ── Tool factory: bound to a specific session_id ──────────────────────────────
// We pass session_id as a closure so tools don't expose it as an LLM parameter.

export function buildTools(sessionId: string) {
  return {
    get_menu_items: tool({
      description:
        "Fetch the restaurant's menu. Use when the customer asks to see the menu, asks what's available, asks about prices, or wants to know what food/drinks are offered. Optionally filter by category like Starter, Main Course, Beverage, Dessert, Biryani, Breads, etc.",
      inputSchema: zodSchema(
        z.object({
          category: z
            .string()
            .optional()
            .describe(
              "Optional category filter e.g. Starter, Main Course, Beverage, Dessert, Biryani, Breads, Sides"
            ),
        })
      ),
      execute: async ({ category }: { category?: string }) => {
        // Sanitize: LLM sometimes passes string "None"/"null"/""
        const session = getSession(sessionId);
        const restaurantId = session?.restaurant_id ?? "R001";

        let cleanCategory: string | undefined = category;
        if (
          typeof cleanCategory === "string" &&
          ["none", "null", "undefined", ""].includes(cleanCategory.trim().toLowerCase())
        ) {
          cleanCategory = undefined;
        }

        console.log(
          `[get_menu_items] session=${sessionId}, restaurant=${restaurantId}, category=${cleanCategory}`
        );

        try {
          const sb = getSupabase();
          let query = sb
            .from("menu")
            .select("item_id,item_name,category,price")
            .eq("restaurant_id", restaurantId);
          if (cleanCategory) {
            query = query.ilike("category", `%${cleanCategory}%`);
          }
          const { data, error } = await query;
          if (error) throw error;

          const items: Record<string, { name: string; price: number; category: string }> = {};
          for (const row of data ?? []) {
            items[row.item_id] = {
              name: row.item_name,
              price: Math.round(row.price),
              category: row.category ?? "",
            };
          }
          console.log(
            `[get_menu_items] Found ${Object.keys(items).length} items for ${restaurantId}`
          );
          return { items, count: Object.keys(items).length, restaurant_id: restaurantId };
        } catch (e) {
          console.error("[get_menu_items] error:", e);
          return { items: {}, count: 0, error: String(e) };
        }
      },
    }),

    create_order: tool({
      description:
        "Start a brand new order, clearing any existing draft. Use ONLY when the customer explicitly says 'new order', 'start fresh', 'restart order', etc. Do NOT call this when the customer just wants to add items — add_item_to_order handles that automatically.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const session = getSession(sessionId);
        if (!session) return { success: false, message: "Session not found." };

        const order_id = nextOrderId();
        session.current_order = {
          order_id,
          restaurant_id: session.restaurant_id,
          items: [],
          status: "draft",
          created_at: new Date().toISOString(),
          customer_phone: "",
          special_instructions: "",
        };
        setSession(sessionId, session);
        saveVoiceOrderToDB(sessionId, order_id, session.restaurant_id, {
          status: "draft",
          language: session.language,
        }).catch(console.error);
        return { success: true, order_id, message: `New order ${order_id} started.`, action: "create" };
      },
    }),

    add_item_to_order: tool({
      description:
        "Add a menu item to the customer's order. Call this whenever the customer mentions wanting any food or drink item, even casually. Pass the item name as close to the menu name as possible. Handles order creation automatically if no order exists yet. Examples: 'I want butter chicken', 'give me 2 naan', 'add paneer tikka', 'ek biryani dedo'.",
      inputSchema: zodSchema(
        z.object({
          item_name: z
            .string()
            .describe("Name of the menu item to add (use the closest matching menu item name)"),
          quantity: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Number of units to add. Default 1."),
          size: z
            .string()
            .optional()
            .describe("Size variant if applicable (e.g. small, medium, large, half, full)"),
          spice_level: z
            .enum(["mild", "medium", "hot"])
            .optional()
            .describe("Spice preference if mentioned"),
          special_instructions: z
            .string()
            .optional()
            .describe("Any special requests like 'extra cheese', 'no onion', 'less oil', etc."),
        })
      ),
      execute: async ({
        item_name,
        quantity,
        size,
        spice_level,
        special_instructions,
      }: {
        item_name: string;
        quantity: number;
        size?: string;
        spice_level?: "mild" | "medium" | "hot";
        special_instructions?: string;
      }) => {
        const order = ensureOrder(sessionId);
        const session = getSession(sessionId)!;

        // Fetch menu for this restaurant
        const sb = getSupabase();
        const { data: menuData } = await sb
          .from("menu")
          .select("item_id,item_name,category,price")
          .eq("restaurant_id", session.restaurant_id);

        const menu = menuData ?? [];
        const searchName = item_name.toLowerCase().trim();

        // Fuzzy match: substring in both directions
        let matchedItem: (typeof menu)[0] | null = null;
        for (const item of menu) {
          const menuName = item.item_name.toLowerCase().trim();
          if (searchName.includes(menuName) || menuName.includes(searchName)) {
            matchedItem = item;
            break;
          }
        }
        // Word-level overlap fallback
        if (!matchedItem) {
          const searchWords = new Set(searchName.split(/\s+/));
          let best = 0;
          for (const item of menu) {
            const menuWords = new Set(item.item_name.toLowerCase().split(/\s+/));
            const overlap = [...searchWords].filter((w) => menuWords.has(w)).length;
            if (overlap > best) {
              best = overlap;
              matchedItem = item;
            }
          }
        }

        if (!matchedItem) {
          const available = menu
            .slice(0, 15)
            .map((i) => i.item_name)
            .join(", ");
          return {
            success: false,
            message: `'${item_name}' is not on the menu. Available items: ${available || "No items available"}`,
          };
        }

        const unit_price = Math.round(matchedItem.price);
        const total_price = unit_price * quantity;

        const newItem: OrderItem = {
          item_id: matchedItem.item_id,
          item_name: matchedItem.item_name,
          quantity,
          unit_price,
          total_price,
          size: size ?? null,
          spice_level: spice_level ?? null,
          special_instructions: special_instructions ?? null,
          category: matchedItem.category ?? "",
        };

        order.items.push(newItem);
        const new_total = order.items.reduce((s, i) => s + i.total_price, 0);

        setSession(sessionId, session);
        saveVoiceOrderToDB(sessionId, order.order_id, session.restaurant_id, {
          totalAmount: new_total,
          status: "draft",
        }).catch(console.error);

        return {
          success: true,
          message: `${quantity}x ${matchedItem.item_name} added. Total: Rs.${new_total}`,
          item_added: { name: matchedItem.item_name, quantity, unit_price },
          order_total: new_total,
          item_count: order.items.length,
          action: "add_item",
        };
      },
    }),

    get_order_summary: tool({
      description:
        "Show the current order with all items, quantities, prices and total. Call when the customer asks to see their order, review what they ordered, or wants to know the total. Examples: 'show my order', 'what did I order', 'kitna hua', 'total batao', 'order summary'.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const session = getSession(sessionId);
        const order = session?.current_order;
        if (!order || order.items.length === 0) {
          return {
            success: true,
            has_order: Boolean(order?.order_id),
            message: "Your order is empty. What would you like to add?",
            total: 0,
          };
        }
        const lines = order.items.map(
          (item, i) =>
            `${i + 1}. ${item.quantity}x ${item.item_name} - Rs.${item.total_price}`
        );
        const total = order.items.reduce((s, i) => s + i.total_price, 0);
        const summary = lines.join("\n") + `\n\nTotal: Rs.${total}`;
        return {
          success: true,
          has_order: true,
          order_id: order.order_id,
          message: summary,
          items: order.items.map((i) => ({
            item_name: i.item_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total: i.total_price,
          })),
          total,
        };
      },
    }),

    modify_order_item: tool({
      description:
        "Change the quantity, size, or spice level of an item already in the order. Use 1-based item number. Call get_order_summary first if you need to find the item number.",
      inputSchema: zodSchema(
        z.object({
          item_index: z
            .number()
            .int()
            .min(1)
            .describe("1-based position of the item in the order (1 for first, 2 for second, etc.)"),
          quantity: z.number().int().min(1).optional().describe("New quantity for the item"),
          size: z.string().optional().describe("New size variant"),
          spice_level: z
            .enum(["mild", "medium", "hot"])
            .optional()
            .describe("New spice level"),
        })
      ),
      execute: async ({
        item_index,
        quantity,
        size,
        spice_level,
      }: {
        item_index: number;
        quantity?: number;
        size?: string;
        spice_level?: "mild" | "medium" | "hot";
      }) => {
        const session = getSession(sessionId);
        const order = session?.current_order;
        if (!order) return { success: false, message: "No active order found." };

        const idx = item_index - 1;
        if (idx < 0 || idx >= order.items.length) {
          return {
            success: false,
            message: `Invalid item number. Order has ${order.items.length} items.`,
          };
        }
        const item = order.items[idx];
        if (quantity !== undefined) {
          item.quantity = quantity;
          item.total_price = item.unit_price * quantity;
        }
        if (size) item.size = size;
        if (spice_level) item.spice_level = spice_level;

        const new_total = order.items.reduce((s, i) => s + i.total_price, 0);
        setSession(sessionId, session!);
        saveVoiceOrderToDB(sessionId, order.order_id, session!.restaurant_id, {
          totalAmount: new_total,
          status: "draft",
        }).catch(console.error);

        return {
          success: true,
          message: `Item ${item_index} (${item.item_name}) updated. Total: Rs.${new_total}`,
          order_total: new_total,
          action: "modify",
        };
      },
    }),

    remove_item_from_order: tool({
      description:
        "Remove an item from the order entirely. Use 1-based item number. Call get_order_summary first if you need to confirm which item number to remove.",
      inputSchema: zodSchema(
        z.object({
          item_index: z
            .number()
            .int()
            .min(1)
            .describe("1-based position of the item to remove from the order"),
        })
      ),
      execute: async ({ item_index }: { item_index: number }) => {
        const session = getSession(sessionId);
        const order = session?.current_order;
        if (!order) return { success: false, message: "No active order found." };

        const idx = item_index - 1;
        if (idx < 0 || idx >= order.items.length) {
          return {
            success: false,
            message: `Invalid item number. Order has ${order.items.length} items.`,
          };
        }
        const [removed] = order.items.splice(idx, 1);
        const new_total = order.items.reduce((s, i) => s + i.total_price, 0);
        setSession(sessionId, session!);
        saveVoiceOrderToDB(sessionId, order.order_id, session!.restaurant_id, {
          totalAmount: new_total,
          status: "draft",
        }).catch(console.error);

        return {
          success: true,
          message: `${removed.item_name} removed. Total: Rs.${new_total}`,
          order_total: new_total,
          action: "remove",
        };
      },
    }),

    cancel_order: tool({
      description:
        "Cancel and discard the entire current order. Use when the customer wants to cancel everything and start over or leave. Examples: 'cancel my order', 'I don't want anything', 'cancel karo', 'sab hatao'.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const session = getSession(sessionId);
        const order = session?.current_order;
        if (!order) return { success: false, message: "No order to cancel." };

        const order_id = order.order_id;
        saveVoiceOrderToDB(sessionId, order_id, session!.restaurant_id, {
          totalAmount: 0,
          status: "cancelled",
        }).catch(console.error);

        session!.current_order = null;
        setSession(sessionId, session!);
        return { success: true, message: `Order ${order_id} cancelled.`, action: "cancel" };
      },
    }),

    confirm_order: tool({
      description:
        "Finalize and place the order. This saves the order to the database and cannot be undone. Call ONLY when the customer explicitly confirms they are done and want to place the order. Examples: 'confirm order', 'place my order', 'done', 'ho gaya', 'order place karo', 'that's all, confirm it'. Optionally collect phone number or table number. Do NOT call this tool more than once — if the order was already confirmed, tell the customer it's done.",
      inputSchema: zodSchema(
        z.object({
          customer_phone: z
            .string()
            .optional()
            .describe("Customer's phone number if provided"),
          table_number: z.string().optional().describe("Table number if dining in"),
        })
      ),
      execute: async ({
        customer_phone,
        table_number,
      }: {
        customer_phone?: string;
        table_number?: string;
      }) => {
        const session = getSession(sessionId);
        const order = session?.current_order;

        // Order already confirmed or no order exists
        if (!order) {
          return {
            success: false,
            already_confirmed: true,
            message: "Order has already been confirmed and placed. There is nothing more to confirm.",
          };
        }

        if (order.items.length === 0) {
          return { success: false, message: "Order is empty. Please add items first." };
        }

        if (customer_phone) order.customer_phone = customer_phone;

        const items = order.items;
        const subtotal = items.reduce((s, i) => s + i.total_price, 0);
        const num_items = items.reduce((s, i) => s + i.quantity, 0);
        const cgst = Math.round(subtotal * 0.025 * 100) / 100;
        const sgst = Math.round(subtotal * 0.025 * 100) / 100;
        const tax_amount = cgst + sgst;
        const total_amount = subtotal + tax_amount;

        const order_id = order.order_id;
        const restaurant_id = session!.restaurant_id;
        const bill_number = nextBillNumber(restaurant_id);
        const order_datetime = new Date().toISOString();

        let db_saved = false;
        let db_error = "";

        try {
          const sb = getSupabase();

          // 1. Save to voice_order_items
          await sb.from("voice_order_items").delete().eq("order_id", order_id);
          const itemRows = items.map((item) => ({
            order_id,
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            size: item.size ?? null,
            spice_level: item.spice_level ?? null,
            special_instructions: item.special_instructions ?? null,
            category: item.category,
          }));
          await sb.from("voice_order_items").insert(itemRows);

          // 2. Update voice_orders status to confirmed
          await saveVoiceOrderToDB(sessionId, order_id, restaurant_id, {
            customerPhone: order.customer_phone,
            totalAmount: total_amount,
            status: "confirmed",
          });

          // 3. Save to legacy "order" table for analytics
          const legacyRows = await Promise.all(
            items.map(async (item) => ({
              order_item_id: await nextOrderItemId(),
              order_id,
              bill_number,
              restaurant_id,
              order_type: "Voice",
              order_source: "AI Agent",
              customer_phone: order.customer_phone ? parseInt(order.customer_phone.replace(/\D/g, ''), 10) || null : null,
              table_number: table_number ?? null,
              item_id: item.item_id,
              item_name: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              line_total: item.total_price,
              num_items,
              subtotal,
              cgst,
              sgst,
              tax_amount,
              total_amount,
              payment_status: "pending",
              order_status: "confirmed",
              special_instructions:
                item.special_instructions ?? order.special_instructions ?? null,
              order_datetime,
            }))
          );
          await sb.from("order").insert(legacyRows);

          db_saved = true;
          order.status = "confirmed";
          session!.current_order = null; // clear after confirm
          setSession(sessionId, session!);
        } catch (e) {
          console.error("[confirm_order] DB error:", e);
          db_error = String(e);
        }

        return {
          success: true,
          message: `Order ${order_id} confirmed! Total: Rs.${total_amount} (incl. GST). ${
            db_saved ? "Saved successfully." : "DB error: " + db_error
          }`,
          order_id,
          bill_number,
          total_amount,
          db_saved,
          action: "confirm",
        };
      },
    }),
  };
}

// ── Update conversation log in DB ─────────────────────────────────────────────
export async function updateConversationLog(
  sessionId: string,
  entry: {
    timestamp: string;
    customer_message: string;
    ai_response: string;
    tool_calls: { tool: string; args: Record<string, unknown> }[];
  }
) {
  try {
    const session = getSession(sessionId);
    // Find order_id: first try current order, then last DB order
    let orderId: string | null = session?.current_order?.order_id ?? null;

    const sb = getSupabase();
    if (!orderId) {
      const { data } = await sb
        .from("voice_orders")
        .select("order_id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      orderId = (data?.order_id as string | undefined) ?? null;
    }
    if (!orderId) return;

    const { data: existing } = await sb
      .from("voice_orders")
      .select("conversation_log")
      .eq("order_id", orderId)
      .maybeSingle();

    let log: unknown[] = [];
    if (existing?.conversation_log) {
      log =
        typeof existing.conversation_log === "string"
          ? JSON.parse(existing.conversation_log)
          : existing.conversation_log;
    }
    log.push(entry);

    await sb
      .from("voice_orders")
      .update({
        conversation_log: JSON.stringify(log),
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);
  } catch (e) {
    console.error("[updateConversationLog] error:", e);
  }
}
