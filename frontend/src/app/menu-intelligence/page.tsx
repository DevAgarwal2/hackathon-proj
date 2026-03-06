"use client";

import { useState, useMemo } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Filter,
  Star,
  Puzzle,
  Cog,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Bar,
  BarChart,
  ResponsiveContainer,
} from "recharts";
import { menuItems, categoryPerformance, type MarginClass } from "@/lib/data";

const marginClassConfig: Record<
  MarginClass,
  { label: string; color: string; description: string }
> = {
  Star: {
    label: "Best Sellers",
    color: "text-amber-600",
    description: "High Profit & High Demand",
  },
  Puzzle: {
    label: "Hidden Gems",
    color: "text-blue-600",
    description: "High Profit but Low Demand",
  },
  Workhorse: {
    label: "Popular Items",
    color: "text-emerald-600",
    description: "High Demand but Low Profit",
  },
  Dog: {
    label: "Need Attention",
    color: "text-red-600",
    description: "Low Profit & Low Demand",
  },
};

const SCATTER_COLORS: Record<MarginClass, string> = {
  Star: "#d97706",
  Puzzle: "#2563eb",
  Workhorse: "#059669",
  Dog: "#dc2626",
};

const scatterChartConfig = {
  popularityScore: {
    label: "Popularity",
    color: "var(--color-chart-1)",
  },
  marginPercent: {
    label: "Margin %",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

const marginBarConfig = {
  contributionMargin: {
    label: "Contribution Margin (₹)",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

export default function MenuIntelligencePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesClass =
        classFilter === "all" || item.marginClass === classFilter;
      return matchesSearch && matchesCategory && matchesClass;
    });
  }, [searchQuery, categoryFilter, classFilter]);

  const categories = [...new Set(menuItems.map((i) => i.category))];

  const classCounts = useMemo(() => {
    const counts: Record<MarginClass, number> = {
      Star: 0,
      Puzzle: 0,
      Workhorse: 0,
      Dog: 0,
    };
    for (const item of menuItems) {
      counts[item.marginClass]++;
    }
    return counts;
  }, []);

  const scatterData = menuItems.map((item) => ({
    name: item.name,
    popularityScore: item.popularityScore,
    marginPercent: item.marginPercent,
    marginClass: item.marginClass,
    unitsSoldPerWeek: item.unitsSoldPerWeek,
  }));

  const topMarginItems = [...menuItems]
    .sort((a, b) => b.contributionMargin - a.contributionMargin)
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Menu Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Item-level profitability analysis and margin classification
        </p>
      </div>

      {/* Classification Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(marginClassConfig) as [MarginClass, typeof marginClassConfig.Star][]).map(
          ([key, config]) => (
            <Card
              key={key}
              className="cursor-pointer transition-colors duration-200 hover:bg-accent"
              onClick={() =>
                setClassFilter(classFilter === key ? "all" : key)
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  {config.label}
                  <span className={`text-lg font-bold ${config.color}`}>
                    {classCounts[key]}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {config.description}
                </p>
                {classFilter === key && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Active Filter
                  </Badge>
                )}
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profitability Matrix (Scatter) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Profitability Matrix
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Popularity vs Margin % — each dot is a menu item
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={scatterChartConfig}
              className="h-[320px] w-full"
            >
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="popularityScore"
                  name="Popularity"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Popularity Score",
                    position: "bottom",
                    fontSize: 11,
                    offset: -5,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="marginPercent"
                  name="Margin %"
                  domain={[40, 90]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                  label={{
                    value: "Margin %",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "marginPercent") return `${value}%`;
                        return `${value}`;
                      }}
                    />
                  }
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SCATTER_COLORS[entry.marginClass]}
                      r={6}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                <span className="text-xs text-muted-foreground">
                  Best Sellers
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-xs text-muted-foreground">
                  Hidden Gems
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <span className="text-xs text-muted-foreground">
                  Popular Items
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <span className="text-xs text-muted-foreground">
                  Need Attention
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Margin Items Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top 10 by Contribution Margin
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Absolute margin per unit sold (₹)
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={marginBarConfig}
              className="h-[320px] w-full"
            >
              <BarChart
                data={topMarginItems}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `₹${value}`}
                    />
                  }
                />
                <Bar
                  dataKey="contributionMargin"
                  fill="var(--color-chart-1)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Avg Margin</TableHead>
                <TableHead className="text-right">Contribution</TableHead>
                <TableHead className="w-[120px]">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryPerformance.map((cat) => (
                <TableRow key={cat.category}>
                  <TableCell className="font-medium">{cat.category}</TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{(cat.revenue / 1000).toFixed(0)}K
                  </TableCell>
                  <TableCell className="text-right">
                    {cat.orders.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {cat.avgMargin}%
                  </TableCell>
                  <TableCell className="text-right">
                    {cat.contribution}%
                  </TableCell>
                  <TableCell>
                    <Progress value={cat.contribution * 3} className="h-2" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Item Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">
              Item-Level Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 w-[200px]"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[150px] cursor-pointer">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-9 w-[130px] cursor-pointer">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="Star">Best Sellers</SelectItem>
                  <SelectItem value="Puzzle">Hidden Gems</SelectItem>
                  <SelectItem value="Workhorse">Popular Items</SelectItem>
                  <SelectItem value="Dog">Need Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Food Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Units/wk</TableHead>
                  <TableHead>Velocity</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.category}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{item.sellingPrice}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{item.foodCost}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ₹{item.contributionMargin}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${
                          item.marginPercent >= 70
                            ? "text-emerald-600"
                            : item.marginPercent >= 55
                              ? "text-foreground"
                              : "text-red-500"
                        }`}
                      >
                        {item.marginPercent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.unitsSoldPerWeek}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.salesVelocity === "High"
                            ? "default"
                            : item.salesVelocity === "Medium"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {item.salesVelocity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${marginClassConfig[item.marginClass].color}`}
                      >
                        {marginClassConfig[item.marginClass].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {item.trending === "up" ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                        ) : item.trending === "down" ? (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span
                          className={`text-xs ${
                            item.trending === "up"
                              ? "text-emerald-600"
                              : item.trending === "down"
                                ? "text-red-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {item.trendPercent > 0 ? "+" : ""}
                          {item.trendPercent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.isUnderPromoted && (
                          <Badge
                            variant="outline"
                            className="text-xs text-amber-600 border-amber-300"
                          >
                            Under-promoted
                          </Badge>
                        )}
                        {item.isHighRisk && (
                          <Badge variant="destructive" className="text-xs">
                            Risk
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filteredItems.length} of {menuItems.length} items
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
