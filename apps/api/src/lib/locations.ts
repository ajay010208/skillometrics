// Pan-India location data: states with major districts/cities.
export const INDIA_STATES: Array<{ state: string; districts: string[] }> = [
  { state: "Andhra Pradesh", districts: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"] },
  { state: "Assam", districts: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"] },
  { state: "Bihar", districts: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"] },
  { state: "Chhattisgarh", districts: ["Raipur", "Bhilai", "Bilaspur", "Korba"] },
  { state: "Delhi", districts: ["New Delhi", "Dwarka", "Rohini", "Noida Ext."] },
  { state: "Goa", districts: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"] },
  { state: "Gujarat", districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"] },
  { state: "Haryana", districts: ["Gurugram", "Faridabad", "Panipat", "Ambala"] },
  { state: "Himachal Pradesh", districts: ["Shimla", "Dharamshala", "Mandi", "Solan"] },
  { state: "Jharkhand", districts: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"] },
  { state: "Karnataka", districts: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru"] },
  { state: "Kerala", districts: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"] },
  { state: "Madhya Pradesh", districts: ["Indore", "Bhopal", "Jabalpur", "Gwalior"] },
  { state: "Maharashtra", districts: ["Pune", "Mumbai", "Nagpur", "Nashik", "Aurangabad", "Thane"] },
  { state: "Odisha", districts: ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"] },
  { state: "Punjab", districts: ["Ludhiana", "Amritsar", "Jalandhar", "Mohali"] },
  { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Kota", "Udaipur"] },
  { state: "Tamil Nadu", districts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"] },
  { state: "Telangana", districts: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"] },
  { state: "Uttar Pradesh", districts: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Ghaziabad"] },
  { state: "Uttarakhand", districts: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"] },
  { state: "West Bengal", districts: ["Kolkata", "Howrah", "Siliguri", "Durgapur"] },
];

export interface StateHit {
  state: string;
  districts: string[];
  score: number;
}

/** Case-insensitive substring + fuzzy prefix search: "gu" → Gujarat, "uta" → Uttar Pradesh / Uttarakhand. */
export function searchStates(query: string, limit = 8): StateHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return INDIA_STATES.slice(0, limit).map((s) => ({ ...s, score: 0 }));
  }
  const hits: StateHit[] = [];
  for (const s of INDIA_STATES) {
    const name = s.state.toLowerCase();
    let score = -1;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else {
      // word-start match: "madhya" matches "madhya pradesh", initials "up" match too
      const words = name.split(" ");
      if (words.some((w) => w.startsWith(q))) score = 50;
      else if (words.map((w) => w[0]).join("").startsWith(q)) score = 40;
    }
    if (score >= 0) hits.push({ ...s, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function districtsFor(state: string): string[] {
  const s = INDIA_STATES.find((x) => x.state.toLowerCase() === state.toLowerCase());
  return s?.districts ?? [];
}

export function isValidStateDistrict(state: string, district: string): boolean {
  return districtsFor(state).some((d) => d.toLowerCase() === district.toLowerCase());
}
