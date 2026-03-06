// ============================================================
// Restaurant Revenue Intelligence Dataset
// ============================================================

export type MenuCategory =
  | "Starters"
  | "Main Course"
  | "Biryani"
  | "Breads"
  | "Desserts"
  | "Beverages"
  | "Sides";

export type MarginClass = "Star" | "Puzzle" | "Workhorse" | "Dog";

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  sellingPrice: number;
  foodCost: number;
  contributionMargin: number;
  marginPercent: number;
  unitsSoldPerWeek: number;
  salesVelocity: "High" | "Medium" | "Low";
  popularityScore: number; // 1-100
  marginClass: MarginClass;
  isUnderPromoted: boolean;
  isHighRisk: boolean;
  trending: "up" | "down" | "stable";
  trendPercent: number;
}

export interface ComboRecommendation {
  id: string;
  name: string;
  items: string[];
  originalTotal: number;
  comboPrice: number;
  discount: number;
  projectedUplift: number; // percentage increase in AOV
  confidence: number; // 0-100
  associationStrength: number; // 0-1
}

export interface UpsellRule {
  id: string;
  triggerItem: string;
  suggestItem: string;
  reason: string;
  expectedConversion: number; // percent
  revenueImpact: number; // per order
  priority: "High" | "Medium" | "Low";
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface CategoryPerformance {
  category: MenuCategory;
  revenue: number;
  orders: number;
  avgMargin: number;
  contribution: number; // percent of total revenue
}

export interface HourlySales {
  hour: string;
  orders: number;
  revenue: number;
}

// ---- Menu Items Dataset (Indian Restaurant) ----
export const menuItems: MenuItem[] = [
  // Starters
  {
    id: "s1",
    name: "Paneer Tikka",
    category: "Starters",
    sellingPrice: 320,
    foodCost: 95,
    contributionMargin: 225,
    marginPercent: 70.3,
    unitsSoldPerWeek: 145,
    salesVelocity: "High",
    popularityScore: 88,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 12,
  },
  {
    id: "s2",
    name: "Chicken Seekh Kebab",
    category: "Starters",
    sellingPrice: 280,
    foodCost: 110,
    contributionMargin: 170,
    marginPercent: 60.7,
    unitsSoldPerWeek: 120,
    salesVelocity: "High",
    popularityScore: 82,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 2,
  },
  {
    id: "s3",
    name: "Mutton Galouti Kebab",
    category: "Starters",
    sellingPrice: 420,
    foodCost: 180,
    contributionMargin: 240,
    marginPercent: 57.1,
    unitsSoldPerWeek: 35,
    salesVelocity: "Low",
    popularityScore: 32,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -8,
  },
  {
    id: "s4",
    name: "Veg Spring Roll",
    category: "Starters",
    sellingPrice: 180,
    foodCost: 85,
    contributionMargin: 95,
    marginPercent: 52.8,
    unitsSoldPerWeek: 90,
    salesVelocity: "Medium",
    popularityScore: 55,
    marginClass: "Workhorse",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 0,
  },
  {
    id: "s5",
    name: "Fish Amritsari",
    category: "Starters",
    sellingPrice: 350,
    foodCost: 165,
    contributionMargin: 185,
    marginPercent: 52.9,
    unitsSoldPerWeek: 42,
    salesVelocity: "Low",
    popularityScore: 38,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -5,
  },
  // Main Course
  {
    id: "m1",
    name: "Butter Chicken",
    category: "Main Course",
    sellingPrice: 380,
    foodCost: 130,
    contributionMargin: 250,
    marginPercent: 65.8,
    unitsSoldPerWeek: 210,
    salesVelocity: "High",
    popularityScore: 96,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 8,
  },
  {
    id: "m2",
    name: "Dal Makhani",
    category: "Main Course",
    sellingPrice: 260,
    foodCost: 55,
    contributionMargin: 205,
    marginPercent: 78.8,
    unitsSoldPerWeek: 175,
    salesVelocity: "High",
    popularityScore: 91,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 6,
  },
  {
    id: "m3",
    name: "Paneer Butter Masala",
    category: "Main Course",
    sellingPrice: 300,
    foodCost: 85,
    contributionMargin: 215,
    marginPercent: 71.7,
    unitsSoldPerWeek: 165,
    salesVelocity: "High",
    popularityScore: 89,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 3,
  },
  {
    id: "m4",
    name: "Mutton Rogan Josh",
    category: "Main Course",
    sellingPrice: 450,
    foodCost: 220,
    contributionMargin: 230,
    marginPercent: 51.1,
    unitsSoldPerWeek: 55,
    salesVelocity: "Low",
    popularityScore: 45,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -12,
  },
  {
    id: "m5",
    name: "Chicken Biryani (Plate)",
    category: "Main Course",
    sellingPrice: 320,
    foodCost: 155,
    contributionMargin: 165,
    marginPercent: 51.6,
    unitsSoldPerWeek: 190,
    salesVelocity: "High",
    popularityScore: 93,
    marginClass: "Workhorse",
    isUnderPromoted: false,
    isHighRisk: true,
    trending: "up",
    trendPercent: 15,
  },
  {
    id: "m6",
    name: "Palak Paneer",
    category: "Main Course",
    sellingPrice: 280,
    foodCost: 70,
    contributionMargin: 210,
    marginPercent: 75.0,
    unitsSoldPerWeek: 48,
    salesVelocity: "Low",
    popularityScore: 35,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -15,
  },
  {
    id: "m7",
    name: "Chole Bhature",
    category: "Main Course",
    sellingPrice: 220,
    foodCost: 65,
    contributionMargin: 155,
    marginPercent: 70.5,
    unitsSoldPerWeek: 130,
    salesVelocity: "High",
    popularityScore: 78,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 1,
  },
  {
    id: "m8",
    name: "Fish Curry",
    category: "Main Course",
    sellingPrice: 360,
    foodCost: 185,
    contributionMargin: 175,
    marginPercent: 48.6,
    unitsSoldPerWeek: 38,
    salesVelocity: "Low",
    popularityScore: 28,
    marginClass: "Dog",
    isUnderPromoted: false,
    isHighRisk: true,
    trending: "down",
    trendPercent: -20,
  },
  // Biryani
  {
    id: "b1",
    name: "Hyderabadi Chicken Dum Biryani",
    category: "Biryani",
    sellingPrice: 350,
    foodCost: 140,
    contributionMargin: 210,
    marginPercent: 60.0,
    unitsSoldPerWeek: 230,
    salesVelocity: "High",
    popularityScore: 97,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 18,
  },
  {
    id: "b2",
    name: "Mutton Biryani",
    category: "Biryani",
    sellingPrice: 420,
    foodCost: 210,
    contributionMargin: 210,
    marginPercent: 50.0,
    unitsSoldPerWeek: 110,
    salesVelocity: "Medium",
    popularityScore: 72,
    marginClass: "Workhorse",
    isUnderPromoted: false,
    isHighRisk: true,
    trending: "stable",
    trendPercent: 2,
  },
  {
    id: "b3",
    name: "Veg Biryani",
    category: "Biryani",
    sellingPrice: 250,
    foodCost: 60,
    contributionMargin: 190,
    marginPercent: 76.0,
    unitsSoldPerWeek: 85,
    salesVelocity: "Medium",
    popularityScore: 58,
    marginClass: "Star",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "stable",
    trendPercent: -1,
  },
  {
    id: "b4",
    name: "Egg Biryani",
    category: "Biryani",
    sellingPrice: 230,
    foodCost: 75,
    contributionMargin: 155,
    marginPercent: 67.4,
    unitsSoldPerWeek: 45,
    salesVelocity: "Low",
    popularityScore: 30,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -10,
  },
  // Breads
  {
    id: "br1",
    name: "Butter Naan",
    category: "Breads",
    sellingPrice: 60,
    foodCost: 12,
    contributionMargin: 48,
    marginPercent: 80.0,
    unitsSoldPerWeek: 450,
    salesVelocity: "High",
    popularityScore: 95,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 1,
  },
  {
    id: "br2",
    name: "Garlic Naan",
    category: "Breads",
    sellingPrice: 80,
    foodCost: 18,
    contributionMargin: 62,
    marginPercent: 77.5,
    unitsSoldPerWeek: 320,
    salesVelocity: "High",
    popularityScore: 90,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 5,
  },
  {
    id: "br3",
    name: "Lachha Paratha",
    category: "Breads",
    sellingPrice: 70,
    foodCost: 20,
    contributionMargin: 50,
    marginPercent: 71.4,
    unitsSoldPerWeek: 95,
    salesVelocity: "Medium",
    popularityScore: 48,
    marginClass: "Workhorse",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 0,
  },
  {
    id: "br4",
    name: "Stuffed Kulcha",
    category: "Breads",
    sellingPrice: 120,
    foodCost: 35,
    contributionMargin: 85,
    marginPercent: 70.8,
    unitsSoldPerWeek: 55,
    salesVelocity: "Low",
    popularityScore: 40,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -6,
  },
  // Desserts
  {
    id: "d1",
    name: "Gulab Jamun",
    category: "Desserts",
    sellingPrice: 120,
    foodCost: 25,
    contributionMargin: 95,
    marginPercent: 79.2,
    unitsSoldPerWeek: 180,
    salesVelocity: "High",
    popularityScore: 85,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 3,
  },
  {
    id: "d2",
    name: "Rasmalai",
    category: "Desserts",
    sellingPrice: 150,
    foodCost: 40,
    contributionMargin: 110,
    marginPercent: 73.3,
    unitsSoldPerWeek: 95,
    salesVelocity: "Medium",
    popularityScore: 65,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 8,
  },
  {
    id: "d3",
    name: "Phirni",
    category: "Desserts",
    sellingPrice: 130,
    foodCost: 45,
    contributionMargin: 85,
    marginPercent: 65.4,
    unitsSoldPerWeek: 28,
    salesVelocity: "Low",
    popularityScore: 22,
    marginClass: "Dog",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "down",
    trendPercent: -18,
  },
  {
    id: "d4",
    name: "Kulfi",
    category: "Desserts",
    sellingPrice: 100,
    foodCost: 22,
    contributionMargin: 78,
    marginPercent: 78.0,
    unitsSoldPerWeek: 40,
    salesVelocity: "Low",
    popularityScore: 33,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -5,
  },
  // Beverages
  {
    id: "bv1",
    name: "Masala Chai",
    category: "Beverages",
    sellingPrice: 60,
    foodCost: 8,
    contributionMargin: 52,
    marginPercent: 86.7,
    unitsSoldPerWeek: 380,
    salesVelocity: "High",
    popularityScore: 92,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 2,
  },
  {
    id: "bv2",
    name: "Mango Lassi",
    category: "Beverages",
    sellingPrice: 120,
    foodCost: 30,
    contributionMargin: 90,
    marginPercent: 75.0,
    unitsSoldPerWeek: 150,
    salesVelocity: "High",
    popularityScore: 80,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "up",
    trendPercent: 10,
  },
  {
    id: "bv3",
    name: "Fresh Lime Soda",
    category: "Beverages",
    sellingPrice: 80,
    foodCost: 12,
    contributionMargin: 68,
    marginPercent: 85.0,
    unitsSoldPerWeek: 200,
    salesVelocity: "High",
    popularityScore: 76,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 1,
  },
  {
    id: "bv4",
    name: "Rose Sharbat",
    category: "Beverages",
    sellingPrice: 90,
    foodCost: 15,
    contributionMargin: 75,
    marginPercent: 83.3,
    unitsSoldPerWeek: 25,
    salesVelocity: "Low",
    popularityScore: 18,
    marginClass: "Puzzle",
    isUnderPromoted: true,
    isHighRisk: false,
    trending: "down",
    trendPercent: -22,
  },
  // Sides
  {
    id: "si1",
    name: "Raita",
    category: "Sides",
    sellingPrice: 60,
    foodCost: 15,
    contributionMargin: 45,
    marginPercent: 75.0,
    unitsSoldPerWeek: 280,
    salesVelocity: "High",
    popularityScore: 70,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 1,
  },
  {
    id: "si2",
    name: "Papad Basket",
    category: "Sides",
    sellingPrice: 80,
    foodCost: 18,
    contributionMargin: 62,
    marginPercent: 77.5,
    unitsSoldPerWeek: 210,
    salesVelocity: "High",
    popularityScore: 68,
    marginClass: "Star",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "stable",
    trendPercent: 0,
  },
  {
    id: "si3",
    name: "Green Salad",
    category: "Sides",
    sellingPrice: 100,
    foodCost: 40,
    contributionMargin: 60,
    marginPercent: 60.0,
    unitsSoldPerWeek: 35,
    salesVelocity: "Low",
    popularityScore: 20,
    marginClass: "Dog",
    isUnderPromoted: false,
    isHighRisk: false,
    trending: "down",
    trendPercent: -25,
  },
];

// ---- Daily Sales Data (Last 30 days) ----
export const dailySales: DailySales[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 4 - (29 - i));
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const baseRevenue = isWeekend ? 85000 : 62000;
  const baseOrders = isWeekend ? 220 : 160;
  const variance = 0.85 + Math.random() * 0.3;
  const revenue = Math.round(baseRevenue * variance);
  const orders = Math.round(baseOrders * variance);
  return {
    date: date.toISOString().split("T")[0],
    revenue,
    orders,
    aov: Math.round(revenue / orders),
  };
});

