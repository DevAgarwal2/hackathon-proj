"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Store,
  Mic,
  Globe,
  Bell,
  Database,
  Link2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [posConnected, setPosConnected] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoUpsell, setAutoUpsell] = useState(true);
  const [multiLang, setMultiLang] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [realTimeAnalytics, setRealTimeAnalytics] = useState(true);
  const [inventoryLink, setInventoryLink] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure PoS integration, voice copilot, and system preferences
        </p>
      </div>

      <Tabs defaultValue="pos">
        <TabsList>
          <TabsTrigger value="pos" className="cursor-pointer">
            <Store className="h-3.5 w-3.5 mr-1.5" />
            PoS Integration
          </TabsTrigger>
          <TabsTrigger value="voice" className="cursor-pointer">
            <Mic className="h-3.5 w-3.5 mr-1.5" />
            Voice Copilot
          </TabsTrigger>
          <TabsTrigger value="general" className="cursor-pointer">
            <SettingsIcon className="h-3.5 w-3.5 mr-1.5" />
            General
          </TabsTrigger>
        </TabsList>

        {/* PoS Integration Tab */}
        <TabsContent value="pos" className="space-y-4 mt-4">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">PoS Connection</CardTitle>
                  <CardDescription>
                    Connect your Point of Sale system for seamless order syncing
                  </CardDescription>
                </div>
                <Badge
                  variant={posConnected ? "default" : "destructive"}
                  className="text-xs"
                >
                  {posConnected ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {posConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pos-provider">PoS Provider</Label>
                  <Select defaultValue="petpooja">
                    <SelectTrigger id="pos-provider" className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petpooja">Petpooja</SelectItem>
                      <SelectItem value="posist">POSist</SelectItem>
                      <SelectItem value="torqus">Torqus</SelectItem>
                      <SelectItem value="limetray">LimeTray</SelectItem>
                      <SelectItem value="gofrugal">GoFrugal</SelectItem>
                      <SelectItem value="custom">Custom API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    defaultValue="pk_live_xxxxxxxxxxxxxxx"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-id">Store ID</Label>
                  <Input
                    id="store-id"
                    defaultValue="STORE-MUM-042"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    defaultValue="https://api.spicegarden.in/webhooks/pos"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync Orders</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically push AI-structured orders to PoS
                  </p>
                </div>
                <Switch
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Inventory Linkage</Label>
                  <p className="text-xs text-muted-foreground">
                    Link menu intelligence with real-time inventory data
                  </p>
                </div>
                <Switch
                  checked={inventoryLink}
                  onCheckedChange={setInventoryLink}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Test Connection
                </Button>
                <Button className="cursor-pointer">Save Configuration</Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Sync Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    time: "2 min ago",
                    event: "Voice Order #VO-1847 synced to PoS",
                    status: "success",
                  },
                  {
                    time: "15 min ago",
                    event: "Menu prices updated in PoS (3 items)",
                    status: "success",
                  },
                  {
                    time: "1 hr ago",
                    event: "New combo 'Royal Feast' added to PoS menu",
                    status: "success",
                  },
                  {
                    time: "2 hrs ago",
                    event: "Inventory sync failed - timeout",
                    status: "error",
                  },
                  {
                    time: "3 hrs ago",
                    event: "Daily sales data imported from PoS",
                    status: "success",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span className="text-sm">{item.event}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Copilot Tab */}
        <TabsContent value="voice" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Voice Assistant Configuration
              </CardTitle>
              <CardDescription>
                Configure AI voice ordering preferences and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Voice Ordering</Label>
                  <p className="text-xs text-muted-foreground">
                    Accept phone-based orders via AI assistant
                  </p>
                </div>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                  className="cursor-pointer"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Upselling</Label>
                  <p className="text-xs text-muted-foreground">
                    AI suggests add-ons based on upsell rules during calls
                  </p>
                </div>
                <Switch
                  checked={autoUpsell}
                  onCheckedChange={setAutoUpsell}
                  className="cursor-pointer"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Multi-Language Support</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable Hindi, Tamil, Telugu, Kannada, Marathi, Bengali
                  </p>
                </div>
                <Switch
                  checked={multiLang}
                  onCheckedChange={setMultiLang}
                  className="cursor-pointer"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-lang">Default Language</Label>
                  <Select defaultValue="hindi">
                    <SelectTrigger id="default-lang" className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                      <SelectItem value="telugu">Telugu</SelectItem>
                      <SelectItem value="kannada">Kannada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-upsell">Max Upsell Attempts</Label>
                  <Select defaultValue="2">
                    <SelectTrigger
                      id="max-upsell"
                      className="cursor-pointer"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 per order</SelectItem>
                      <SelectItem value="2">2 per order</SelectItem>
                      <SelectItem value="3">3 per order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Input
                    id="greeting"
                    defaultValue="Namaste! Welcome to Spice Garden."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call-timeout">Call Timeout (sec)</Label>
                  <Input
                    id="call-timeout"
                    type="number"
                    defaultValue="180"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="cursor-pointer">
                  Save Voice Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Voice Model Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voice Model Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Speech-to-Text
                  </p>
                  <p className="text-sm font-medium">Whisper v3 Large</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="border rounded-lg p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    NLU Engine
                  </p>
                  <p className="text-sm font-medium">GPT-4o Mini</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="border rounded-lg p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Text-to-Speech
                  </p>
                  <p className="text-sm font-medium">ElevenLabs Multilingual</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Restaurant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rest-name">Restaurant Name</Label>
                  <Input id="rest-name" defaultValue="Spice Garden" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rest-location">Location</Label>
                  <Input
                    id="rest-location"
                    defaultValue="Andheri West, Mumbai"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rest-phone">Phone</Label>
                  <Input
                    id="rest-phone"
                    defaultValue="+91 98765 43210"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rest-type">Cuisine Type</Label>
                  <Select defaultValue="north-indian">
                    <SelectTrigger id="rest-type" className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north-indian">North Indian</SelectItem>
                      <SelectItem value="south-indian">South Indian</SelectItem>
                      <SelectItem value="multi-cuisine">
                        Multi-Cuisine
                      </SelectItem>
                      <SelectItem value="chinese">Indo-Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Analytics & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Real-Time Analytics</Label>
                  <p className="text-xs text-muted-foreground">
                    Stream live sales data to dashboard
                  </p>
                </div>
                <Switch
                  checked={realTimeAnalytics}
                  onCheckedChange={setRealTimeAnalytics}
                  className="cursor-pointer"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alert Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified for underperforming items, failed orders, and
                    margin alerts
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  className="cursor-pointer"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data-refresh">Data Refresh Interval</Label>
                  <Select defaultValue="5">
                    <SelectTrigger
                      id="data-refresh"
                      className="cursor-pointer"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every 1 minute</SelectItem>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data-retention">Data Retention</Label>
                  <Select defaultValue="90">
                    <SelectTrigger
                      id="data-retention"
                      className="cursor-pointer"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="cursor-pointer">Save Settings</Button>
                <Button variant="outline" className="cursor-pointer">
                  <Database className="h-3.5 w-3.5 mr-1.5" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
