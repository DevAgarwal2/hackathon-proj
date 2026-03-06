"""
AI Agent with Tool Calling - Restaurant Voice Ordering System
Session is always tied to a specific restaurant_id.
Uses SarvamAI SDK for STT, LLM (with tool calling), TTS.
Persists sessions to voice_orders + voice_order_items tables in Supabase.
Logs every conversation turn (customer query, AI response, tool calls).
"""
import os
import json
import base64
import threading
from io import BytesIO
from typing import Dict, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from dotenv import load_dotenv
from sarvamai import SarvamAI
from supabase import create_client, Client

load_dotenv()

router = APIRouter(prefix="/api/ai", tags=["AI Agent"])

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
client = SarvamAI(api_subscription_key=SARVAM_API_KEY)

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

STT_MODEL = "saaras:v3"
TTS_MODEL = "bulbul:v3"
LLM_MODEL = "sarvam-105b"

# In-memory sessions keyed by session_id
active_sessions: Dict[str, Dict] = {}

# Thread-safe order_item_id counter (for legacy "order" table)
_oid_lock = threading.Lock()
_oid_counter: Optional[int] = None


def _next_order_item_id() -> int:
    global _oid_counter
    with _oid_lock:
        if _oid_counter is None:
            try:
                row = supabase.table("order").select("order_item_id").order("order_item_id", desc=True).limit(1).execute()
                _oid_counter = (row.data[0]["order_item_id"] if row.data else 0)
            except Exception:
                _oid_counter = 1000
        _oid_counter += 1
        return _oid_counter


def _next_order_id() -> str:
    return f"VORD{datetime.now().strftime('%Y%m%d%H%M%S')}"


def _next_bill_number(restaurant_id: str) -> str:
    ts = datetime.now().strftime('%Y%m%d%H%M%S')
    return f"BILL-{restaurant_id}-V{ts}"


# ============ DB HELPERS FOR voice_orders + voice_order_items ============

def _save_voice_order_to_db(session_id: str, order_id: str, restaurant_id: str,
                            customer_phone: str = "", total_amount: float = 0,
                            status: str = "draft", language: str = "hi-IN"):
    """Create or update a row in voice_orders table."""
    try:
        # Check if order already exists
        existing = supabase.table("voice_orders").select("id").eq("order_id", order_id).execute()
        now = datetime.now().isoformat()

        if existing.data:
            # Update existing
            update_data = {
                "total_amount": total_amount,
                "status": status,
                "customer_phone": customer_phone or "",
                "updated_at": now,
            }
            if status == "confirmed":
                update_data["confirmed_at"] = now
            supabase.table("voice_orders").update(update_data).eq("order_id", order_id).execute()
        else:
            # Insert new
            supabase.table("voice_orders").insert({
                "order_id": order_id,
                "restaurant_id": restaurant_id,
                "session_id": session_id,
                "customer_phone": customer_phone or "",
                "total_amount": total_amount,
                "status": status,
                "language": language,
                "conversation_log": json.dumps([]),
            }).execute()
    except Exception as e:
        print(f"Error saving voice_order: {e}")


def _save_voice_order_items_to_db(order_id: str, items: List[Dict]):
    """Save items to voice_order_items table."""
    try:
        # Delete existing items for this order (in case of re-confirm)
        supabase.table("voice_order_items").delete().eq("order_id", order_id).execute()
        if not items:
            return
        rows = []
        for item in items:
            rows.append({
                "order_id": order_id,
                "item_id": item.get("item_id", ""),
                "item_name": item["item_name"],
                "quantity": int(item.get("quantity", 1)),
                "unit_price": float(item.get("unit_price", 0)),
                "total_price": float(item.get("total_price", 0)),
                "size": item.get("size"),
                "spice_level": item.get("spice_level"),
                "special_instructions": item.get("special_instructions"),
                "category": item.get("category", ""),
            })
        supabase.table("voice_order_items").insert(rows).execute()
    except Exception as e:
        print(f"Error saving voice_order_items: {e}")


def _update_conversation_log(order_id: str, log_entry: Dict):
    """Append a conversation log entry to voice_orders.conversation_log."""
    try:
        existing = supabase.table("voice_orders").select("conversation_log").eq("order_id", order_id).execute()
        if existing.data:
            current_log = existing.data[0].get("conversation_log") or []
            if isinstance(current_log, str):
                current_log = json.loads(current_log)
            current_log.append(log_entry)
            supabase.table("voice_orders").update({
                "conversation_log": json.dumps(current_log),
                "updated_at": datetime.now().isoformat(),
            }).eq("order_id", order_id).execute()
    except Exception as e:
        print(f"Error updating conversation log: {e}")


# ============ TOOL FUNCTIONS ============