// ---- Category Performance ----
export const categoryPerformance: CategoryPerformance[] = [
  {
    category: "Main Course",
    revenue: 485000,
    orders: 1420,
    avgMargin: 62.3,
    contribution: 32.1,
  },
  {
    category: "Biryani",
    revenue: 368000,
    orders: 1080,
    avgMargin: 58.7,
    contribution: 24.4,
  },
  {
    category: "Starters",
    revenue: 195000,
    orders: 620,
    avgMargin: 61.5,
    contribution: 12.9,
  },
  {
    category: "Beverages",
    revenue: 142000,
    orders: 1830,
    avgMargin: 82.5,
    contribution: 9.4,
  },
  {
    category: "Breads",
    revenue: 128000,
    orders: 2200,
    avgMargin: 76.2,
    contribution: 8.5,
  },
  {
    category: "Desserts",
    revenue: 108000,
    orders: 820,
    avgMargin: 73.8,
    contribution: 7.1,
  },
  {
    category: "Sides",
    revenue: 84000,
    orders: 1260,
    avgMargin: 72.4,
    contribution: 5.6,
  },
];

// ---- Hourly Sales Pattern ----
export const hourlySales: HourlySales[] = [
  { hour: "10 AM", orders: 15, revenue: 4200 },
  { hour: "11 AM", orders: 35, revenue: 11500 },
  { hour: "12 PM", orders: 85, revenue: 32000 },
  { hour: "1 PM", orders: 110, revenue: 42500 },
  { hour: "2 PM", orders: 75, revenue: 28000 },
  { hour: "3 PM", orders: 30, revenue: 9800 },
  { hour: "4 PM", orders: 20, revenue: 6500 },
  { hour: "5 PM", orders: 25, revenue: 8200 },
  { hour: "6 PM", orders: 45, revenue: 16500 },
  { hour: "7 PM", orders: 95, revenue: 38000 },
  { hour: "8 PM", orders: 120, revenue: 48500 },
  { hour: "9 PM", orders: 100, revenue: 39000 },
  { hour: "10 PM", orders: 55, revenue: 20800 },
  { hour: "11 PM", orders: 20, revenue: 7500 },
];

