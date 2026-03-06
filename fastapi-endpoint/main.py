"""
Restaurant Analytics API - Full Analytics Suite
FastAPI endpoints for restaurant data from Supabase
Includes: Revenue Intelligence, Menu Optimization, Order Analytics
"""
import os
from collections import defaultdict
from typing import Dict, List, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

app = FastAPI(
    title="Restaurant Analytics API",
    description="Full Revenue Intelligence & Menu Optimization Engine",
    version="2.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include AI agent router
from ai_agent import router as ai_router
app.include_router(ai_router)


@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Restaurant Analytics API is running"}


# RESTAURANTS ENDPOINTS
@app.get("/api/restaurants", tags=["Restaurants"])
def list_restaurants():
    """Get all restaurant names and IDs"""
    try:
        response = supabase.table("restaurant").select("restaurant_id,restaurant_name").execute()
        data = response.data
        return {
            "count": len(data),
            "restaurants": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/restaurants/{restaurant_id}", tags=["Restaurants"])
def get_restaurant_by_id(restaurant_id: str):
    """Get full details of a single restaurant"""
    try:
        response = supabase.table("restaurant").select("*").eq("restaurant_id", restaurant_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# MENU ENDPOINTS
@app.get("/api/menu", tags=["Menu"])
def list_menu(restaurant_id: str | None = Query(None)):
    """Get all menu items, optionally filtered by restaurant"""
    try:
        query = supabase.table("menu").select("*")
        if restaurant_id:
            query = query.eq("restaurant_id", restaurant_id)
        response = query.execute()
        return {"count": len(response.data), "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/menu/{item_id}", tags=["Menu"])
def get_menu_item(item_id: str):
    """Get a single menu item by ID"""
    try:
        response = supabase.table("menu").select("*").eq("item_id", item_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ORDERS ENDPOINTS
@app.get("/api/orders", tags=["Orders"])
def list_orders(
    restaurant_id: str | None = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
):
    """Get order items, optionally filtered by restaurant"""
    try:
        query = supabase.table("order").select("*")
        if restaurant_id:
            query = query.eq("restaurant_id", restaurant_id)
        response = query.execute()
        data = response.data
        page = data[offset : offset + limit]
        return {"total": len(data), "count": len(page), "data": page}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/{order_id}", tags=["Orders"])
def get_order(order_id: str):
    """Get all items for a specific order"""
    try:
        response = supabase.table("order").select("*").eq("order_id", order_id).execute()
        items = response.data
        if not items:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"order_id": order_id, "item_count": len(items), "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ANALYTICS ENDPOINT - FULL SUITE
@app.get("/api/analytics/{restaurant_id}", tags=["Analytics"])
def get_restaurant_analytics(restaurant_id: str):
    """
    Full Revenue Intelligence & Menu Optimization Engine
    
    Returns comprehensive analytics including:
    - Contribution margin analysis
    - Item-level profitability
    - Sales velocity & popularity
    - Under-promoted high-margin items
    - Risk detection
    - Combo recommendations
    - Upsell priorities
    - Price optimization
    """
    try:
        # Get restaurant details
        rest_response = supabase.table("restaurant").select("*").eq("restaurant_id", restaurant_id).execute()
        if not rest_response.data:
            raise HTTPException(status_code=404, detail=f"Restaurant {restaurant_id} not found")
        restaurant = rest_response.data[0]
        
        # Get menu
        menu_response = supabase.table("menu").select("*").eq("restaurant_id", restaurant_id).execute()
        menu = menu_response.data
        
        # Get orders
        orders_response = supabase.table("order").select("*").eq("restaurant_id", restaurant_id).execute()
        orders = orders_response.data
        
        # Create menu lookup
        menu_lookup = {item["item_id"]: item for item in menu}
        
        # Calculate item-level metrics
        item_metrics = calculate_item_metrics(orders, menu_lookup)
        
        # 1. CONTRIBUTION MARGIN ANALYSIS
        contribution_margin = calculate_contribution_margin(item_metrics, menu_lookup)
        
        # 2. ITEM-LEVEL PROFITABILITY
        profitability_analysis = calculate_profitability(item_metrics, menu_lookup)
        
        # 3. SALES VELOCITY & POPULARITY
        sales_velocity = calculate_sales_velocity(item_metrics)
        
        # 4. UNDER-PROMOTED HIGH-MARGIN ITEMS
        underpromoted = detect_underpromoted_items(item_metrics, menu_lookup)
        
        # 5. RISK DETECTION (Low-margin high-volume)
        risk_items = detect_risk_items(item_metrics, menu_lookup)
        
        # 6. COMBO RECOMMENDATIONS
        combos = calculate_combo_recommendations(orders, menu_lookup)
        
        # 7. UPSELL PRIORITIES
        upsells = calculate_upsell_priorities(item_metrics, menu_lookup)
        
        # 8. PRICE OPTIMIZATION
        price_optimization = calculate_price_optimization(item_metrics, menu_lookup)
        
        # Summary metrics
        total_revenue = sum(item["total_revenue"] for item in item_metrics.values())
        total_orders = len(set(o["order_id"] for o in orders))
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        return {
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant.get("restaurant_name", ""),
            "cuisine": restaurant.get("cuisine_niche", ""),
            "area": restaurant.get("area", ""),
            "summary": {
                "menu_items": len(menu),
                "total_orders": total_orders,
                "total_order_lines": len(orders),
                "total_revenue": round(total_revenue, 2),
                "avg_order_value": round(avg_order_value, 2),
                "avg_contribution_margin_pct": round(
                    sum(cm["margin_pct"] for cm in contribution_margin) / len(contribution_margin), 1
                ) if contribution_margin else 0
            },
            "contribution_margin_analysis": {
                "description": "Selling Price - Estimated Food Cost (35% of price)",
                "count": len(contribution_margin),
                "items": contribution_margin
            },
            "item_profitability": {
                "description": "Revenue and profit by item",
                "count": len(profitability_analysis),
                "items": profitability_analysis
            },
            "sales_velocity": {
                "description": "Popularity score based on quantity sold and frequency",
                "count": len(sales_velocity),
                "items": sales_velocity
            },
            "underpromoted_high_margin": {
                "description": "High margin items with low sales - promote these!",
                "count": len(underpromoted),
                "items": underpromoted
            },
            "risk_items": {
                "description": "Low margin but high volume items - risky for business",
                "count": len(risk_items),
                "items": risk_items
            },
            "combo_recommendations": {
                "description": "Frequently bought together - suggest as combos",
                "count": len(combos),
                "combos": combos
            },
            "upsell_priorities": {
                "description": "High-margin items to suggest as add-ons",
                "count": len(upsells),
                "items": upsells
            },
            "price_optimization": {
                "description": "Price increase/decrease recommendations",
                "count": len(price_optimization),
                "recommendations": price_optimization
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def calculate_item_metrics(orders: List[Dict], menu_lookup: Dict) -> Dict[str, Dict]:
    """Calculate metrics for each menu item"""
    metrics = {}
    unique_orders_tracker = defaultdict(set)
    
    for order in orders:
        item_id = order.get("item_id")
        item_name = order.get("item_name", "Unknown")
        quantity = int(order.get("quantity", 1))
        line_total = float(order.get("line_total", 0))
        order_id = order.get("order_id")
        
        if item_id:
            if item_id not in metrics:
                metrics[item_id] = {
                    "quantity_sold": 0,
                    "total_revenue": 0.0,
                    "order_count": 0,
                    "item_name": item_name
                }
            
            metrics[item_id]["quantity_sold"] += quantity
            metrics[item_id]["total_revenue"] += line_total
            metrics[item_id]["order_count"] += 1
            unique_orders_tracker[item_id].add(order_id)
    
    # Add unique order counts
    for item_id in metrics:
        metrics[item_id]["unique_orders"] = len(unique_orders_tracker[item_id])
    
    return metrics


def calculate_contribution_margin(item_metrics: Dict, menu_lookup: Dict) -> List[Dict]:
    """Calculate contribution margin for each item (Price - Food Cost)"""
    margins = []
    
    for item_id, metrics in item_metrics.items():
        menu_item = menu_lookup.get(item_id, {})
        price = float(menu_item.get("price", 0))
        
        # Estimate food cost as 35% of selling price (industry standard)
        estimated_food_cost = price * 0.35
        contribution_margin = price - estimated_food_cost
        margin_pct = (contribution_margin / price * 100) if price > 0 else 0
        
        margins.append({
            "item_id": item_id,
            "item_name": metrics["item_name"],
            "selling_price": price,
            "estimated_food_cost": round(estimated_food_cost, 2),
            "contribution_margin": round(contribution_margin, 2),
            "margin_pct": round(margin_pct, 1),
            "category": menu_item.get("category", "Unknown")
        })
    
    # Sort by margin percentage (highest first)
    return sorted(margins, key=lambda x: x["margin_pct"], reverse=True)


def calculate_profitability(item_metrics: Dict, menu_lookup: Dict) -> List[Dict]:
    """Calculate profitability for each item"""
    profitability = []
    
    for item_id, metrics in item_metrics.items():
        menu_item = menu_lookup.get(item_id, {})
        price = float(menu_item.get("price", 0))
        revenue = metrics["total_revenue"]
        
        # Calculate profit (assuming 35% margin)
        profit = revenue * 0.35
        
        profitability.append({
            "item_id": item_id,
            "item_name": metrics["item_name"],
            "quantity_sold": metrics["quantity_sold"],
            "unit_price": price,
            "total_revenue": round(revenue, 2),
            "estimated_profit": round(profit, 2),
            "category": menu_item.get("category", "Unknown")
        })
    
    # Sort by total revenue (highest first)
    return sorted(profitability, key=lambda x: x["total_revenue"], reverse=True)


def calculate_sales_velocity(item_metrics: Dict) -> List[Dict]:
    """Calculate sales velocity and popularity score"""
    velocity = []
    
    # Calculate max values for normalization
    max_qty = max((m["quantity_sold"] for m in item_metrics.values()), default=1)
    max_orders = max((m["unique_orders"] for m in item_metrics.values()), default=1)
    
    for item_id, metrics in item_metrics.items():
        # Normalize metrics (0-100 scale)
        qty_score = (metrics["quantity_sold"] / max_qty) * 100 if max_qty > 0 else 0
        order_score = (metrics["unique_orders"] / max_orders) * 100 if max_orders > 0 else 0
        
        # Combined popularity score
        popularity_score = (qty_score * 0.6) + (order_score * 0.4)
        
        velocity.append({
            "item_id": item_id,
            "item_name": metrics["item_name"],
            "quantity_sold": metrics["quantity_sold"],
            "unique_orders": metrics["unique_orders"],
            "popularity_score": round(popularity_score, 1),
            "velocity_tier": "High" if popularity_score > 70 else "Medium" if popularity_score > 40 else "Low"
        })
    
    # Sort by popularity score
    return sorted(velocity, key=lambda x: x["popularity_score"], reverse=True)


def detect_underpromoted_items(item_metrics: Dict, menu_lookup: Dict) -> List[Dict]:
    """Detect high-margin items with low sales (underpromoted)"""
    underpromoted = []
    
    for item_id, metrics in item_metrics.items():
        menu_item = menu_lookup.get(item_id, {})
        price = float(menu_item.get("price", 0))
        
        # Calculate margin
        estimated_food_cost = price * 0.35
        margin_pct = ((price - estimated_food_cost) / price * 100) if price > 0 else 0
        
        # High margin (>60%) but low sales (<20 quantity)
        if margin_pct > 60 and metrics["quantity_sold"] < 20:
            underpromoted.append({
                "item_id": item_id,
                "item_name": metrics["item_name"],
                "margin_pct": round(margin_pct, 1),
                "quantity_sold": metrics["quantity_sold"],
                "revenue": round(metrics["total_revenue"], 2),
                "recommendation": "PROMOTE - High margin but low visibility",
                "category": menu_item.get("category", "Unknown")
            })
    
    return sorted(underpromoted, key=lambda x: x["margin_pct"], reverse=True)


def detect_risk_items(item_metrics: Dict, menu_lookup: Dict) -> List[Dict]:
    """Detect low-margin high-volume items (risky)"""
    risk_items = []
    
    max_qty = max((m["quantity_sold"] for m in item_metrics.values()), default=1)
    
    for item_id, metrics in item_metrics.items():
        menu_item = menu_lookup.get(item_id, {})
        price = float(menu_item.get("price", 0))
        
        # Calculate margin
        estimated_food_cost = price * 0.35
        margin_pct = ((price - estimated_food_cost) / price * 100) if price > 0 else 0
        
        # Low margin (<40%) but high volume (>60th percentile)
        qty_percentile = (metrics["quantity_sold"] / max_qty) * 100 if max_qty > 0 else 0
        
        if margin_pct < 40 and qty_percentile > 60:
            risk_items.append({
                "item_id": item_id,
                "item_name": metrics["item_name"],
                "margin_pct": round(margin_pct, 1),
                "quantity_sold": metrics["quantity_sold"],
                "revenue": round(metrics["total_revenue"], 2),
                "risk_level": "HIGH" if margin_pct < 30 else "MEDIUM",
                "recommendation": "Consider price increase or cost reduction",
                "category": menu_item.get("category", "Unknown")
            })
    
    return sorted(risk_items, key=lambda x: x["quantity_sold"], reverse=True)


def calculate_combo_recommendations(orders: List[Dict], menu_lookup: Dict) -> List[Dict]:
    """Calculate frequently bought together items (association analysis)"""
    # Group items by order
    order_groups = defaultdict(list)
    for order in orders:
        order_id = order.get("order_id")
        item_id = order.get("item_id")
        if order_id and item_id:
            order_groups[order_id].append(item_id)
    
    # Count item pairs
    pair_counts = defaultdict(int)
    for order_id, items in order_groups.items():
        if len(items) > 1:
            for i in range(len(items)):
                for j in range(i + 1, len(items)):
                    pair = tuple(sorted([items[i], items[j]]))
                    pair_counts[pair] += 1
    
    # Get top combos
    combos = []
    for (item1, item2), count in sorted(pair_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        item1_name = menu_lookup.get(item1, {}).get("item_name", item1)
        item2_name = menu_lookup.get(item2, {}).get("item_name", item2)
        
        combos.append({
            "items": [item1_name, item2_name],
            "item_ids": [item1, item2],
            "frequency": count,
            "recommendation": f"Offer '{item1_name} + {item2_name}' as a combo deal"
        })
    
    return combos


def calculate_upsell_priorities(item_metrics: Dict, menu_lookup: Dict) -> List[Dict]:
    """Calculate upsell priorities (high-margin items)"""
    upsells = []
    
    for item_id, metrics in item_metrics.items():
        menu_item = menu_lookup.get(item_id, {})
        price = float(menu_item.get("price", 0))
        
        # Calculate margin
        estimated_food_cost = price * 0.35
        margin_pct = ((price - estimated_food_cost) / price * 100) if price > 0 else 0
        
        # High margin items (>55%) are good upsell candidates
        if margin_pct > 55:
            upsells.append({
                "item_id": item_id,
                "item_name": metrics["item_name"],
                "margin_pct": round(margin_pct, 1),
                "unit_price": price,
                "category": menu_item.get("category", "Unknown"),
                "upsell_script": f"Would you like to add {metrics['item_name']} for just ₹{price}?"
            })
    
    # Sort by margin percentage
    return sorted(upsells, key=lambda x: x["margin_pct"], reverse=True)[:10]


def calculate_price_optimization(item_metrics: Dict, menu_lookup: Dict) -> List[Dict]:
    """Calculate price optimization recommendations"""
    recommendations = []
    
    avg_qty = sum(m["quantity_sold"] for m in item_metrics.values()) / len(item_metrics) if item_metrics else 0
    
    for item_id, metrics in item_metrics.items():
        menu_item = menu_lookup.get(item_id, {})
        current_price = float(menu_item.get("price", 0))
        
        # Calculate margin
        estimated_food_cost = current_price * 0.35
        margin_pct = ((current_price - estimated_food_cost) / current_price * 100) if current_price > 0 else 0
        
        # Determine action
        if margin_pct < 35 and metrics["quantity_sold"] > avg_qty:
            # Low margin but high volume - increase price
            suggested_price = current_price * 1.15
            recommendations.append({
                "item_id": item_id,
                "item_name": metrics["item_name"],
                "current_price": current_price,
                "suggested_price": round(suggested_price, 0),
                "action": "INCREASE_PRICE",
                "reason": f"Low margin ({round(margin_pct, 1)}%) but high demand ({metrics['quantity_sold']} sold)",
                "expected_margin_improvement": "+10-15%"
            })
        elif margin_pct > 65 and metrics["quantity_sold"] < avg_qty * 0.5:
            # High margin but low volume - decrease price to boost sales
            suggested_price = current_price * 0.9
            recommendations.append({
                "item_id": item_id,
                "item_name": metrics["item_name"],
                "current_price": current_price,
                "suggested_price": round(suggested_price, 0),
                "action": "DECREASE_PRICE",
                "reason": f"High margin ({round(margin_pct, 1)}%) but low sales ({metrics['quantity_sold']} sold)",
                "expected_volume_improvement": "+20-30%"
            })
    
    return sorted(recommendations, key=lambda x: x["current_price"], reverse=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