def get_menu_items(session_id: str, category: Optional[str] = None) -> Dict:
    """Get this restaurant's menu from Supabase."""
    restaurant_id = "R001"
    if session_id in active_sessions:
        restaurant_id = active_sessions[session_id].get("restaurant_id", "R001")
    # Sanitize category: treat string "None", "null", "undefined", empty string as no filter
    if isinstance(category, str) and category.strip().lower() in ("none", "null", "undefined", ""):
        category = None
    print(f"[get_menu_items] session={session_id}, restaurant={restaurant_id}, category={category}")
    try:
        query = supabase.table("menu").select("item_id,item_name,category,price").eq("restaurant_id", restaurant_id)
        if category:
            query = query.ilike("category", f"%{category}%")
        result = query.execute()
        items = {}
        for row in result.data:
            items[row["item_id"]] = {
                "name": row["item_name"],
                "price": int(row["price"]),
                "category": row.get("category", ""),
            }
        print(f"[get_menu_items] Found {len(items)} items for restaurant {restaurant_id}")
        return {"items": items, "count": len(items), "restaurant_id": restaurant_id}
    except Exception as e:
        print(f"Error fetching menu: {e}")
        import traceback; traceback.print_exc()
        return {"items": {}, "count": 0, "error": str(e)}


def get_current_order(session_id: str) -> Dict:
    """Get the in-progress order for this session.
    Returns shape matching frontend VoiceCurrentOrder type.
    """
    if session_id not in active_sessions:
        return {"order_id": None, "items": [], "total": 0, "subtotal": 0, "status": "no_order"}
    order = active_sessions[session_id].get("current_order") or {}
    raw_items = order.get("items", [])
    # Map items to match frontend VoiceOrderItem type
    items = []
    for item in raw_items:
        items.append({
            "item_name": item.get("item_name", ""),
            "quantity": item.get("quantity", 1),
            "unit_price": item.get("unit_price", 0),
            "total": item.get("total_price", 0),
            "notes": item.get("special_instructions", ""),
        })
    subtotal = sum(item["total"] for item in items)
    return {
        "order_id": order.get("order_id"),
        "restaurant_id": active_sessions[session_id].get("restaurant_id", "R001"),
        "items": items,
        "subtotal": subtotal,
        "total": subtotal,
        "item_count": len(items),
        "status": order.get("status", "draft"),
    }


def _ensure_order(session_id: str):
    """Create an order in-session if one doesn't exist yet."""
    if session_id not in active_sessions:
        active_sessions[session_id] = {"restaurant_id": "R001"}
    if not active_sessions[session_id].get("current_order"):
        order_id = _next_order_id()
        restaurant_id = active_sessions[session_id].get("restaurant_id", "R001")
        active_sessions[session_id]["current_order"] = {
            "order_id": order_id,
            "restaurant_id": restaurant_id,
            "items": [],
            "status": "draft",
            "created_at": datetime.now().isoformat(),
            "customer_phone": "",
            "special_instructions": "",
        }
        # Create voice_orders row in DB
        language = active_sessions[session_id].get("language", "hi-IN")
        _save_voice_order_to_db(session_id, order_id, restaurant_id,
                                status="draft", language=language)


def create_order(session_id: str) -> Dict:
    """Explicitly start a new order (clears any existing draft)."""
    if session_id not in active_sessions:
        active_sessions[session_id] = {"restaurant_id": "R001"}
    order_id = _next_order_id()
    restaurant_id = active_sessions[session_id].get("restaurant_id", "R001")
    active_sessions[session_id]["current_order"] = {
        "order_id": order_id,
        "restaurant_id": restaurant_id,
        "items": [],
        "status": "draft",
        "created_at": datetime.now().isoformat(),
        "customer_phone": "",
        "special_instructions": "",
    }
    language = active_sessions[session_id].get("language", "hi-IN")
    _save_voice_order_to_db(session_id, order_id, restaurant_id,
                            status="draft", language=language)
    return {"success": True, "order_id": order_id, "message": f"New order {order_id} started.", "action": "create"}


def add_item_to_order(session_id: str, item_name: str, quantity: int = 1,
                      size: Optional[str] = None, spice_level: Optional[str] = None,
                      special_instructions: Optional[str] = None) -> Dict:
    """Add an item to the current order (auto-creates order if needed)."""
    _ensure_order(session_id)
    order = active_sessions[session_id]["current_order"]

    menu_result = get_menu_items(session_id)
    menu = menu_result["items"]

    # Fuzzy match: check substring in both directions
    matched_item = None
    item_key = None
    search_name = item_name.lower().strip()
    for key, item in menu.items():
        menu_name = item["name"].lower().strip()
        if search_name in menu_name or menu_name in search_name:
            matched_item = item
            item_key = key
            break
    # Also try word-level match if no substring match
    if not matched_item:
        search_words = set(search_name.split())
        best_score = 0
        for key, item in menu.items():
            menu_words = set(item["name"].lower().split())
            overlap = len(search_words & menu_words)
            if overlap > best_score and overlap > 0:
                best_score = overlap
                matched_item = item
                item_key = key

    if not matched_item:
        available = ", ".join(item["name"] for item in list(menu.values())[:15]) if menu else "No items available"
        return {"success": False, "message": f"'{item_name}' is not on the menu. Available items: {available}"}

    unit_price = matched_item["price"]
    total_price = unit_price * quantity

    order["items"].append({
        "item_id": item_key,
        "item_name": matched_item["name"],
        "quantity": quantity,
        "unit_price": unit_price,
        "total_price": total_price,
        "size": size,
        "spice_level": spice_level,
        "special_instructions": special_instructions,
        "category": matched_item.get("category", ""),
    })

    new_total = sum(i["total_price"] for i in order["items"])

    # Update voice_orders DB with new total
    _save_voice_order_to_db(session_id, order["order_id"],
                            order.get("restaurant_id", "R001"),
                            total_amount=new_total, status="draft")

    return {
        "success": True,
        "message": f"{quantity}x {matched_item['name']} added. Total: Rs.{new_total}",
        "item_added": {"name": matched_item["name"], "quantity": quantity, "unit_price": unit_price},
        "order_total": new_total,
        "item_count": len(order["items"]),
        "action": "add_item",
    }


