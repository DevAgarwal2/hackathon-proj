"use client";

import { useState } from "react";
import {
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Zap,
  Target,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
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
  comboRecommendations,
  upsellRules,
  priceRecommendations,
} from "@/lib/data";

const comboChartConfig = {
  projectedUplift: {
    label: "Projected AOV Uplift %",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const priceChartConfig = {
  estimatedRevenueImpact: {
    label: "Revenue Impact (₹)",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export default function RevenueOptimizationPage() {
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);

  const totalPotentialRevenue = priceRecommendations.reduce(
    (sum, p) => sum + p.estimatedRevenueImpact,
    0,
  );
  const avgComboUplift =
    comboRecommendations.reduce((sum, c) => sum + c.projectedUplift, 0) /
    comboRecommendations.length;
  const highPriorityUpsells = upsellRules.filter(
    (u) => u.priority === "High",
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Revenue Optimization
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Smart combos, upsell strategies, and price optimization
          recommendations
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Potential Revenue Uplift
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalPotentialRevenue / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From price optimization alone
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Combo AOV Uplift
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{avgComboUplift.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {comboRecommendations.length} recommended combos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Priority Upsells
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityUpsells}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Of {upsellRules.length} total upsell rules active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Combo Recommendations
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comboRecommendations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI-generated from association analysis
            </p>
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
            {/* Combo uplift chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">
                  Projected AOV Uplift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={comboChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={comboRecommendations}
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
                      tickFormatter={(v) => `${v}%`}
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
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `+${value}%`}
                        />
                      }
                    />
                    <Bar
                      dataKey="projectedUplift"
                      fill="var(--color-chart-1)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Combo Cards */}
            <div className="lg:col-span-2 space-y-3">
              {comboRecommendations.map((combo) => (
                <Collapsible
                  key={combo.id}
                  open={expandedCombo === combo.id}
                  onOpenChange={() =>
                    setExpandedCombo(
                      expandedCombo === combo.id ? null : combo.id,
                    )
                  }
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-base">
                              {combo.name}
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {combo.confidence}% confidence
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold">
                                ₹{combo.comboPrice}
                              </p>
                              <p className="text-xs text-muted-foreground line-through">
                                ₹{combo.originalTotal}
                              </p>
                            </div>
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
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Discount
                            </p>
                            <p className="text-sm font-medium">
                              {combo.discount}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              AOV Uplift
                            </p>
                            <p className="text-sm font-medium text-emerald-600">
                              +{combo.projectedUplift}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Association
                            </p>
                            <Progress
                              value={combo.associationStrength * 100}
                              className="h-2 mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(combo.associationStrength * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Items included:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {combo.items.map((item) => (
                              <Badge
                                key={item}
                                variant="outline"
                                className="text-xs"
                              >
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
            </div>
          </div>
        </TabsContent>

        {/* Upsell Tab */}
        <TabsContent value="upsell" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Smart Upsell Prioritization
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                AI-ranked upsell rules based on conversion probability and
                revenue impact
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Trigger Item</TableHead>
                    <TableHead>Suggest Item</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Rev. Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upsellRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge
                          variant={
                            rule.priority === "High"
                              ? "default"
                              : rule.priority === "Medium"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {rule.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {rule.triggerItem}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                          <span>{rule.suggestItem}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                        {rule.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress
                            value={rule.expectedConversion}
                            className="h-1.5 w-16"
                          />
                          <span className="text-sm font-mono">
                            {rule.expectedConversion}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        +₹{rule.revenueImpact}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue impact chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">
                  Est. Revenue Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={priceChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={priceRecommendations}
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
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
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
                          formatter={(value) =>
                            `₹${Number(value).toLocaleString()}`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="estimatedRevenueImpact"
                      fill="var(--color-chart-2)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Price Recommendation Cards */}
            <div className="lg:col-span-2 space-y-3">
              {priceRecommendations.map((rec) => {
                const isIncrease = rec.change > 0;
                return (
                  <Card key={rec.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">
                              {rec.itemName}
                            </h3>
                            <Badge
                              variant={
                                rec.risk === "Low"
                                  ? "secondary"
                                  : rec.risk === "Medium"
                                    ? "outline"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {rec.risk === "Low" ? (
                                <ShieldCheck className="h-3 w-3 mr-1" />
                              ) : rec.risk === "High" ? (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              ) : null}
                              {rec.risk} Risk
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {rec.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rec.reason}
                          </p>
                          <div className="flex items-center gap-4 pt-1">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Current
                              </p>
                              <p className="text-sm font-mono font-medium">
                                ₹{rec.currentPrice}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {isIncrease ? (
                                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Recommended
                              </p>
                              <p
                                className={`text-sm font-mono font-bold ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                ₹{rec.recommendedPrice}
                              </p>
                            </div>
                            <div className="border-l pl-4">
                              <p className="text-xs text-muted-foreground">
                                Change
                              </p>
                              <p
                                className={`text-sm font-mono font-medium ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {isIncrease ? "+" : ""}
                                {rec.changePercent}%
                              </p>
                            </div>
                            <div className="border-l pl-4">
                              <p className="text-xs text-muted-foreground">
                                Est. Impact
                              </p>
                              <p className="text-sm font-mono font-bold text-emerald-600">
                                +₹{rec.estimatedRevenueImpact.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-4 cursor-pointer"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