// ---- Combo Recommendations ----
export const comboRecommendations: ComboRecommendation[] = [
  {
    id: "c1",
    name: "Royal Feast Combo",
    items: ["Butter Chicken", "Butter Naan (2)", "Dal Makhani", "Mango Lassi"],
    originalTotal: 780,
    comboPrice: 649,
    discount: 16.8,
    projectedUplift: 22,
    confidence: 94,
    associationStrength: 0.87,
  },
  {
    id: "c2",
    name: "Biryani Special",
    items: [
      "Hyderabadi Chicken Dum Biryani",
      "Raita",
      "Papad Basket",
      "Gulab Jamun",
    ],
    originalTotal: 610,
    comboPrice: 499,
    discount: 18.2,
    projectedUplift: 28,
    confidence: 91,
    associationStrength: 0.92,
  },
  {
    id: "c3",
    name: "Vegetarian Delight",
    items: [
      "Paneer Tikka",
      "Paneer Butter Masala",
      "Garlic Naan (2)",
      "Fresh Lime Soda",
    ],
    originalTotal: 780,
    comboPrice: 629,
    discount: 19.4,
    projectedUplift: 18,
    confidence: 88,
    associationStrength: 0.81,
  },
  {
    id: "c4",
    name: "Weekend Family Pack",
    items: [
      "Chicken Seekh Kebab",
      "Butter Chicken",
      "Mutton Biryani",
      "Butter Naan (4)",
      "Raita",
      "Gulab Jamun (2)",
    ],
    originalTotal: 1420,
    comboPrice: 1149,
    discount: 19.1,
    projectedUplift: 35,
    confidence: 86,
    associationStrength: 0.78,
  },
  {
    id: "c5",
    name: "Quick Lunch Box",
    items: ["Chole Bhature", "Masala Chai", "Raita"],
    originalTotal: 340,
    comboPrice: 279,
    discount: 17.9,
    projectedUplift: 15,
    confidence: 82,
    associationStrength: 0.74,
  },
  {
    id: "c6",
    name: "Kebab Platter Premium",
    items: [
      "Paneer Tikka",
      "Chicken Seekh Kebab",
      "Mutton Galouti Kebab",
      "Garlic Naan (2)",
      "Mango Lassi",
    ],
    originalTotal: 1180,
    comboPrice: 949,
    discount: 19.6,
    projectedUplift: 25,
    confidence: 79,
    associationStrength: 0.71,
  },
];