def modify_order_item(session_id: str, item_index: int, quantity: Optional[int] = None,
                      size: Optional[str] = None, spice_level: Optional[str] = None) -> Dict:
    """Modify an item (1-based index)."""
    if session_id not in active_sessions or not active_sessions[session_id].get("current_order"):
        return {"success": False, "message": "No active order found."}
    items = active_sessions[session_id]["current_order"]["items"]
    idx = item_index - 1
    if idx < 0 or idx >= len(items):
        return {"success": False, "message": f"Invalid item number. Order has {len(items)} items."}
    item = items[idx]
    if quantity is not None:
        item["quantity"] = quantity
        item["total_price"] = item["unit_price"] * quantity
    if size:
        item["size"] = size
    if spice_level:
        item["spice_level"] = spice_level
    new_total = sum(i["total_price"] for i in items)
    order = active_sessions[session_id]["current_order"]
    _save_voice_order_to_db(session_id, order["order_id"],
                            order.get("restaurant_id", "R001"),
                            total_amount=new_total, status="draft")
    return {"success": True, "message": f"Item {item_index} ({item['item_name']}) updated. Total: Rs.{new_total}", "order_total": new_total, "action": "modify"}


def remove_item_from_order(session_id: str, item_index: int) -> Dict:
    """Remove an item (1-based index)."""
    if session_id not in active_sessions or not active_sessions[session_id].get("current_order"):
        return {"success": False, "message": "No active order found."}
    items = active_sessions[session_id]["current_order"]["items"]
    idx = item_index - 1
    if idx < 0 or idx >= len(items):
        return {"success": False, "message": f"Invalid item number. Order has {len(items)} items."}
    removed = items.pop(idx)
    new_total = sum(i["total_price"] for i in items)
    order = active_sessions[session_id]["current_order"]
    _save_voice_order_to_db(session_id, order["order_id"],
                            order.get("restaurant_id", "R001"),
                            total_amount=new_total, status="draft")
    return {"success": True, "message": f"{removed['item_name']} removed. Total: Rs.{new_total}", "order_total": new_total, "action": "remove"}


def cancel_order(session_id: str) -> Dict:
    """Cancel the current order."""
    if session_id not in active_sessions or not active_sessions[session_id].get("current_order"):
        return {"success": False, "message": "No order to cancel."}
    order = active_sessions[session_id]["current_order"]
    order_id = order.get("order_id", "?")
    restaurant_id = order.get("restaurant_id", "R001")
    # Update DB status
    _save_voice_order_to_db(session_id, order_id, restaurant_id,
                            total_amount=0, status="cancelled")
    active_sessions[session_id]["current_order"] = None
    return {"success": True, "message": f"Order {order_id} cancelled.", "action": "cancel"}


def get_order_summary(session_id: str) -> Dict:
    """Return a human-readable order summary."""
    info = get_current_order(session_id)
    if info["status"] == "no_order" or not info.get("items"):
        return {"success": True, "has_order": bool(info.get("order_id")),
                "message": "Your order is empty. What would you like to add?", "total": 0}
    lines = []
    for i, item in enumerate(info["items"], 1):
        line = f"{i}. {item['quantity']}x {item['item_name']} - Rs.{item['total']}"
        lines.append(line)
    summary = "\n".join(lines) + f"\n\nTotal: Rs.{info['total']}"
    return {"success": True, "has_order": True, "order_id": info["order_id"],
            "message": summary, "items": info["items"], "total": info["total"]}


