"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Zap,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  // reason from API looks like:
  //   "High margin (65.0%) but low sales (1 sold)"
  //   "Low margin (32.5%) but high demand (45 sold)"
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Optimization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Smart combos, upsell strategies, and price optimization recommendations
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Combo Opportunities
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              AI-generated from association analysis
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upsell Candidates
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upsells.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {highMarginUpsells} high-margin items
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Price Recommendations
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priceRecs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPriceChanges} price change suggestions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Price Delta
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {priceRecs.length > 0
                ? `${priceRecs.reduce((s, p) => s + Math.abs(p.changePercent), 0) / priceRecs.length > 0 ? (priceRecs.reduce((s, p) => s + Math.abs(p.changePercent), 0) / priceRecs.length).toFixed(1) : "0"}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average suggested adjustment</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="combos">
        <TabsList>
          <TabsTrigger value="combos" className="cursor-pointer">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Smart Combos
          </TabsTrigger>
          <TabsTrigger value="upsell" className="cursor-pointer">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Upsell Rules
          </TabsTrigger>
          <TabsTrigger value="pricing" className="cursor-pointer">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Price Optimization
          </TabsTrigger>
        </TabsList>

        {/* Combos Tab */}
        <TabsContent value="combos" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Combo frequency chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Co-order Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={comboChartConfig} className="h-[300px] w-full">
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

            {/* Combo Cards */}
            <div className="lg:col-span-2 space-y-3">
              {combos.map((combo) => (
                <Collapsible
                  key={combo.id}
                  open={expandedCombo === combo.id}
                  onOpenChange={() =>
                    setExpandedCombo(expandedCombo === combo.id ? null : combo.id)
                  }
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-base">{combo.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {combo.frequency} co-orders
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">
                              {combo.items.length} items
                            </span>
                            {expandedCombo === combo.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        <p className="text-sm text-muted-foreground">{combo.recommendation}</p>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Items included:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {combo.items.map((item) => (
                              <Badge key={item} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
              {combos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No combo recommendations available for this restaurant.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Upsell Tab */}
        <TabsContent value="upsell" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Smart Upsell Prioritization</CardTitle>
              <p className="text-xs text-muted-foreground">
                High-margin items with AI-generated upsell scripts
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="max-w-[350px]">Upsell Script</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upsells.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.itemName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.category}
                      </TableCell>
                      <TableCell className="text-right font-mono">₹{rule.unitPrice}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium ${
                            rule.marginPct >= 70
                              ? "text-emerald-600"
                              : rule.marginPct >= 55
                                ? "text-foreground"
                                : "text-red-500"
                          }`}
                        >
                          {rule.marginPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[350px]">
                        {rule.upsellScript}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {upsells.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upsell priorities available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Price change chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Price Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={priceChartConfig} className="h-[300px] w-full">
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

            {/* Price Recommendation Cards */}
            <div className="lg:col-span-2 space-y-3">
              {priceRecs.map((rec) => {
                const isIncrease = rec.change > 0;
                return (
                  <Card key={rec.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">{rec.itemName}</h3>
                            <Badge variant="outline" className="text-xs">
                              {rec.action}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.reason}</p>
                          <div className="flex items-center gap-4 pt-1">
                            <div>
                              <p className="text-xs text-muted-foreground">Current</p>
                              <p className="text-sm font-mono font-medium">₹{rec.currentPrice}</p>
                            </div>
                            <div className="flex items-center">
                              {isIncrease ? (
                                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Suggested</p>
                              <p
                                className={`text-sm font-mono font-bold ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                ₹{rec.suggestedPrice}
                              </p>
                            </div>
                            <div className="border-l pl-4">
                              <p className="text-xs text-muted-foreground">Change</p>
                              <p
                                className={`text-sm font-mono font-medium ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {isIncrease ? "+" : ""}
                                {rec.changePercent}%
                              </p>
                            </div>
                            <div className="border-l pl-4">
                              <p className="text-xs text-muted-foreground">Expected Volume</p>
                              <p className="text-sm font-medium">{rec.expectedVolume}</p>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-4 cursor-pointer">
                          <Check className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {priceRecs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No price optimization recommendations available.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
