"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Tag,
  Loader2,
  BarChart3,
  Percent,
  MessageCircle,
  ArrowRight,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  fetchAnalytics,
  type AnalyticsResponse,
  type ComboRecommendation as APICombo,
  type UpsellPriority,
  type PriceOptimization,
} from "@/lib/api";

// ---------- UI-level shapes ----------

interface ComboRow {
  id: string;
  name: string;
  items: string[];
  frequency: number;
  recommendation: string;
}

interface UpsellRow {
  id: string;
  itemName: string;
  category: string;
  marginPct: number;
  unitPrice: number;
  upsellScript: string;
}

interface PriceRow {
  id: string;
  itemName: string;
  currentPrice: number;
  suggestedPrice: number;
  change: number;
  changePercent: number;
  action: string;
  reason: string;
  expectedVolume: string;
}

// ---------- Transform API → UI ----------

function buildCombos(data: AnalyticsResponse): ComboRow[] {
  return data.combo_recommendations.combos.map((c, i) => ({
    id: `combo-${i}`,
    name: c.items.slice(0, 2).join(" + ") + (c.items.length > 2 ? ` +${c.items.length - 2}` : ""),
    items: c.items,
    frequency: c.frequency,
    recommendation: c.recommendation,
  }));
}

function buildUpsells(data: AnalyticsResponse): UpsellRow[] {
  return data.upsell_priorities.items.map((u, i) => ({
    id: `upsell-${i}`,
    itemName: u.item_name,
    category: u.category,
    marginPct: u.margin_pct,
    unitPrice: u.unit_price,
    upsellScript: u.upsell_script,
  }));
}

