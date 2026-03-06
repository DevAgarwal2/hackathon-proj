"use client";

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
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  kpiSummary,
  dailySales,
  categoryPerformance,
  hourlySales,
  menuItems,
} from "@/lib/data";

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const ordersChartConfig = {
  orders: {
    label: "Orders",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

const hourlyChartConfig = {
  orders: {
    label: "Orders",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const categoryChartConfig = categoryPerformance.reduce(
  (acc, item, index) => {
    const colors = [
      "var(--color-chart-1)",
      "var(--color-chart-2)",
      "var(--color-chart-3)",
      "var(--color-chart-4)",
      "var(--color-chart-5)",
      "var(--color-primary)",
      "var(--color-muted-foreground)",
    ];
    acc[item.category] = {
      label: item.category,
      color: colors[index % colors.length],
    };
    return acc;
  },
  {} as Record<string, { label: string; color: string }>,
) satisfies ChartConfig;

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
  trend,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number;
  trend: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: "currency" | "number" | "percent";
}) {
  const isPositive = trend >= 0;
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
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {isPositive ? "+" : ""}
            {trend}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const stars = menuItems.filter((i) => i.marginClass === "Star");
  const underperforming = menuItems.filter(
    (i) => i.marginClass === "Dog" || i.isHighRisk,
  );
  const underPromoted = menuItems.filter((i) => i.isUnderPromoted);
  const last7Days = dailySales.slice(-7);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue intelligence overview for your restaurant
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue (MTD)"
          value={kpiSummary.totalRevenue}
          trend={kpiSummary.revenueTrend}
          icon={DollarSign}
          format="currency"
        />
        <KpiCard
          title="Total Orders"
          value={kpiSummary.totalOrders}
          trend={kpiSummary.ordersTrend}
          icon={ShoppingCart}
        />
        <KpiCard
          title="Average Order Value"
          value={kpiSummary.averageOrderValue}
          trend={kpiSummary.aovTrend}
          icon={TrendingUp}
          format="currency"
        />
        <KpiCard
          title="Avg Contribution Margin"
          value={kpiSummary.avgContributionMargin}
          trend={kpiSummary.marginTrend}
          icon={Percent}
          format="percent"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={revenueChartConfig}
              className="h-[280px] w-full"
            >
              <AreaChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-chart-1)"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Daily Orders (Last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={ordersChartConfig}
              className="h-[280px] w-full"
            >
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return d.toLocaleDateString("en-IN", { weekday: "short" });
                  }}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="orders"
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hourly Order Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={hourlyChartConfig}
              className="h-[280px] w-full"
            >
              <LineChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

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
                      formatter={(value) => `${value}%`}
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
            {stars.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.unitsSoldPerWeek} units/wk
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {item.marginPercent}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Under-Promoted Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {underPromoted.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{item.contributionMargin} margin/unit
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs text-amber-600 border-amber-300"
                >
                  {item.unitsSoldPerWeek}/wk
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base">Alerts & Voice Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Risk Items
              </p>
              {underperforming.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{item.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {item.marginClass}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Voice Copilot
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">Accuracy</span>
                </div>
                <span className="text-sm font-medium">
                  {kpiSummary.voiceOrderAccuracy}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">Upsell Rate</span>
                </div>
                <span className="text-sm font-medium">
                  {kpiSummary.voiceUpsellRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">Daily Voice Orders</span>
                </div>
                <span className="text-sm font-medium">
                  {kpiSummary.dailyVoiceOrders}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
