"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Percent,
  Mic,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Star,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  fetchAnalytics,
  type AnalyticsResponse,
  type ContributionMarginItem,
  type SalesVelocityItem,
  type UnderpromotedItem,
  type RiskItem,
} from "@/lib/api";

const CATEGORY_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-primary)",
  "var(--color-muted-foreground)",
];

function formatCurrency(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value}`;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: "currency" | "number" | "percent";
}) {
  let displayValue: string;
  if (format === "currency") {
    displayValue = formatCurrency(value);
  } else if (format === "percent") {
    displayValue = `${value}%`;
  } else {
    displayValue = value.toLocaleString("en-IN");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Failed to load analytics: {error}</p>
      </div>
    );
  }

  const { summary } = data;

  // Build category performance from contribution_margin_analysis
  const categoryMap = new Map<
    string,
    { revenue: number; count: number; marginSum: number }
  >();
  for (const item of data.item_profitability.items) {
    const existing = categoryMap.get(item.category) || {
      revenue: 0,
      count: 0,
      marginSum: 0,
    };
    existing.revenue += item.total_revenue;
    existing.count += item.quantity_sold;
    categoryMap.set(item.category, existing);
  }
  for (const item of data.contribution_margin_analysis.items) {
    const existing = categoryMap.get(item.category);
    if (existing) {
      existing.marginSum += item.margin_pct;
    }
  }

  const totalRevenue = Array.from(categoryMap.values()).reduce(
    (s, c) => s + c.revenue,
    0,
  );
  const categoryPerformance = Array.from(categoryMap.entries())
    .map(([category, info]) => ({
      category,
      revenue: info.revenue,
      contribution: totalRevenue > 0
        ? Math.round((info.revenue / totalRevenue) * 100)
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const categoryChartConfig = categoryPerformance.reduce(
    (acc, item, index) => {
      acc[item.category] = {
        label: item.category,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>,
  ) satisfies ChartConfig;

  // Build merged menu items for insights
  const marginMap = new Map<string, ContributionMarginItem>();
  for (const item of data.contribution_margin_analysis.items) {
    marginMap.set(item.item_id, item);
  }
  const velocityMap = new Map<string, SalesVelocityItem>();
  for (const item of data.sales_velocity.items) {
    velocityMap.set(item.item_id, item);
  }
  const underpromotedSet = new Set(
    data.underpromoted_high_margin.items.map((i) => i.item_id),
  );
  const riskSet = new Set(data.risk_items.items.map((i) => i.item_id));

  // Determine "star" items: high margin + high velocity
  const starItems = data.contribution_margin_analysis.items
    .filter((item) => {
      const vel = velocityMap.get(item.item_id);
      return item.margin_pct >= 60 && vel && vel.velocity_tier === "High";
    })
    .sort((a, b) => b.margin_pct - a.margin_pct)
    .slice(0, 5);

  // Under-promoted items
  const underPromotedItems = data.underpromoted_high_margin.items.slice(0, 5);

  // Risk items
  const riskItems = data.risk_items.items.slice(0, 3);

  // Top items by profitability for bar chart
  const topProfitItems = [...data.item_profitability.items]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 8);

  const topItemsChartConfig = {
    total_revenue: {
      label: "Revenue",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue intelligence overview for {data.restaurant_name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={summary.total_revenue}
          icon={DollarSign}
          format="currency"
        />
        <KpiCard
          title="Total Orders"
          value={summary.total_orders}
          icon={ShoppingCart}
        />
        <KpiCard
          title="Average Order Value"
          value={Math.round(summary.avg_order_value)}
          icon={TrendingUp}
          format="currency"
        />
        <KpiCard
          title="Avg Contribution Margin"
          value={Math.round(summary.avg_contribution_margin_pct)}
          icon={Percent}
          format="percent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Items by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Items by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={topItemsChartConfig}
              className="h-[280px] w-full"
            >
              <BarChart
                data={topProfitItems}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="item_name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  }
                />
                <Bar
                  dataKey="total_revenue"
                  fill="var(--color-chart-2)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={categoryChartConfig}
              className="h-[280px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="category"
                      hideLabel
                      formatter={(value, name) => (
                        <span>
                          {name}: {value}%
                        </span>
                      )}
                    />
                  }
                />
                <Pie
                  data={categoryPerformance}
                  dataKey="contribution"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={2}
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""} ${value ?? 0}%`}
                >
                  {categoryPerformance.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {categoryPerformance.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {cat.category} ({cat.contribution}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Star className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Top Star Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {starItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No star items found</p>
            )}
            {starItems.map((item) => {
              const vel = velocityMap.get(item.item_id);
              return (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between py-1"
                >
                  <div>
                    <p className="text-sm font-medium">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {vel ? `${vel.quantity_sold} sold` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {Math.round(item.margin_pct)}%
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Under-Promoted Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {underPromotedItems.length === 0 && (
              <p className="text-sm text-muted-foreground">None detected</p>
            )}
            {underPromotedItems.map((item) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.revenue)} revenue
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs text-amber-600 border-amber-300"
                >
                  {item.quantity_sold} sold
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base">Risk Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No risk items detected</p>
            )}
            {riskItems.map((item) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between"
              >
                <span className="text-sm">{item.item_name}</span>
                <Badge variant="destructive" className="text-xs">
                  {Math.round(item.margin_pct)}% margin
                </Badge>
              </div>
            ))}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Summary
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">Menu Items</span>
                </div>
                <span className="text-sm font-medium">
                  {summary.menu_items}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">Order Lines</span>
                </div>
                <span className="text-sm font-medium">
                  {summary.total_order_lines}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