/** Turn "DECREASE_PRICE" → "Decrease Price" */
function formatAction(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Turn the terse backend reason into a proper recommendation sentence. */
function formatReason(action: string, reason: string, itemName: string, changePercent: number): string {
  const isDecrease = action === "DECREASE_PRICE";

  if (isDecrease) {
    return `${itemName} has ${reason.toLowerCase()}. A ${Math.abs(changePercent)}% price reduction can stimulate demand and increase order volume while maintaining healthy profitability.`;
  }
  return `${itemName} has ${reason.toLowerCase()}. The market can sustain a ${Math.abs(changePercent)}% price increase to improve margins without significantly impacting order volume.`;
}

function buildPriceRecs(data: AnalyticsResponse): PriceRow[] {
  return data.price_optimization.recommendations.map((p, i) => {
    const change = p.suggested_price - p.current_price;
    const changePercent = p.current_price > 0 ? Math.round((change / p.current_price) * 1000) / 10 : 0;
    return {
      id: `price-${i}`,
      itemName: p.item_name,
      currentPrice: p.current_price,
      suggestedPrice: p.suggested_price,
      change,
      changePercent,
      action: formatAction(p.action),
      reason: formatReason(p.action, p.reason, p.item_name, changePercent),
      expectedVolume: p.expected_volume_improvement,
    };
  });
}

// ---------- Chart configs ----------

const comboChartConfig = {
  frequency: { label: "Co-order Frequency", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

const priceChartConfig = {
  change: { label: "Price Change", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

// ---------- Component ----------

export default function RevenueOptimizationPage() {
  const [combos, setCombos] = useState<ComboRow[]>([]);
  const [upsells, setUpsells] = useState<UpsellRow[]>([]);
  const [priceRecs, setPriceRecs] = useState<PriceRow[]>([]);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then((data) => {
        setCombos(buildCombos(data));
        setUpsells(buildUpsells(data));
        setPriceRecs(buildPriceRecs(data));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPriceChanges = useMemo(
    () => priceRecs.filter((p) => p.change !== 0).length,
    [priceRecs],
  );
  const highMarginUpsells = useMemo(
    () => upsells.filter((u) => u.marginPct >= 60).length,
    [upsells],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading revenue insights...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-destructive">Failed to load analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border">
        <h1 className="text-2xl font-bold tracking-tight">Revenue Optimization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Combo pairings, upsell scripts, and pricing adjustments based on your order data
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Combos</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{combos.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pairing opportunities</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upsells</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{upsells.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{highMarginUpsells} high-margin</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price Recs</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{priceRecs.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{totalPriceChanges} adjustments</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Delta</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {priceRecs.length > 0
              ? `${priceRecs.reduce((s, p) => s + Math.abs(p.changePercent), 0) / priceRecs.length > 0 ? (priceRecs.reduce((s, p) => s + Math.abs(p.changePercent), 0) / priceRecs.length).toFixed(1) : "0"}%`
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">avg price shift</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="combos">
        <TabsList>
          <TabsTrigger value="combos" className="cursor-pointer">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Combos
          </TabsTrigger>
          <TabsTrigger value="upsell" className="cursor-pointer">
            <Megaphone className="h-3.5 w-3.5 mr-1.5" />
            Upsell Scripts
          </TabsTrigger>
          <TabsTrigger value="pricing" className="cursor-pointer">
            <Tag className="h-3.5 w-3.5 mr-1.5" />
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* ── Combos Tab ── */}
        <TabsContent value="combos" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-2 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pair Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={comboChartConfig} className="h-[320px] w-full">
                  <BarChart
                    data={combos.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => `${value} orders`} />}
                    />
                    <Bar dataKey="frequency" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Combo list */}
            <div className="lg:col-span-3 space-y-2">
              {combos.map((combo, idx) => (
                <Collapsible
                  key={combo.id}
                  open={expandedCombo === combo.id}
                  onOpenChange={() =>
                    setExpandedCombo(expandedCombo === combo.id ? null : combo.id)
                  }
                >
                  <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium">{combo.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {combo.frequency}× ordered together
                          </span>
                        </div>
                        {expandedCombo === combo.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-1 border-t space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{combo.recommendation}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {combo.items.map((item) => (
                            <span key={item} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
              {combos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No combo recommendations yet.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Upsell Tab ── */}
        <TabsContent value="upsell" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {upsells.map((rule) => (
              <div key={rule.id} className="rounded-lg border bg-card p-4 space-y-3">
                {/* Item header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{rule.itemName}</p>
                    <p className="text-xs text-muted-foreground">{rule.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">₹{rule.unitPrice}</p>
                    <p className={`text-xs font-medium ${rule.marginPct >= 70
                        ? "text-emerald-600"
                        : rule.marginPct >= 55
                          ? "text-foreground"
                          : "text-amber-600"
                      }`}>
                      {rule.marginPct}% margin
                    </p>
                  </div>
                </div>
                {/* Script */}
                <div className="rounded-md bg-muted/60 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      &ldquo;{rule.upsellScript}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {upsells.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              No upsell priorities available.
            </p>
          )}
        </TabsContent>

        {/* ── Pricing Tab ── */}
        <TabsContent value="pricing" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-2 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Suggested Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={priceChartConfig} className="h-[320px] w-full">
                  <BarChart
                    data={priceRecs}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="itemName"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `₹${Number(value).toLocaleString()}`}
                        />
                      }
                    />
                    <Bar dataKey="change" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Price cards */}
            <div className="lg:col-span-3 space-y-2">
              {priceRecs.map((rec) => {
                const isIncrease = rec.change > 0;
                return (
                  <div key={rec.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name + action */}
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{rec.itemName}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${isIncrease
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                : "border-amber-200 text-amber-700 bg-amber-50"
                              }`}
                          >
                            {rec.action}
                          </Badge>
                        </div>
                        {/* Price row */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-muted-foreground">₹{rec.currentPrice}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className={`font-mono font-semibold ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}>
                            ₹{rec.suggestedPrice}
                          </span>
                          <span className={`text-xs ml-1 ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}>
                            ({isIncrease ? "+" : ""}{rec.changePercent}%)
                          </span>
                          <Minus className="h-3 w-3 text-border mx-1" />
                          <span className="text-xs text-muted-foreground">{rec.expectedVolume} volume</span>
                        </div>
                        {/* Reason */}
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rec.reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {priceRecs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No pricing recommendations available.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