def confirm_order(session_id: str, customer_phone: Optional[str] = None,
                  table_number: Optional[str] = None) -> Dict:
    """Confirm and save order to both voice_order_items and legacy order table."""
    if session_id not in active_sessions or not active_sessions[session_id].get("current_order"):
        return {"success": False, "message": "No order to confirm."}
    order = active_sessions[session_id]["current_order"]
    if not order.get("items"):
        return {"success": False, "message": "Order is empty. Please add items first."}

    if customer_phone:
        order["customer_phone"] = customer_phone

    items = order["items"]
    subtotal = sum(i["total_price"] for i in items)
    num_items = sum(i["quantity"] for i in items)
    cgst = round(subtotal * 0.025, 2)
    sgst = round(subtotal * 0.025, 2)
    tax_amount = cgst + sgst
    total_amount = subtotal + tax_amount

    restaurant_id = active_sessions[session_id].get("restaurant_id", "R001")
    order_id = order["order_id"]
    bill_number = _next_bill_number(restaurant_id)
    order_datetime = datetime.now().isoformat()

    db_saved = False
    db_error = ""
    try:
        # 1. Save to voice_order_items table
        _save_voice_order_items_to_db(order_id, items)

        # 2. Update voice_orders table status
        _save_voice_order_to_db(session_id, order_id, restaurant_id,
                                customer_phone=order.get("customer_phone", ""),
                                total_amount=total_amount, status="confirmed")

        # 3. Also save to legacy "order" table for analytics
        rows = []
        for item in items:
            rows.append({
                "order_item_id": _next_order_item_id(),
                "order_id": order_id,
                "bill_number": bill_number,
                "restaurant_id": restaurant_id,
                "order_type": "Voice",
                "order_source": "AI Agent",
                "customer_phone": order.get("customer_phone") or None,
                "table_number": table_number or None,
                "item_id": item.get("item_id", ""),
                "item_name": item["item_name"],
                "quantity": int(item["quantity"]),
                "unit_price": int(item["unit_price"]),
                "line_total": int(item["total_price"]),
                "num_items": int(num_items),
                "subtotal": int(subtotal),
                "cgst": cgst,
                "sgst": sgst,
                "tax_amount": tax_amount,
                "total_amount": total_amount,
                "payment_status": "pending",
                "order_status": "confirmed",
                "special_instructions": item.get("special_instructions") or order.get("special_instructions") or None,
                "order_datetime": order_datetime,
            })
        supabase.table("order").insert(rows).execute()
        db_saved = True
        order["status"] = "confirmed"
        active_sessions[session_id]["current_order"] = None  # clear after confirm
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        import traceback; traceback.print_exc()
        db_error = str(e)

    return {
        "success": True,
        "message": f"Order {order_id} confirmed! Total: Rs.{total_amount} (incl. GST). {'Saved successfully.' if db_saved else 'DB error: ' + db_error}",
        "order_id": order_id,
        "bill_number": bill_number,
        "total_amount": total_amount,
        "db_saved": db_saved,
        "action": "confirm",
    }


# ============ TOOL DEFINITIONS ============

TOOLS_DEF = [
    {
        "name": "get_menu_items",
        "description": "Fetch the restaurant's menu. Use when the customer asks to see the menu, asks what's available, asks about prices, or wants to know what food/drinks are offered. Optionally filter by category like Starter, Main Course, Beverage, Dessert, Biryani, Breads, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Optional category filter e.g. Starter, Main Course, Beverage, Dessert, Biryani, Breads, Sides"}
            }
        },
        "func": get_menu_items,
    },
    {
        "name": "create_order",
        "description": "Start a brand new order, clearing any existing draft. Use ONLY when the customer explicitly says 'new order', 'start fresh', 'restart order', etc. Do NOT call this when the customer just wants to add items — add_item_to_order handles that automatically.",
        "parameters": {"type": "object", "properties": {}},
        "func": create_order,
    },
    {
        "name": "add_item_to_order",
        "description": "Add a menu item to the customer's order. Call this whenever the customer mentions wanting any food or drink item, even casually. Pass the item name as close to the menu name as possible. Handles order creation automatically if no order exists yet. Examples: 'I want butter chicken', 'give me 2 naan', 'add paneer tikka', 'ek biryani dedo'.",
        "parameters": {
            "type": "object",
            "properties": {
                "item_name": {"type": "string", "description": "Name of the menu item to add (use the closest matching menu item name)"},
                "quantity": {"type": "integer", "description": "Number of units to add. Default 1.", "default": 1},
                "size": {"type": "string", "description": "Size variant if applicable (e.g. small, medium, large, half, full)"},
                "spice_level": {"type": "string", "description": "Spice preference if mentioned", "enum": ["mild", "medium", "hot"]},
                "special_instructions": {"type": "string", "description": "Any special requests like 'extra cheese', 'no onion', 'less oil', etc."}
            },
            "required": ["item_name"]
        },
        "func": add_item_to_order,
    },
    {
        "name": "get_order_summary",
        "description": "Show the current order with all items, quantities, prices and total. Call when the customer asks to see their order, review what they ordered, or wants to know the total. Examples: 'show my order', 'what did I order', 'kitna hua', 'total batao', 'order summary'.",
        "parameters": {"type": "object", "properties": {}},
        "func": get_order_summary,
    },
    {
        "name": "modify_order_item",
        "description": "Change the quantity, size, or spice level of an item already in the order. Use 1-based item number (first item is 1, second is 2, etc.). Call get_order_summary first if you need to find the item number. Examples: 'change naan to 3', 'make the biryani spicy', 'increase quantity of first item'.",
        "parameters": {
            "type": "object",
            "properties": {
                "item_index": {"type": "integer", "description": "1-based position of the item in the order (1 for first item, 2 for second, etc.)"},
                "quantity": {"type": "integer", "description": "New quantity for the item"},
                "size": {"type": "string", "description": "New size variant"},
                "spice_level": {"type": "string", "description": "New spice level", "enum": ["mild", "medium", "hot"]}
            },
            "required": ["item_index"]
        },
        "func": modify_order_item,
    },
    {
        "name": "remove_item_from_order",
        "description": "Remove an item from the order entirely. Use 1-based item number. Call get_order_summary first if you need to confirm which item number to remove. Examples: 'remove the naan', 'hatao paneer tikka', 'delete item 2', 'I don't want the biryani anymore'.",
        "parameters": {
            "type": "object",
            "properties": {
                "item_index": {"type": "integer", "description": "1-based position of the item to remove from the order"}
            },
            "required": ["item_index"]
        },
        "func": remove_item_from_order,
    },
    {
        "name": "cancel_order",
        "description": "Cancel and discard the entire current order. Use when the customer wants to cancel everything and start over or leave. Examples: 'cancel my order', 'I don't want anything', 'cancel karo', 'sab hatao'.",
        "parameters": {"type": "object", "properties": {}},
        "func": cancel_order,
    },
    {
        "name": "confirm_order",
        "description": "Finalize and place the order. This saves the order to the database and cannot be undone. Call ONLY when the customer explicitly confirms they are done and want to place the order. Examples: 'confirm order', 'place my order', 'done', 'ho gaya', 'order place karo', 'that's all, confirm it'. Optionally collect phone number or table number.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_phone": {"type": "string", "description": "Customer's phone number if provided"},
                "table_number": {"type": "string", "description": "Table number if dining in"}
            }
        },
        "func": confirm_order,
    },
]