// ---- Upsell Rules ----
export const upsellRules: UpsellRule[] = [
  {
    id: "u1",
    triggerItem: "Butter Chicken",
    suggestItem: "Garlic Naan",
    reason: "92% of Butter Chicken orders include bread",
    expectedConversion: 78,
    revenueImpact: 80,
    priority: "High",
  },
  {
    id: "u2",
    triggerItem: "Hyderabadi Chicken Dum Biryani",
    suggestItem: "Raita",
    reason: "High pairing affinity - 85% co-order rate",
    expectedConversion: 72,
    revenueImpact: 60,
    priority: "High",
  },
  {
    id: "u3",
    triggerItem: "Any Main Course",
    suggestItem: "Gulab Jamun",
    reason: "Dessert attach rate can increase AOV by 12%",
    expectedConversion: 45,
    revenueImpact: 120,
    priority: "Medium",
  },
  {
    id: "u4",
    triggerItem: "Paneer Butter Masala",
    suggestItem: "Butter Naan",
    reason: "Bread pairing boosts ticket by avg 60",
    expectedConversion: 82,
    revenueImpact: 60,
    priority: "High",
  },
  {
    id: "u5",
    triggerItem: "Any Biryani",
    suggestItem: "Mango Lassi",
    reason: "Beverage upsell with biryani - 40% attach rate",
    expectedConversion: 40,
    revenueImpact: 120,
    priority: "Medium",
  },
  {
    id: "u6",
    triggerItem: "Chole Bhature",
    suggestItem: "Masala Chai",
    reason: "Traditional pairing - 65% co-order rate",
    expectedConversion: 65,
    revenueImpact: 60,
    priority: "High",
  },
  {
    id: "u7",
    triggerItem: "Chicken Seekh Kebab",
    suggestItem: "Mutton Galouti Kebab",
    reason: "Premium kebab upsell - high margin item promotion",
    expectedConversion: 25,
    revenueImpact: 420,
    priority: "Medium",
  },
  {
    id: "u8",
    triggerItem: "Any Order > 500",
    suggestItem: "Rasmalai",
    reason: "Premium dessert for high-value orders",
    expectedConversion: 35,
    revenueImpact: 150,
    priority: "Low",
  },
];

