// ============================================================
// Auth helpers — hardcoded credentials for hackathon demo
// (Supabase secret key cannot be used in browser, so we
//  embed the 30 restaurant logins directly here.)
// ============================================================

export interface RestaurantUser {
  id: string;
  restaurant_id: string;
  email: string;
  password: string;
  created_at: string;
}

const CREDENTIALS: { email: string; password: string; restaurant_id: string }[] = [
  { email: "dosbros@revcopilot.ai", password: "dosbros123", restaurant_id: "R001" },
  { email: "tresamigos@revcopilot.ai", password: "tresamigos123", restaurant_id: "R002" },
  { email: "mexicano@revcopilot.ai", password: "mexicano123", restaurant_id: "R003" },
  { email: "tacobell@revcopilot.ai", password: "tacobell123", restaurant_id: "R004" },
  { email: "burritoboys@revcopilot.ai", password: "burritoboys123", restaurant_id: "R005" },
  { email: "salepepe@revcopilot.ai", password: "salepepe123", restaurant_id: "R006" },
  { email: "littlefrench@revcopilot.ai", password: "littlefrench123", restaurant_id: "R007" },
  { email: "pizzaiiolo@revcopilot.ai", password: "pizzaiiolo123", restaurant_id: "R008" },
  { email: "lapinoz@revcopilot.ai", password: "lapinoz123", restaurant_id: "R009" },
  { email: "ciaopizzeria@revcopilot.ai", password: "ciaopizzeria123", restaurant_id: "R010" },
  { email: "gordhanthal@revcopilot.ai", password: "gordhanthal123", restaurant_id: "R011" },
  { email: "agashiye@revcopilot.ai", password: "agashiye123", restaurant_id: "R012" },
  { email: "rajwadu@revcopilot.ai", password: "rajwadu123", restaurant_id: "R013" },
  { email: "atithi@revcopilot.ai", password: "atithi123", restaurant_id: "R014" },
  { email: "sasuji@revcopilot.ai", password: "sasuji123", restaurant_id: "R015" },
  { email: "barbeque@revcopilot.ai", password: "barbeque123", restaurant_id: "R016" },
  { email: "thetrophy@revcopilot.ai", password: "thetrophy123", restaurant_id: "R017" },
  { email: "burntturnt@revcopilot.ai", password: "burntturnt123", restaurant_id: "R018" },
  { email: "pakwan@revcopilot.ai", password: "pakwan123", restaurant_id: "R019" },
  { email: "tandoorstory@revcopilot.ai", password: "tandoorstory123", restaurant_id: "R020" },
  { email: "jamieoliver@revcopilot.ai", password: "jamieoliver123", restaurant_id: "R021" },
  { email: "foo@revcopilot.ai", password: "foo123", restaurant_id: "R022" },
  { email: "bentob@revcopilot.ai", password: "bentob123", restaurant_id: "R023" },
  { email: "chinesewok@revcopilot.ai", password: "chinesewok123", restaurant_id: "R024" },
  { email: "sushito@revcopilot.ai", password: "sushito123", restaurant_id: "R025" },
  { email: "faasos@revcopilot.ai", password: "faasos123", restaurant_id: "R026" },
  { email: "behrouz@revcopilot.ai", password: "behrouz123", restaurant_id: "R027" },
  { email: "theobroma@revcopilot.ai", password: "theobroma123", restaurant_id: "R028" },
  { email: "lunchbox@revcopilot.ai", password: "lunchbox123", restaurant_id: "R029" },
  { email: "ovenstory@revcopilot.ai", password: "ovenstory123", restaurant_id: "R030" },
];

export const RESTAURANT_NAMES: Record<string, string> = {
  R001: "Dosbros Fresh Mexican Grill",
  R002: "Tres Amigos",
  R003: "Mexicano By The Bay",
  R004: "Taco Bell",
  R005: "Burrito Boys",
  R006: "Sale & Pepe",
  R007: "Little French House",
  R008: "Pizzaiiolo Wood Fired Pizza",
  R009: "La Pino'z Pizza",
  R010: "Ciao Pizzeria",
  R011: "Gordhan Thal",
  R012: "Agashiye",
  R013: "Rajwadu",
  R014: "Atithi Dining Hall",
  R015: "Sasuji Dining Hall",
  R016: "Barbeque Nation",
  R017: "The Trophy",
  R018: "Burnt Turnt",
  R019: "Pakwan Dining Hall",
  R020: "Tandoor Story",
  R021: "Jamie Oliver Kitchen",
  R022: "Foo",
  R023: "Bento B",
  R024: "Chinese Wok",
  R025: "Sushito",
  R026: "Faasos",
  R027: "Behrouz Biryani",
  R028: "Theobroma",
  R029: "LunchBox Meals",
  R030: "Oven Story Pizza",
};

/**
 * Authenticate by matching email + password against hardcoded credentials.
 * Returns a RestaurantUser-shaped object on success, null on failure.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<RestaurantUser | null> {
  const match = CREDENTIALS.find(
    (c) => c.email.toLowerCase() === email.toLowerCase().trim() && c.password === password,
  );
  if (!match) return null;
  return {
    id: match.restaurant_id,
    restaurant_id: match.restaurant_id,
    email: match.email,
    password: match.password,
    created_at: new Date().toISOString(),
  };
}

/**
 * Fetch the restaurant name for a given restaurant_id.
 */
export async function getRestaurantName(
  restaurantId: string,
): Promise<string | null> {
  return RESTAURANT_NAMES[restaurantId] ?? null;
}