# Tools spec for LLM (without func)
TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["parameters"],
        }
    }
    for t in TOOLS_DEF
]

TOOLS_MAP = {t["name"]: t["func"] for t in TOOLS_DEF}

SESSION_TOOLS = {
    "get_menu_items", "create_order", "add_item_to_order", "get_order_summary",
    "modify_order_item", "remove_item_from_order", "cancel_order", "confirm_order",
}


# ============ AI AGENT CLASS ============

class AIAgent:
    def __init__(self, session_id: str, restaurant_id: str, restaurant_name: str):
        self.session_id = session_id
        self.restaurant_id = restaurant_id
        self.restaurant_name = restaurant_name
        self.conversation_history: List[Dict] = []

    def get_system_prompt(self) -> str:
        return f"""You are an intelligent voice ordering assistant for **{self.restaurant_name}** (Restaurant ID: {self.restaurant_id}).

Your job is to help customers place food orders through natural, friendly conversation. You can understand and respond in multiple languages — English, Hindi, Hinglish (Hindi + English mix), Tamil, Telugu, Kannada, Marathi, Bengali — depending on what the customer speaks.

## PERSONALITY
- Be warm, helpful, and efficient — like a friendly waiter
- Keep responses SHORT (1-2 sentences max)
- Be conversational but not overly chatty
- If the customer speaks in Hindi/Hinglish, respond in Hinglish
- If the customer speaks in English, respond in English
- Match the customer's language naturally

## TOOL USAGE RULES — FOLLOW STRICTLY

You have 8 tools. ALWAYS use the right tool for every request. NEVER answer a food/order question without calling the appropriate tool first.

### When to call each tool:

1. **get_menu_items** — Customer asks about the menu, what's available, prices, categories, or options.
   - Triggers: "menu dikhao", "kya hai", "what do you have", "show menu", "prices", "what items", "any starters?", "what desserts", "beverages list"
   - Pass category filter when they ask about a specific type (e.g. category="Starter" if they say "any starters?")

2. **add_item_to_order** — Customer mentions wanting ANY food or drink item.
   - Triggers: "I want...", "give me...", "add...", "ek butter chicken", "2 naan chahiye", "biryani dedo", names of any food item
   - Call IMMEDIATELY when food is mentioned — do NOT call get_menu_items first
   - Parse quantity from the message (ek/one=1, do/two=2, teen/three=3, char/four=4, paanch/five=5)
   - If the customer mentions multiple items in one message, call add_item_to_order SEPARATELY for EACH item

3. **get_order_summary** — Customer wants to see what they've ordered.
   - Triggers: "mera order", "kya order kiya", "show order", "order dikhao", "total kitna", "total batao", "what's in my order", "review order"

4. **modify_order_item** — Customer wants to change quantity/size/spice of an existing item.
   - Triggers: "change to 3", "make it spicy", "quantity increase karo", "update item", "naan ki quantity badao"
   - If you need the item number, call get_order_summary first to show the order, then modify

5. **remove_item_from_order** — Customer wants to remove a specific item.
   - Triggers: "remove naan", "hatao", "delete", "don't want the biryani", "nahi chahiye"
   - If you need the item number, call get_order_summary first, then remove

6. **cancel_order** — Customer wants to cancel the ENTIRE order.
   - Triggers: "cancel order", "cancel karo", "sab hatao", "I don't want anything", "cancel everything"
   - Only for full cancellation — for removing one item, use remove_item_from_order

7. **confirm_order** — Customer is done and wants to place/finalize the order.
   - Triggers: "confirm", "place order", "done", "ho gaya", "that's all", "bas itna hi", "order karo", "finalize"
   - Before confirming, briefly read back the order (call get_order_summary) if you haven't shown it recently
   - Ask for table number if not provided (for dine-in)

8. **create_order** — Customer explicitly wants to start a fresh/new order.
   - Triggers: "new order", "start fresh", "naya order", "restart"
   - Do NOT call this when customer just wants to add items (add_item_to_order auto-creates an order)

## MULTI-ITEM ORDERS
If the customer orders multiple items at once (e.g. "I want 2 butter chicken, 1 naan, and 1 lassi"), call add_item_to_order for EACH item separately.

## UPSELLING (be subtle)
After adding items, occasionally suggest a complementary item:
- Main course → suggest bread/rice
- Starter → suggest a beverage
- No dessert yet → suggest dessert before confirming
Keep it natural: "Would you like some naan with that?" NOT a pushy sales pitch.

## NUMBER PARSING
Understand numbers in all supported languages:
- Hindi: ek=1, do=2, teen=3, char=4, paanch=5, cheh=6, saat=7, aath=8, nau=9, das=10
- English: one=1, two=2, three=3, etc.
- Mixed: "do butter chicken" = 2 butter chicken

## ERROR HANDLING
- If item not found on menu, tell the customer and suggest similar items from the menu
- If order is empty when confirming, tell them to add items first
- If asked about something you can't help with, politely redirect to ordering

## GREETING
When the conversation starts, greet warmly and ask what they'd like to order. Keep it brief.
Example: "Welcome to {self.restaurant_name}! What would you like to order today?"
"""

    def process_with_tools(self, user_message: str) -> Dict:
        """Process user message through LLM with tool calling.
        Also logs the conversation to the DB.
        """
        try:
            self.conversation_history.append({"role": "user", "content": user_message})

            messages = [{"role": "system", "content": self.get_system_prompt()}] + self.conversation_history

            # First LLM call — may produce tool_calls
            response = client.chat.completions(
                model=LLM_MODEL,
                messages=messages,
                tools=TOOLS_SPEC,
                tool_choice="auto",
                temperature=0.3,
                max_tokens=500,
                stream=False,
            )

            assistant_message = response.choices[0].message
            finish_reason = getattr(response.choices[0], "finish_reason", None)
            tool_calls = getattr(assistant_message, "tool_calls", None) or []
            print(f"[LLM] finish_reason={finish_reason}, tool_calls={len(tool_calls)}, content={repr((getattr(assistant_message, 'content', '') or '')[:100])}")
            for tc in tool_calls:
                print(f"[LLM]   tool_call: {tc.function.name}({tc.function.arguments})")

            if tool_calls:
                # Append assistant message with tool_calls to history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": getattr(assistant_message, "content", "") or "",
                    "tool_calls": [
                        {"id": tc.id, "type": "function",
                         "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                        for tc in tool_calls
                    ],
                })

                # Execute each tool
                tool_results = []
                for tc in tool_calls:
                    fn_name = tc.function.name
                    try:
                        fn_args = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        fn_args = {}
                    if fn_name in SESSION_TOOLS:
                        fn_args["session_id"] = self.session_id
                    tool_result = TOOLS_MAP[fn_name](**fn_args) if fn_name in TOOLS_MAP else {"error": f"Unknown tool: {fn_name}"}
                    tool_results.append({"tool": fn_name, "args": {k: v for k, v in fn_args.items() if k != "session_id"}, "result": tool_result})
                    self.conversation_history.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(tool_result),
                    })

                # Second LLM call — get natural language response
                messages2 = [{"role": "system", "content": self.get_system_prompt()}] + self.conversation_history
                response2 = client.chat.completions(
                    model=LLM_MODEL,
                    messages=messages2,
                    tools=TOOLS_SPEC,
                    temperature=0.7,
                    max_tokens=300,
                    stream=False,
                )
                final_message = response2.choices[0].message.content or ""
                self.conversation_history.append({"role": "assistant", "content": final_message})

                # Log conversation to DB
                self._log_conversation_turn(user_message, final_message,
                                            [{"tool": tr["tool"], "args": tr["args"]} for tr in tool_results])

                current_order = get_current_order(self.session_id)
                return {
                    "success": True,
                    "message": final_message,
                    "tool_calls": [tr["tool"] for tr in tool_results],
                    "tool_results": tool_results,
                    "current_order": current_order,
                }
            else:
                content = getattr(assistant_message, "content", "") or ""
                self.conversation_history.append({"role": "assistant", "content": content})

                # Log conversation to DB (no tools called)
                self._log_conversation_turn(user_message, content, [])

                return {
                    "success": True,
                    "message": content,
                    "tool_calls": [],
                    "current_order": get_current_order(self.session_id),
                }

        except Exception as e:
            print(f"Error in process_with_tools: {e}")
            import traceback; traceback.print_exc()
            if self.conversation_history and self.conversation_history[-1].get("role") == "user":
                self.conversation_history.pop()
            return {"success": False, "message": f"Sorry, something went wrong. Please try again.", "tool_calls": []}

    def _log_conversation_turn(self, user_message: str, ai_response: str, tool_calls: List[Dict]):
        """Log a conversation turn to the voice_orders table."""
        try:
            # Find the current order_id for this session
            order_id = None
            if self.session_id in active_sessions:
                order = active_sessions[self.session_id].get("current_order")
                if order:
                    order_id = order.get("order_id")

            if not order_id:
                # Check if there's an order in DB for this session
                try:
                    result = supabase.table("voice_orders").select("order_id").eq("session_id", self.session_id).order("created_at", desc=True).limit(1).execute()
                    if result.data:
                        order_id = result.data[0]["order_id"]
                except Exception:
                    pass

            if not order_id:
                return  # No order to log against yet

            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "customer_message": user_message,
                "ai_response": ai_response,
                "tool_calls": tool_calls,
            }
            _update_conversation_log(order_id, log_entry)
        except Exception as e:
            print(f"Error logging conversation: {e}")

    def stt(self, audio_base64: str, language: str = "hi-IN") -> str:
        try:
            audio_bytes = base64.b64decode(audio_base64)
            response = client.speech_to_text.transcribe(
                file=("audio.wav", BytesIO(audio_bytes), "audio/wav"),
                model=STT_MODEL,
                mode="transcribe",
                language_code=language,
            )
            return response.transcript or ""
        except Exception as e:
            print(f"STT Error: {e}")
            return ""

    def tts(self, text: str, language: str = "hi-IN") -> bytes:
        try:
            response = client.text_to_speech.convert(
                text=text,
                target_language_code=language,
                speaker="shubh",
                model=TTS_MODEL,
                pace=1.0,
                temperature=0.6,
            )
            return base64.b64decode(response.audios[0])
        except Exception as e:
            print(f"TTS Error: {e}")
            return b""