// ---- Price Optimization Recommendations ----
export interface PriceRecommendation {
  id: string;
  itemName: string;
  currentPrice: number;
  recommendedPrice: number;
  change: number;
  changePercent: number;
  reason: string;
  estimatedRevenueImpact: number;
  confidence: number;
  risk: "Low" | "Medium" | "High";
}

export const priceRecommendations: PriceRecommendation[] = [
  {
    id: "p1",
    itemName: "Palak Paneer",
    currentPrice: 280,
    recommendedPrice: 250,
    change: -30,
    changePercent: -10.7,
    reason:
      "High margin (75%) but low sales. Price reduction to stimulate demand.",
    estimatedRevenueImpact: 15000,
    confidence: 78,
    risk: "Low",
  },
  {
    id: "p2",
    itemName: "Chicken Biryani (Plate)",
    currentPrice: 320,
    recommendedPrice: 350,
    change: 30,
    changePercent: 9.4,
    reason:
      "High demand (190/wk) with low margin. Market can sustain price increase.",
    estimatedRevenueImpact: 24000,
    confidence: 85,
    risk: "Medium",
  },
  {
    id: "p3",
    itemName: "Mutton Galouti Kebab",
    currentPrice: 420,
    recommendedPrice: 380,
    change: -40,
    changePercent: -9.5,
    reason: "Premium item with weak velocity. Lower price to drive trial.",
    estimatedRevenueImpact: 12000,
    confidence: 72,
    risk: "Medium",
  },
  {
    id: "p4",
    itemName: "Veg Biryani",
    currentPrice: 250,
    recommendedPrice: 270,
    change: 20,
    changePercent: 8.0,
    reason: "76% margin with stable demand. Slight increase justified.",
    estimatedRevenueImpact: 8500,
    confidence: 80,
    risk: "Low",
  },
  {
    id: "p5",
    itemName: "Fish Curry",
    currentPrice: 360,
    recommendedPrice: 320,
    change: -40,
    changePercent: -11.1,
    reason:
      "Dog classification - low margin, low volume. Reduce or consider removing.",
    estimatedRevenueImpact: 5000,
    confidence: 65,
    risk: "High",
  },
  {
    id: "p6",
    itemName: "Stuffed Kulcha",
    currentPrice: 120,
    recommendedPrice: 100,
    change: -20,
    changePercent: -16.7,
    reason: "Under-promoted with 70% margin. Price drop to increase adoption.",
    estimatedRevenueImpact: 6500,
    confidence: 74,
    risk: "Low",
  },
];

