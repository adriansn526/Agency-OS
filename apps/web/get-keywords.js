// get-keywords.ts
import * as dotenv from "dotenv";

// lib/integrations/dataforseo.ts
function getAuthHeader() {
  const token = process.env.DATAFORSEO_AUTH_TOKEN;
  if (!token) return {};
  return {
    "Authorization": `Basic ${token}`,
    "Content-Type": "application/json"
  };
}
async function getRelatedKeywords(keyword, locationCode = 2642, languageCode = "ro") {
  try {
    const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify([{
        keyword,
        location_code: locationCode,
        language_code: languageCode,
        limit: 50
      }])
    });
    if (!res.ok) {
      throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const results = data.tasks?.[0]?.result?.[0]?.items || [];
    return results.map((item) => ({
      keyword: item.keyword_data?.keyword || item.keyword,
      search_volume: item.keyword_data?.keyword_info?.search_volume || item.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || item.keyword_info?.cpc || 0,
      competition: item.keyword_data?.keyword_info?.competition || item.keyword_info?.competition || 0,
      keyword_difficulty: item.keyword_data?.keyword_info?.keyword_difficulty || item.keyword_info?.keyword_difficulty || 0,
      search_intent: item.keyword_data?.keyword_properties?.search_intent || item.keyword_properties?.search_intent || []
    }));
  } catch (error) {
    console.error("[DataForSEO] getRelatedKeywords error:", error);
    return [];
  }
}

// get-keywords.ts
dotenv.config({ path: ".env.local" });
async function main() {
  const target = "aviz de munca";
  console.log(`
=== Related Keywords for: ${target} ===`);
  try {
    const keywords = await getRelatedKeywords(target);
    if (keywords && keywords.length > 0) {
      keywords.sort((a, b) => b.search_volume - a.search_volume);
      for (const kw of keywords.slice(0, 30)) {
        console.log(`- ${kw.keyword} (Vol: ${kw.search_volume}, Diff: ${kw.keyword_difficulty}, CPC: ${kw.cpc})`);
      }
    } else {
      console.log("No related keywords found.");
    }
  } catch (e) {
    console.log("Error fetching details for " + target);
    console.error(e);
  }
}
main().catch(console.error);