# ============ HELPERS ============

def _get_restaurant(restaurant_id: str) -> Optional[Dict]:
    try:
        rows = supabase.table("restaurant").select("*").eq("restaurant_id", restaurant_id).execute()
        return rows.data[0] if rows.data else None
    except Exception:
        return None


def _get_or_create_agent(session_id: str, restaurant_id: str, language: str = "hi-IN") -> AIAgent:
    if session_id not in active_sessions:
        active_sessions[session_id] = {"restaurant_id": restaurant_id, "language": language}
    elif active_sessions[session_id].get("restaurant_id") != restaurant_id:
        # restaurant changed — fully reset session (drop old agent + order)
        print(f"[session] Restaurant changed for {session_id}: {active_sessions[session_id].get('restaurant_id')} -> {restaurant_id}")
        active_sessions[session_id] = {"restaurant_id": restaurant_id, "language": language}
    else:
        # Update language if changed
        active_sessions[session_id]["language"] = language

    # Always ensure restaurant_id is set (defensive)
    active_sessions[session_id]["restaurant_id"] = restaurant_id

    if "agent" not in active_sessions[session_id]:
        restaurant = _get_restaurant(restaurant_id)
        restaurant_name = restaurant["restaurant_name"] if restaurant else restaurant_id
        active_sessions[session_id]["agent"] = AIAgent(session_id, restaurant_id, restaurant_name)
        print(f"[session] Created agent for {session_id} -> restaurant {restaurant_id} ({restaurant_name})")

    return active_sessions[session_id]["agent"]


