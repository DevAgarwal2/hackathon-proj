"use client";

import { useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  ShoppingCart,
  Volume2,
  AlertCircle,
  Headphones,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { voiceOrderSessions, kpiSummary } from "@/lib/data";

const languageStats = [
  { language: "Hindi", count: 22, percentage: 45.8 },
  { language: "English", count: 12, percentage: 25.0 },
  { language: "Tamil", count: 6, percentage: 12.5 },
  { language: "Telugu", count: 4, percentage: 8.3 },
  { language: "Kannada", count: 4, percentage: 8.3 },
];

const LANG_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const langChartConfig = languageStats.reduce(
  (acc, item, index) => {
    acc[item.language] = {
      label: item.language,
      color: LANG_COLORS[index % LANG_COLORS.length],
    };
    return acc;
  },
  {} as Record<string, { label: string; color: string }>,
) satisfies ChartConfig;

const hourlyVoiceData = [
  { hour: "12 PM", calls: 5 },
  { hour: "1 PM", calls: 8 },
  { hour: "2 PM", calls: 4 },
  { hour: "6 PM", calls: 3 },
  { hour: "7 PM", calls: 7 },
  { hour: "8 PM", calls: 10 },
  { hour: "9 PM", calls: 8 },
  { hour: "10 PM", calls: 3 },
];

const hourlyChartConfig = {
  calls: {
    label: "Voice Calls",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

interface LiveOrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface ConversationMessage {
  role: "ai" | "customer";
  text: string;
  timestamp: string;
}

export default function VoiceCopilotPage() {
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("Hindi");
  const [liveOrderItems, setLiveOrderItems] = useState<LiveOrderItem[]>([
    { name: "Butter Chicken", quantity: 1, price: 380 },
    { name: "Garlic Naan", quantity: 3, price: 240 },
  ]);
  const [upsellShown, setUpsellShown] = useState(false);

  const [conversation] = useState<ConversationMessage[]>([
    {
      role: "ai",
      text: "Namaste! Welcome to Spice Garden. How may I help you today?",
      timestamp: "8:32:00 PM",
    },
    {
      role: "customer",
      text: "Haan, mujhe ek Butter Chicken aur teen Garlic Naan chahiye.",
      timestamp: "8:32:08 PM",
    },
    {
      role: "ai",
      text: "Sure! I've added 1 Butter Chicken (₹380) and 3 Garlic Naan (₹240). Your current total is ₹620. Would you also like to add a Dal Makhani? It pairs great with Butter Chicken!",
      timestamp: "8:32:15 PM",
    },
    {
      role: "customer",
      text: "Haan, Dal Makhani bhi add kar do.",
      timestamp: "8:32:22 PM",
    },
    {
      role: "ai",
      text: "Added Dal Makhani (₹260). Your updated total is ₹880. May I also suggest a Gulab Jamun to complete your meal? It's our most popular dessert!",
      timestamp: "8:32:28 PM",
    },
  ]);

  const liveTotal = liveOrderItems.reduce(
    (sum, item) => sum + item.price,
    0,
  );

  const completedSessions = voiceOrderSessions.filter(
    (s) => s.status === "completed",
  );
  const failedSessions = voiceOrderSessions.filter(
    (s) => s.status === "failed",
  );
  const upsellAccepted = voiceOrderSessions.filter(
    (s) => s.upsellAccepted,
  );
  const avgDuration =
    voiceOrderSessions.reduce((sum, s) => sum + s.duration, 0) /
    voiceOrderSessions.length;

  const handleToggleListening = useCallback(() => {
    setIsListening((prev) => !prev);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Copilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered phone ordering with real-time upselling
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isListening ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
            />
            <span className="text-sm text-muted-foreground">
              {isListening ? "Active" : "Inactive"}
            </span>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {kpiSummary.activeVoiceSessions} live sessions
          </Badge>
        </div>
      </div>

      {/* Voice Stats KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Order Accuracy
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiSummary.voiceOrderAccuracy}%
            </div>
            <Progress value={kpiSummary.voiceOrderAccuracy} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upsell Conversion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiSummary.voiceUpsellRate}%
            </div>
            <Progress value={kpiSummary.voiceUpsellRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Call Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(avgDuration / 60)}m {Math.round(avgDuration % 60)}s
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {voiceOrderSessions.length} sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Voice Orders
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiSummary.dailyVoiceOrders}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">
                +18%
              </span>
              <span className="text-xs text-muted-foreground">
                vs last week
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Live Demo + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Live Voice Ordering Demo */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Live Voice Order Session
              </CardTitle>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="w-[130px] h-8 cursor-pointer">
                  <Globe className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                  <SelectItem value="Telugu">Telugu</SelectItem>
                  <SelectItem value="Kannada">Kannada</SelectItem>
                  <SelectItem value="Marathi">Marathi</SelectItem>
                  <SelectItem value="Bengali">Bengali</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conversation */}
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-4">
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.role === "ai"
                          ? "bg-muted"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.role === "ai" ? (
                          <Headphones className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          {msg.role === "ai" ? "AI Copilot" : "Customer"}
                        </span>
                        <span className="text-xs opacity-60">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  className="cursor-pointer"
                  onClick={handleToggleListening}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Start Listening
                    </>
                  )}
                </Button>
                <Button variant="outline" className="cursor-pointer" size="lg">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              </div>
              {isListening && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${12 + Math.random() * 16}px`,
                          animationDelay: `${i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Listening in {selectedLanguage}...
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Order Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Current Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {liveOrderItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-mono">₹{item.price}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subtotal</span>
              <span className="text-lg font-bold font-mono">₹{liveTotal}</span>
            </div>

            {/* Upsell Suggestion */}
            <div className="border rounded-lg p-3 bg-accent/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  AI Upsell Suggestion
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Gulab Jamun</p>
                  <p className="text-xs text-muted-foreground">
                    Dessert attach rate: 45% conversion
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs h-7 cursor-pointer"
                    onClick={() => {
                      if (!upsellShown) {
                        setLiveOrderItems((prev) => [
                          ...prev,
                          { name: "Gulab Jamun", quantity: 2, price: 240 },
                        ]);
                        setUpsellShown(true);
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 cursor-pointer"
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </div>

            <Button className="w-full cursor-pointer" size="lg">
              Push to PoS
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Language Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Multi-language voice ordering breakdown
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={langChartConfig}
              className="h-[240px] w-full"
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
                  data={languageStats}
                  dataKey="percentage"
                  nameKey="language"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {languageStats.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={LANG_COLORS[index % LANG_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {languageStats.map((lang, i) => (
                <div key={lang.language} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: LANG_COLORS[i % LANG_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {lang.language} ({lang.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Voice Call Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Voice Call Volume by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={hourlyChartConfig}
              className="h-[280px] w-full"
            >
              <BarChart data={hourlyVoiceData}>
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
                  width={30}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="calls"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Voice Order Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Voice Sessions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Order history from AI voice assistant
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Upsell</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voiceOrderSessions.map((session) => {
                const time = new Date(session.timestamp).toLocaleTimeString(
                  "en-IN",
                  { hour: "2-digit", minute: "2-digit" },
                );
                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-sm">{time}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {session.language}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {session.items.map((item, i) => (
                          <span
                            key={i}
                            className="text-xs text-muted-foreground"
                          >
                            {item.name}
                            {item.quantity > 1 ? ` x${item.quantity}` : ""}
                            {i < session.items.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ₹{session.total}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {Math.floor(session.duration / 60)}m{" "}
                      {session.duration % 60}s
                    </TableCell>
                    <TableCell>
                      {session.upsellOffered ? (
                        <div className="flex items-center gap-1">
                          {session.upsellAccepted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs">
                            {session.upsellOffered}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "secondary"
                            : session.status === "failed"
                              ? "destructive"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {session.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : session.status === "failed" ? (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {session.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
