"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  Send,
  MessageSquare,
  User,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  fetchVoiceOrders,
  fetchVoiceSessions,
  getRestaurantId,
  type VoiceOrderRow,
  type VoiceSession,
  type ConversationLogEntry,
} from "@/lib/api";

// Group order rows by order_id into sessions
interface VoiceSessionGrouped {
  order_id: string;
  order_datetime: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  tax: number;
  status: string;
  payment_status: string;
  order_type: string;
}

function groupOrdersIntoSessions(orders: VoiceOrderRow[]): VoiceSessionGrouped[] {
  const map = new Map<string, VoiceOrderRow[]>();
  for (const row of orders) {
    const existing = map.get(row.order_id) || [];
    existing.push(row);
    map.set(row.order_id, existing);
  }

  return Array.from(map.entries()).map(([order_id, rows]) => {
    const first = rows[0];
    return {
      order_id,
      order_datetime: first.order_datetime,
      items: rows.map((r) => ({
        name: r.item_name,
        quantity: r.quantity,
        price: r.line_total,
      })),
      total: first.total_amount,
      tax: first.tax_amount,
      status: first.order_status,
      payment_status: first.payment_status,
      order_type: first.order_type,
    };
  });
}

export default function VoiceCopilotPage() {
  const [sessions, setSessions] = useState<VoiceSessionGrouped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voice sessions with conversation logs
  const [voiceSessions, setVoiceSessions] = useState<VoiceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<VoiceSession | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    fetchVoiceOrders(undefined, 50)
      .then((res) => {
        setSessions(groupOrdersIntoSessions(res.orders));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    // Fetch voice sessions with conversation logs
    fetchVoiceSessions(undefined, 20)
      .then((res) => {
        setVoiceSessions(res.sessions);
      })
      .catch((e) => console.error("Failed to fetch voice sessions:", e))
      .finally(() => setSessionsLoading(false));
  }, []);

  const totalOrderValue = sessions.reduce((s, sess) => s + sess.total, 0);
  const avgOrderValue = sessions.length > 0 ? totalOrderValue / sessions.length : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Copilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered ordering with real-time upselling
          </p>
        </div>
      </div>

      {/* Voice Stats KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Voice Orders
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From AI Agent source
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Voice Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Math.round(totalOrderValue).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All AI agent orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Math.round(avgOrderValue).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per voice session
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Items/Order
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0
                ? (sessions.reduce((s, sess) => s + sess.items.length, 0) / sessions.length).toFixed(1)
                : "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items per order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Conversation Sessions + Selected Session Order */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* AI Conversation Sessions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                AI Voice Sessions
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {voiceSessions.length} Sessions
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Recent conversations with AI voice agent
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : voiceSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No AI voice sessions found.
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {voiceSessions.map((session) => {
                    const dt = new Date(session.created_at);
                    const dateStr = dt.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    });
                    const timeStr = dt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const logCount = session.conversation_log?.length || 0;
                    
                    return (
                      <div
                        key={session.order_id}
                        onClick={() => setSelectedSession(session)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSession?.order_id === session.order_id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-xs text-muted-foreground">
                              {session.order_id.slice(0, 12)}...
                            </span>
                          </div>
                          <Badge 
                            variant={session.status === "confirmed" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {dateStr} {timeStr}
                          </span>
                          <span className="font-medium">
                            ₹{session.total_amount}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{session.items?.length || 0} items</span>
                          <span>{logCount} messages</span>
                          <span className="uppercase">{session.language}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Selected Session Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {selectedSession ? "Order Details" : "Select a Session"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedSession ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click on a session from the list to view order details.
              </p>
            ) : (
              <>
                {/* Order Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-xs">{selectedSession.order_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={selectedSession.status === "confirmed" ? "secondary" : "outline"} className="text-xs">
                      {selectedSession.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold">₹{selectedSession.total_amount}</span>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Items</h4>
                  <div className="space-y-2">
                    {selectedSession.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.quantity}x</span>
                          <span>{item.item_name}</span>
                        </div>
                        <span className="font-mono">₹{item.total_price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Conversation Log */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    Conversation ({selectedSession.conversation_log?.length || 0} messages)
                  </h4>
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    <div className="space-y-3">
                      {selectedSession.conversation_log?.map((log: ConversationLogEntry, i) => (
                        <div key={i} className="space-y-2">
                          {/* Customer Message */}
                          <div className="flex gap-2">
                            <User className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                              {log.customer_message}
                            </div>
                          </div>
                          {/* AI Response */}
                          <div className="flex gap-2">
                            <Bot className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                            <div className="text-xs bg-primary/10 text-primary rounded px-2 py-1">
                              {log.ai_response}
                            </div>
                          </div>
                          {/* Tool Calls */}
                          {log.tool_calls?.length > 0 && (
                            <div className="flex gap-2 ml-5">
                              <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-0.5">
                                Tools: {log.tool_calls.map((t) => t.tool).join(", ")}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Voice Order Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Voice Orders</CardTitle>
          <p className="text-xs text-muted-foreground">
            Order history from AI voice agent (order_source: AI Agent)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm py-4">{error}</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No AI voice orders found for this restaurant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const dt = new Date(session.order_datetime);
                  const dateStr = dt.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  });
                  const timeStr = dt.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <TableRow key={session.order_id}>
                      <TableCell className="font-mono text-xs">
                        {session.order_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {dateStr} {timeStr}
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
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {session.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ₹{Math.round(session.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            session.payment_status === "Paid"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {session.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            session.status === "Delivered"
                              ? "secondary"
                              : session.status === "Cancelled"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {session.status === "Delivered" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {session.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
