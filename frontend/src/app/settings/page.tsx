"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  UtensilsCrossed,
  Hash,
  Store,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchAnalytics,
  getRestaurantId,
  getRestaurantName,
  type AnalyticsResponse,
} from "@/lib/api";

export default function SettingsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const restaurantName = data?.restaurant_name || getRestaurantName() || "—";
  const cuisine = data?.cuisine || "—";
  const area = data?.area || "—";
  const restaurantId = data?.restaurant_id || getRestaurantId() || "—";
  const menuItems = data?.summary.menu_items ?? "—";
  const totalOrders = data?.summary.total_orders ?? "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Restaurant profile and AI system information
        </p>
      </div>

      {/* Restaurant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restaurant Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Store className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Restaurant Name</p>
                <p className="text-sm font-medium">{restaurantName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Restaurant ID</p>
                <p className="text-sm font-medium font-mono">{restaurantId}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UtensilsCrossed className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cuisine</p>
                <p className="text-sm font-medium">{cuisine}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="text-sm font-medium">{area}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UtensilsCrossed className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Menu Items</p>
                <p className="text-sm font-medium">{menuItems}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-sm font-medium">{typeof totalOrders === "number" ? totalOrders.toLocaleString("en-IN") : totalOrders}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Voice Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Speech-to-Text
              </p>
              <p className="text-sm font-medium">Sarvam AI STT</p>
              <Badge variant="secondary" className="text-xs mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                LLM Engine
              </p>
              <p className="text-sm font-medium">Sarvam-105B</p>
              <Badge variant="secondary" className="text-xs mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Text-to-Speech
              </p>
              <p className="text-sm font-medium">Sarvam AI TTS</p>
              <Badge variant="secondary" className="text-xs mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