# ============ API ENDPOINTS ============

class VoiceProcessRequest(BaseModel):
    audio_base64: str
    session_id: str
    restaurant_id: str
    language: str = "hi-IN"


class TextCommandRequest(BaseModel):
    message: str
    session_id: str
    restaurant_id: str
    language: str = "hi-IN"


@router.post("/voice-agent/process")
def process_voice_command(request: VoiceProcessRequest):
    """Full voice pipeline: STT -> LLM with tool calling -> TTS"""
    try:
        agent = _get_or_create_agent(request.session_id, request.restaurant_id, request.language)
        transcript = agent.stt(request.audio_base64, request.language)
        if not transcript:
            return {
                "success": False,
                "error": "Could not understand audio",
                "transcript": "",
                "response": "Sorry, I couldn't understand that. Please try again.",
            }
        result = agent.process_with_tools(transcript)
        audio_bytes = agent.tts(result["message"], request.language)
        return {
            "success": result["success"],
            "transcript": transcript,
            "response": result["message"],
            "audio_base64": base64.b64encode(audio_bytes).decode() if audio_bytes else "",
            "tool_calls": result.get("tool_calls", []),
            "current_order": result.get("current_order", {}),
            "session_id": request.session_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice-agent/text")
def process_text_command(request: TextCommandRequest):
    """Process text command (for testing without audio)"""
    try:
        agent = _get_or_create_agent(request.session_id, request.restaurant_id, request.language)
        result = agent.process_with_tools(request.message)
        audio_bytes = agent.tts(result["message"], request.language)
        return {
            "success": result["success"],
            "response": result["message"],
            "audio_base64": base64.b64encode(audio_bytes).decode() if audio_bytes else "",
            "tool_calls": result.get("tool_calls", []),
            "tool_results": result.get("tool_results", []),
            "current_order": result.get("current_order", {}),
            "session_id": request.session_id,
            "restaurant_id": request.restaurant_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voice-agent/order/{session_id}")
def get_order_status(session_id: str):
    return {"session_id": session_id, "order": get_current_order(session_id)}


@router.delete("/voice-agent/session/{session_id}")
def clear_session(session_id: str):
    if session_id in active_sessions:
        del active_sessions[session_id]
        return {"success": True, "message": "Session cleared"}
    return {"success": False, "message": "Session not found"}


@router.get("/voice-agent/tools")
def list_tools():
    return {"tools": [{"name": t["name"], "description": t["description"]} for t in TOOLS_DEF], "count": len(TOOLS_DEF)}


@router.get("/voice-agent/db-orders")
def get_db_orders(restaurant_id: Optional[str] = None, limit: int = 20):
    """Get confirmed voice orders from Supabase order table.
    Returns data in shape expected by frontend VoiceOrderRow[].
    """
    try:
        query = supabase.table("order").select("*").eq("order_source", "AI Agent").order("order_datetime", desc=True)
        if restaurant_id:
            query = query.eq("restaurant_id", restaurant_id)
        response = query.limit(limit).execute()
        return {"success": True, "count": len(response.data), "orders": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/voice-agent/db-orders/{order_id}")
def get_db_order_by_id(order_id: str):
    try:
        response = supabase.table("order").select("*").eq("order_id", order_id).execute()
        if not response.data:
            return {"success": False, "message": "Order not found"}
        return {"success": True, "order": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ---- Voice Orders (new tables) ----

@router.get("/voice-agent/sessions")
def get_voice_sessions(restaurant_id: Optional[str] = None, limit: int = 50):
    """Get voice order sessions from voice_orders table with items and conversation logs."""
    try:
        query = supabase.table("voice_orders").select("*").order("created_at", desc=True)
        if restaurant_id:
            query = query.eq("restaurant_id", restaurant_id)
        response = query.limit(limit).execute()

        sessions = []
        for vo in response.data:
            # Fetch items for this order
            items_resp = supabase.table("voice_order_items").select("*").eq("order_id", vo["order_id"]).execute()

            # Parse conversation_log
            conv_log = vo.get("conversation_log") or []
            if isinstance(conv_log, str):
                try:
                    conv_log = json.loads(conv_log)
                except Exception:
                    conv_log = []

            sessions.append({
                "id": vo.get("id"),
                "order_id": vo["order_id"],
                "session_id": vo.get("session_id", ""),
                "restaurant_id": vo.get("restaurant_id", ""),
                "customer_phone": vo.get("customer_phone", ""),
                "total_amount": float(vo.get("total_amount", 0)),
                "status": vo.get("status", "draft"),
                "language": vo.get("language", "hi-IN"),
                "created_at": vo.get("created_at", ""),
                "confirmed_at": vo.get("confirmed_at"),
                "updated_at": vo.get("updated_at"),
                "conversation_log": conv_log,
                "items": items_resp.data if items_resp.data else [],
            })

        return {"success": True, "count": len(sessions), "sessions": sessions}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.get("/voice-agent/sessions/{order_id}")
def get_voice_session_detail(order_id: str):
    """Get a single voice order session with full conversation log and items."""
    try:
        vo_resp = supabase.table("voice_orders").select("*").eq("order_id", order_id).execute()
        if not vo_resp.data:
            return {"success": False, "message": "Voice order session not found"}

        vo = vo_resp.data[0]
        items_resp = supabase.table("voice_order_items").select("*").eq("order_id", order_id).execute()

        conv_log = vo.get("conversation_log") or []
        if isinstance(conv_log, str):
            try:
                conv_log = json.loads(conv_log)
            except Exception:
                conv_log = []

        return {
            "success": True,
            "session": {
                "id": vo.get("id"),
                "order_id": vo["order_id"],
                "session_id": vo.get("session_id", ""),
                "restaurant_id": vo.get("restaurant_id", ""),
                "customer_phone": vo.get("customer_phone", ""),
                "total_amount": float(vo.get("total_amount", 0)),
                "status": vo.get("status", "draft"),
                "language": vo.get("language", "hi-IN"),
                "created_at": vo.get("created_at", ""),
                "confirmed_at": vo.get("confirmed_at"),
                "updated_at": vo.get("updated_at"),
                "conversation_log": conv_log,
                "items": items_resp.data if items_resp.data else [],
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============ WEBSOCKET ============

@router.websocket("/voice-agent/ws/{session_id}")
async def voice_agent_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket for real-time voice conversation.
    Client must send restaurant_id in the first message or as a query param.
    Message format: {"type": "text"|"audio"|"reset", "restaurant_id": "R001", "language": "hi-IN", "text": "...", "audio": "<base64>"}
    """
    await websocket.accept()
    agent: Optional[AIAgent] = None

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            language = data.get("language", "hi-IN")
            restaurant_id = data.get("restaurant_id", "R001")

            # Lazily init/update agent when restaurant_id arrives
            if agent is None or active_sessions.get(session_id, {}).get("restaurant_id") != restaurant_id:
                agent = _get_or_create_agent(session_id, restaurant_id, language)

            if message_type == "audio":
                audio_b64 = data.get("audio", "")
                transcript = agent.stt(audio_b64, language)
                await websocket.send_json({"type": "transcript", "text": transcript})
                if transcript:
                    result = agent.process_with_tools(transcript)
                    audio_bytes = agent.tts(result["message"], language)
                    await websocket.send_json({
                        "type": "response",
                        "text": result["message"],
                        "audio": base64.b64encode(audio_bytes).decode() if audio_bytes else "",
                        "tool_calls": result.get("tool_calls", []),
                        "current_order": result.get("current_order", {}),
                    })

            elif message_type == "text":
                text = data.get("text") or data.get("message", "")
                result = agent.process_with_tools(text)
                audio_bytes = agent.tts(result["message"], language)
                await websocket.send_json({
                    "type": "response",
                    "text": result["message"],
                    "audio": base64.b64encode(audio_bytes).decode() if audio_bytes else "",
                    "tool_calls": result.get("tool_calls", []),
                    "current_order": result.get("current_order", {}),
                })

            elif message_type == "reset":
                if session_id in active_sessions:
                    del active_sessions[session_id]
                agent = _get_or_create_agent(session_id, restaurant_id, language)
                await websocket.send_json({"type": "reset", "message": "Session reset"})

    except WebSocketDisconnect:
        print(f"Session {session_id} disconnected")
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