// ---- Voice Order Session Data ----
export interface VoiceOrderSession {
  id: string;
  timestamp: string;
  language: string;
  duration: number; // seconds
  items: { name: string; quantity: number; price: number }[];
  upsellOffered: string | null;
  upsellAccepted: boolean;
  total: number;
  status: "completed" | "in-progress" | "failed";
  errorType: string | null;
}

export const voiceOrderSessions: VoiceOrderSession[] = [
  {
    id: "vo1",
    timestamp: "2026-03-05T19:32:00",
    language: "Hindi",
    duration: 95,
    items: [
      { name: "Butter Chicken", quantity: 1, price: 380 },
      { name: "Butter Naan", quantity: 3, price: 180 },
      { name: "Dal Makhani", quantity: 1, price: 260 },
    ],
    upsellOffered: "Gulab Jamun",
    upsellAccepted: true,
    total: 940,
    status: "completed",
    errorType: null,
  },
  {
    id: "vo2",
    timestamp: "2026-03-05T19:45:00",
    language: "English",
    duration: 72,
    items: [
      { name: "Hyderabadi Chicken Dum Biryani", quantity: 2, price: 700 },
      { name: "Raita", quantity: 2, price: 120 },
    ],
    upsellOffered: "Mango Lassi",
    upsellAccepted: false,
    total: 820,
    status: "completed",
    errorType: null,
  },
  {
    id: "vo3",
    timestamp: "2026-03-05T20:10:00",
    language: "Tamil",
    duration: 120,
    items: [
      { name: "Paneer Tikka", quantity: 1, price: 320 },
      { name: "Paneer Butter Masala", quantity: 1, price: 300 },
      { name: "Garlic Naan", quantity: 4, price: 320 },
      { name: "Mango Lassi", quantity: 2, price: 240 },
    ],
    upsellOffered: "Rasmalai",
    upsellAccepted: true,
    total: 1330,
    status: "completed",
    errorType: null,
  },
  {
    id: "vo4",
    timestamp: "2026-03-05T20:25:00",
    language: "Hindi",
    duration: 45,
    items: [{ name: "Chole Bhature", quantity: 2, price: 440 }],
    upsellOffered: "Masala Chai",
    upsellAccepted: true,
    total: 560,
    status: "completed",
    errorType: null,
  },
  {
    id: "vo5",
    timestamp: "2026-03-05T20:40:00",
    language: "Telugu",
    duration: 150,
    items: [
      { name: "Mutton Biryani", quantity: 1, price: 420 },
      { name: "Chicken Seekh Kebab", quantity: 1, price: 280 },
    ],
    upsellOffered: "Gulab Jamun",
    upsellAccepted: false,
    total: 700,
    status: "failed",
    errorType: "Payment timeout",
  },
  {
    id: "vo6",
    timestamp: "2026-03-05T21:00:00",
    language: "Kannada",
    duration: 88,
    items: [
      { name: "Veg Biryani", quantity: 1, price: 250 },
      { name: "Paneer Tikka", quantity: 1, price: 320 },
      { name: "Fresh Lime Soda", quantity: 2, price: 160 },
    ],
    upsellOffered: "Kulfi",
    upsellAccepted: true,
    total: 830,
    status: "completed",
    errorType: null,
  },
];

// ---- KPI Summaries ----
export const kpiSummary = {
  totalRevenue: 1510000,
  revenueTrend: 8.5,
  totalOrders: 8250,
  ordersTrend: 5.2,
  averageOrderValue: 183,
  aovTrend: 3.1,
  avgContributionMargin: 67.4,
  marginTrend: 1.8,
  topSellingItem: "Hyderabadi Chicken Dum Biryani",
  topMarginItem: "Masala Chai",
  underperformingItems: 5,
  comboConversionRate: 34,
  voiceOrderAccuracy: 96.8,
  voiceUpsellRate: 62,
  activeVoiceSessions: 3,
  dailyVoiceOrders: 48,
};

// ---- Weekly Trend Data ----
export const weeklyTrends = [
  { week: "W1", revenue: 345000, orders: 1850, aov: 186 },
  { week: "W2", revenue: 362000, orders: 1950, aov: 186 },
  { week: "W3", revenue: 388000, orders: 2100, aov: 185 },
  { week: "W4", revenue: 415000, orders: 2350, aov: 177 },
];
