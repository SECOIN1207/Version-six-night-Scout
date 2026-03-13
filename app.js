document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    soloQuery: $("soloQuery"),
    soloCrowd: $("soloCrowd"),
    soloMusic: $("soloMusic"),
    soloVenue: $("soloVenue"),
    soloVibe: $("soloVibe"),

    locA: $("locA"),
    locB: $("locB"),
    groupList: $("groupList"),
    aiPrompt: $("aiPrompt"),

    results: $("results"),
    starterTowns: $("starterTowns"),

    searchBtn: $("searchBtn"),
    loadNJ: $("loadNJ"),
    middleBtn: $("middleBtn"),
    groupBtn: $("groupBtn"),
    aiBtn: $("aiBtn"),

    tabButtons: Array.from(document.querySelectorAll(".tab-btn")),

    panelSolo: $("panel-solo"),
    panelMiddle: $("panel-middle"),
    panelGroup: $("panel-group"),
    panelAi: $("panel-ai")
  };

  const STARTER_TOWNS = [
    "Hoboken, NJ 07030",
    "Weehawken, NJ 07087",
    "Jersey City, NJ 07302",
    "Newark, NJ 07105",
    "Fairview, NJ 07022",
    "Saddle Brook, NJ 07663",
    "Fort Lee, NJ 07024",
    "Montclair, NJ 07042",
    "Asbury Park, NJ 07712",
    "Point Pleasant Beach, NJ 08742",
    "Atlantic City, NJ 08401",
    "Bayonne, NJ 07002"
  ];

  const TOWN_FIXES = {
    "hoboken": "Hoboken, NJ 07030",
    "weehawken": "Weehawken, NJ 07087",
    "jersey city": "Jersey City, NJ 07302",
    "newark": "Newark, NJ 07105",
    "fairview": "Fairview, NJ 07022",
    "saddle brook": "Saddle Brook, NJ 07663",
    "saddlebrook": "Saddle Brook, NJ 07663",
    "fort lee": "Fort Lee, NJ 07024",
    "montclair": "Montclair, NJ 07042",
    "asbury park": "Asbury Park, NJ 07712",
    "point pleasant": "Point Pleasant Beach, NJ 08742",
    "point pleasant beach": "Point Pleasant Beach, NJ 08742",
    "atlantic city": "Atlantic City, NJ 08401",
    "bayonne": "Bayonne, NJ 07002",
    "sayreville": "Sayreville, NJ 08872",
    "clifton": "Clifton, NJ 07011",
    "rutherford": "Rutherford, NJ 07070",
    "east rutherford": "East Rutherford, NJ 07073",
    "englewood": "Englewood, NJ 07631",
    "glen rock": "Glen Rock, NJ 07452",
    "glenrock": "Glen Rock, NJ 07452",
    "new milford": "New Milford, NJ 07646",
    "north arlington": "North Arlington, NJ 07031",
    "kearny": "Kearny, NJ 07032",
    "belleville": "Belleville, NJ 07109",
    "secaucus": "Secaucus, NJ 07094"
  };

  const CUISINE_KEYWORDS = [
    "italian",
    "spanish",
    "portuguese",
    "brazilian",
    "sushi",
    "japanese",
    "steak",
    "steakhouse",
    "mediterranean",
    "greek",
    "moroccan",
    "ethiopian",
    "seafood",
    "mexican",
    "pizza",
    "brunch",
    "french",
    "indian",
    "halal"
  ];

  const FAST_FOOD_WORDS = [
    "mcdonald",
    "burger king",
    "wendy",
    "subway",
    "papa john",
    "domino",
    "taco bell",
    "kfc",
    "dunkin",
    "dunkin'",
    "chipotle",
    "arbys",
    "arby's",
    "popeyes",
    "white castle",
    "five guys",
    "roy rogers",
    "wingstop",
    "checkers",
    "rallys",
    "raising cane",
    "pizza hut",
    "little caesars"
  ];

  const DESSERT_WORDS = [
    "italian ice",
    "ice cream",
    "dessert",
    "gelato",
    "froyo",
    "frozen yogurt",
    "bakery",
    "donut",
    "coffee shop",
    "bubble tea",
    "boba",
    "dessert shop",
    "candy",
    "crepe"
  ];

  const MEDICAL_WORDS = [
    "urgent care",
    "medical",
    "doctor",
    "hospital",
    "clinic",
    "pharmacy",
    "rehab",
    "wellness center",
    "dentist",
    "orthodont",
    "veterinary",
    "animal hospital"
  ];

  const HARD_BLOCK_WORDS = [
    "toilets",
    "toilet",
    "fuel",
    "gas station",
    "service station",
    "post office",
    "post depot",
    "bus station",
    "bus stop",
    "bus terminal",
    "platform",
    "marina office",
    "pier office",
    "parking",
    "shower",
    "social centre",
    "social_center",
    "post_depot",
    "charging station",
    "car wash",
    "police",
    "fire station",
    "courthouse",
    "embassy",
    "school",
    "church",
    "bank",
    "atm",
    "hardware",
    "storage",
    "self storage",
    "warehouse",
    "fulfillment",
    "distribution",
    "office park",
    "industrial",
    "residence",
    "hotel lobby",
    "motel",
    "camp site",
    "camping",
    "rv park",
    "laundromat",
    "laundry",
    "shipping center",
    "mail room",
    "marina",
    "pier",
    "residence badus",
    "hotel",
    "hostel"
  ];

  const ALLOWED_AMENITIES = new Set([
    "bar",
    "pub",
    "nightclub",
    "biergarten",
    "restaurant",
    "cafe",
    "casino"
  ]);

  const KNOWN_HOBOKEN_DINNER_NAMES = [
    "dino",
    "halifax",
    "brass rail",
    "court street",
    "ainsworth",
    "lola",
    "city bistro",
    "madison"
  ];

  const KNOWN_HOBOKEN_DRINK_NAMES = [
    "ainsworth",
    "lola",
    "halifax",
    "city bistro",
    "madison",
    "brass rail",
    "court street"
  ];

  const KNOWN_HOBOKEN_CROWD_NAMES = [
    "city bistro",
    "madison",
    "lola",
    "ainsworth",
    "brass rail"
  ];

  const GEOCODE_CACHE = new Map();
  const REVERSE_CACHE = new Map();
  let lastMidpointState = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCase(text) {
    return String(text || "")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  function extractZip(text) {
    const m = String(text || "").match(/\b\d{5}\b/);
    return m ? m[0] : "";
  }

  function isZipOnly(text) {
    return /^\d{5}$/.test(String(text || "").trim());
  }

  function isLatLng(text) {
    return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(text || ""));
  }

  function parseLatLng(text) {
    const [lat, lng] = String(text).split(",").map((x) => parseFloat(x.trim()));
    return { lat, lng };
  }

  function midpoint(a, b) {
    return {
      lat: (a.lat + b.lat) / 2,
      lng: (a.lng + b.lng) / 2
    };
  }

  function centroid(points) {
    return {
      lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
      lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length
    };
  }

  function milesBetween(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = (d) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function hasAny(text, words) {
    const hay = normalize(text);
    return words.some((word) => hay.includes(normalize(word)));
  }

  function cleanLocationInput(text) {
    let q = String(text || "").trim();

    q = q.replace(/,+/g, ",");
    q = q.replace(/\s+/g, " ");
    q = q.replace(/\bSaddlebrook\b/gi, "Saddle Brook");
    q = q.replace(/\bNewark\s+New\s+Jersey\b/gi, "Newark, NJ");
    q = q.replace(/\bBayonne\s+New\s+Jersey\b/gi, "Bayonne, NJ");
    q = q.replace(/\bHoboken\s+New\s+Jersey\b/gi, "Hoboken, NJ");
    q = q.replace(/\bWeehawken\s+New\s+Jersey\b/gi, "Weehawken, NJ");
    q = q.replace(/\bFairview\s+New\s+Jersey\b/gi, "Fairview, NJ");
    q = q.replace(/\bNorth Arlington\s+New\s+Jersey\b/gi, "North Arlington, NJ");
    q = q.replace(/\bSecaucus\s+New\s+Jersey\b/gi, "Secaucus, NJ");
    q = q.replace(/\s+,/g, ",");
    q = q.replace(/,\s*,/g, ",");
    q = q.trim();

    if (isZipOnly(q)) {
      q = `${q}, New Jersey, USA`;
    }

    const norm = normalize(q);
    if (TOWN_FIXES[norm]) return TOWN_FIXES[norm];
    return q;
  }

  async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function geocodeManyLocations(lines) {
    const results = await Promise.allSettled(
      lines.map((line) => geocodeAddress(line))
    );

    const good = [];
    const bad = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled") good.push(r.value);
      else bad.push(lines[i]);
    });

    return { good, bad };
  }

  async function geocodeAddress(address) {
    const cleaned = cleanLocationInput(address);
    const cacheKey = `geo:${cleaned}`;

    if (GEOCODE_CACHE.has(cacheKey)) return GEOCODE_CACHE.get(cacheKey);

    if (isLatLng(cleaned)) {
      const parsed = parseLatLng(cleaned);
      const result = {
        lat: parsed.lat,
        lng: parsed.lng,
        display: `${parsed.lat}, ${parsed.lng}`,
        input: address
      };
      GEOCODE_CACHE.set(cacheKey, result);
      return result;
    }

    const zipHint = extractZip(cleaned);
    const wanted = normalize(cleaned);

    const query =
      cleaned.includes("NJ") || cleaned.includes("New Jersey") || isZipOnly(address)
        ? cleaned
        : `${cleaned}, New Jersey, USA`;

    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&countrycodes=us&q=` +
      encodeURIComponent(query);

    const res = await fetchJsonWithTimeout(
      url,
      { headers: { Accept: "application/json" } },
      12000
    );

    if (!res.ok) throw new Error("Could not look up that location");

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      throw new Error(`Town or ZIP not found: ${address}`);
    }

    const scored = data
      .map((item) => {
        const blob = normalize(
          [
            item.display_name,
            item.address?.city,
            item.address?.town,
            item.address?.village,
            item.address?.suburb,
            item.address?.county,
            item.address?.state,
            item.address?.postcode,
            item.address?.road,
            item.address?.house_number,
            item.address?.country
          ]
            .filter(Boolean)
            .join(" ")
        );

        let score = 0;

        if (item.address?.country_code === "us") score += 500;
        if (blob.includes("new jersey")) score += 1200;
        if (item.address?.state === "New Jersey") score += 1200;
        else score -= 1500;

        if (zipHint && blob.includes(zipHint)) score += 1400;
        if (zipHint && item.address?.postcode === zipHint) score += 800;

        wanted.split(" ").forEach((part) => {
          if (part && blob.includes(part)) score += 25;
        });

        if (item.class === "place") score += 30;
        if (["city", "town", "village", "postcode", "residential"].includes(item.type)) score += 30;

        if (blob.includes("italy")) score -= 5000;
        if (blob.includes("sardinia")) score -= 5000;

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score < 200) {
      throw new Error(`Could not cleanly match New Jersey location: ${address}`);
    }

    const result = {
      lat: parseFloat(best.item.lat),
      lng: parseFloat(best.item.lon),
      display: best.item.display_name,
      input: address
    };

    GEOCODE_CACHE.set(cacheKey, result);
    return result;
  }

  async function reverseGeocode(lat, lng) {
    const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (REVERSE_CACHE.has(key)) return REVERSE_CACHE.get(key);

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;

    const res = await fetchJsonWithTimeout(
      url,
      { headers: { Accept: "application/json" } },
      12000
    );

    if (!res.ok) throw new Error("Could not identify location");

    const data = await res.json();
    const addr = data.address || {};

    const town =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.hamlet ||
      "Unknown";

    const zip = addr.postcode || "";
    const county = addr.county || "";
    const state = addr.state || "New Jersey";

    const cleanArea = [town, county, state, zip].filter(Boolean).join(", ");

    const result = {
      town,
      zip,
      county,
      address: cleanArea
    };

    REVERSE_CACHE.set(key, result);
    return result;
  }

  function placeHay(place) {
    return normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${place.address || ""} ${JSON.stringify(place.tags || {})}`
    );
  }

  function isFastFood(place) {
    return hasAny(placeHay(place), FAST_FOOD_WORDS);
  }

  function isDessertOrSnackSpot(place) {
    return hasAny(placeHay(place), DESSERT_WORDS);
  }

  function isMedicalOrNonNight(place) {
    return hasAny(placeHay(place), MEDICAL_WORDS);
  }

  function isHardBlockedPlace(place) {
    return hasAny(placeHay(place), HARD_BLOCK_WORDS);
  }

  function isDeliLikeRestaurant(place) {
    const hay = placeHay(place);
    return (
      hay.includes("deli") ||
      hay.includes("delicatessen") ||
      hay.includes("sandwich shop") ||
      hay.includes("bagel") ||
      hay.includes("hero shop") ||
      hay.includes("sub shop")
    );
  }

  function isOfficeLikePlace(place) {
    const hay = placeHay(place);
    return (
      hay.includes("fulfillment") ||
      hay.includes("warehouse") ||
      hay.includes("distribution") ||
      hay.includes("office") ||
      hay.includes("logistics") ||
      hay.includes("industrial") ||
      hay.includes("storage")
    );
  }

  function isBadRestaurantCandidate(place) {
    return (
      isFastFood(place) ||
      isDessertOrSnackSpot(place) ||
      isMedicalOrNonNight(place) ||
      isHardBlockedPlace(place) ||
      isOfficeLikePlace(place)
    );
  }
  function isRelevantCandidate(tags = {}) {
    const amenity = String(tags.amenity || "").toLowerCase();
    const name = String(tags.name || "").toLowerCase();
    const cuisine = String(tags.cuisine || "").toLowerCase();
    const tourism = String(tags.tourism || "").toLowerCase();
    const leisure = String(tags.leisure || "").toLowerCase();
    const shop = String(tags.shop || "").toLowerCase();
    const text = `${amenity} ${name} ${cuisine} ${tourism} ${leisure} ${shop}`;

    if (ALLOWED_AMENITIES.has(amenity)) return true;

    if (
      text.includes("tavern") ||
      text.includes("lounge") ||
      text.includes("cocktail") ||
      text.includes("wine") ||
      text.includes("steakhouse") ||
      text.includes("bistro") ||
      text.includes("brasserie") ||
      text.includes("chophouse") ||
      text.includes("oyster") ||
      text.includes("seafood") ||
      text.includes("italian") ||
      text.includes("sushi") ||
      text.includes("spanish") ||
      text.includes("portuguese") ||
      text.includes("brazilian") ||
      text.includes("mediterranean") ||
      text.includes("greek") ||
      text.includes("moroccan") ||
      text.includes("ethiopian") ||
      text.includes("indian") ||
      text.includes("french") ||
      text.includes("brunch") ||
      text.includes("restaurant bar") ||
      text.includes("sports bar")
    ) {
      return true;
    }

    return false;
  }

  function classifyVenue(tags = {}) {
    const amenity = String(tags.amenity || "").toLowerCase();
    const name = String(tags.name || "").toLowerCase();
    const cuisine = String(tags.cuisine || "").toLowerCase();
    const tourism = String(tags.tourism || "").toLowerCase();
    const leisure = String(tags.leisure || "").toLowerCase();
    const sport = String(tags.sport || "").toLowerCase();
    const text = `${amenity} ${name} ${cuisine} ${tourism} ${leisure} ${sport}`;

    if (text.includes("casino") && (text.includes("club") || text.includes("nightclub"))) return "Casino Nightclub";
    if (amenity === "nightclub") return "Nightclub";
    if (text.includes("sports bar") || sport || text.includes("sports")) return "Sports Bar";
    if (amenity === "pub") return "Pub";
    if (amenity === "bar") return "Bar";
    if (text.includes("tavern")) return "Tavern";
    if (text.includes("lounge")) return "Lounge";
    if (text.includes("dive")) return "Dive Bar";
    if (text.includes("arcade")) return "Bar Arcade";
    if (text.includes("axe")) return "Axe Throwing";
    if (text.includes("billiard") || text.includes("pool hall")) return "Pool Hall";

    if (
      text.includes("concert") ||
      text.includes("music venue") ||
      text.includes("performing arts") ||
      text.includes("theater") ||
      tourism === "attraction"
    ) return "Concert Venue";

    if (text.includes("beach bar") || text.includes("boardwalk") || text.includes("beach")) return "Beach Bar";

    if (amenity === "restaurant" && (text.includes("bar") || text.includes("lounge"))) return "Restaurant Bar";
    if (amenity === "restaurant") return "Restaurant";
    if (amenity === "biergarten") return "Beer Garden";
    if (amenity === "casino") return "Casino";
    if (amenity === "cafe") return "Cafe";

    return "Venue";
  }

  function restaurantCuisineLabel(tags = {}) {
    const cuisine = String(tags.cuisine || "").toLowerCase();

    if (!cuisine) return "Restaurant";
    if (cuisine.includes("italian")) return "Italian";
    if (cuisine.includes("sushi") || cuisine.includes("japanese")) return "Sushi / Japanese";
    if (cuisine.includes("portuguese")) return "Portuguese";
    if (cuisine.includes("brazilian")) return "Brazilian";
    if (cuisine.includes("spanish")) return "Spanish";
    if (cuisine.includes("steak")) return "Steakhouse";
    if (cuisine.includes("pizza")) return "Pizza";
    if (cuisine.includes("mexican")) return "Mexican";
    if (cuisine.includes("mediterranean")) return "Mediterranean";
    if (cuisine.includes("greek")) return "Greek";
    if (cuisine.includes("moroccan")) return "Moroccan";
    if (cuisine.includes("ethiopian")) return "Ethiopian";
    if (cuisine.includes("seafood")) return "Seafood";
    if (cuisine.includes("brunch")) return "Brunch";
    if (cuisine.includes("french")) return "French";
    if (cuisine.includes("indian")) return "Indian";
    if (cuisine.includes("halal")) return "Halal";

    return titleCase(cuisine.split(";")[0].split(",")[0]);
  }

  function matchesMode(tags = {}, mode = "nightlife") {
    const amenity = String(tags.amenity || "").toLowerCase();
    const tourism = String(tags.tourism || "").toLowerCase();
    const leisure = String(tags.leisure || "").toLowerCase();
    const name = String(tags.name || "").toLowerCase();
    const cuisine = String(tags.cuisine || "").toLowerCase();
    const text = `${amenity} ${tourism} ${leisure} ${name} ${cuisine}`;

    const nightlifeMatch =
      amenity === "bar" ||
      amenity === "pub" ||
      amenity === "nightclub" ||
      amenity === "biergarten" ||
      amenity === "casino" ||
      text.includes("sports bar") ||
      text.includes("tavern") ||
      text.includes("lounge") ||
      text.includes("dive") ||
      text.includes("arcade") ||
      text.includes("axe") ||
      text.includes("pool hall") ||
      text.includes("billiard") ||
      text.includes("cocktail");

    const restaurantMatch =
      amenity === "restaurant" ||
      amenity === "cafe" ||
      cuisine.length > 0;

    if (mode === "restaurants") return restaurantMatch;

    if (mode === "nightlife") {
      return nightlifeMatch || (amenity === "restaurant" && (text.includes("bar") || text.includes("lounge")));
    }

    return nightlifeMatch || restaurantMatch;
  }
    async function fetchOverpass(url, query) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: query
    });

    if (!res.ok) throw new Error("Venue server failed");
    return res.json();
  }

  async function runOverpassWithFallback(query) {
    try {
      return await fetchOverpass("https://overpass-api.de/api/interpreter", query);
    } catch (_) {
      try {
        return await fetchOverpass("https://overpass.kumi.systems/api/interpreter", query);
      } catch (_) {
        return { elements: [] };
      }
    }
  }

  async function searchNearbyPlaces(lat, lng, mode = "nightlife", radiusMeters = 4200) {
    const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"](around:${radiusMeters},${lat},${lng});
  way["amenity"](around:${radiusMeters},${lat},${lng});
  relation["amenity"](around:${radiusMeters},${lat},${lng});
  node["tourism"](around:${radiusMeters},${lat},${lng});
  way["tourism"](around:${radiusMeters},${lat},${lng});
  relation["tourism"](around:${radiusMeters},${lat},${lng});
  node["leisure"](around:${radiusMeters},${lat},${lng});
  way["leisure"](around:${radiusMeters},${lat},${lng});
  relation["leisure"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`;

    const data = await runOverpassWithFallback(overpassQuery);
    const elements = Array.isArray(data.elements) ? data.elements : [];

    const mapped = elements
      .map((el) => {
        const tags = el.tags || {};
        const placeLat = el.lat ?? el.center?.lat;
        const placeLng = el.lon ?? el.center?.lon;

        const rawText = normalize(
          `${tags.name || ""} ${tags.amenity || ""} ${tags.cuisine || ""} ${tags.tourism || ""} ${tags.leisure || ""} ${tags.shop || ""}`
        );

        if (!placeLat || !placeLng || !tags.name) return null;
        if (!matchesMode(tags, mode)) return null;
        if (!isRelevantCandidate(tags)) return null;
        if (hasAny(rawText, HARD_BLOCK_WORDS)) return null;
        if (hasAny(rawText, MEDICAL_WORDS)) return null;
        if (hasAny(rawText, FAST_FOOD_WORDS)) return null;
        if (hasAny(rawText, DESSERT_WORDS)) return null;

        const phone = tags.phone || tags["contact:phone"] || "";
        const website = tags.website || tags["contact:website"] || tags.url || "";
        const hours = tags.opening_hours || tags["contact:opening_hours"] || "";
        const menu = tags.menu || tags["contact:menu"] || "";

        const fullAddress = [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
          tags["addr:postcode"]
        ]
          .filter(Boolean)
          .join(" ");

        return {
          name: tags.name,
          type: mode === "restaurants"
            ? restaurantCuisineLabel(tags)
            : classifyVenue(tags),
          lat: placeLat,
          lng: placeLng,
          address: fullAddress,
          phone,
          website,
          hours,
          menu,
          tags,
          townHint: tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "",
          zipHint: tags["addr:postcode"] || ""
        };
      })
      .filter(Boolean);

    const seen = new Set();
    const deduped = [];

    for (const item of mapped) {
      const key = `${normalize(item.name)}|${normalize(item.address)}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped;
  }
    async function enrichPlacesWithReverse(places, limit = 16) {
    const targets = places.slice(0, limit);

    await Promise.all(
      targets.map(async (place) => {
        try {
          const rev = await reverseGeocode(place.lat, place.lng);

          place.fullAddress = rev.address || place.address || "";
          place.townResolved = rev.town || place.townHint || "";
          place.zipResolved = rev.zip || place.zipHint || "";
          place.countyResolved = rev.county || "";

        } catch (_) {
          place.fullAddress = place.address || "";
          place.townResolved = place.townHint || "";
          place.zipResolved = place.zipHint || "";
          place.countyResolved = "";
        }
      })
    );

    return places;
  }

  function getPlaceZip(place) {
    return extractZip(
      place.zipResolved ||
      place.zipHint ||
      place.fullAddress ||
      place.address ||
      ""
    );
  }

  function getPlaceTown(place) {
    return normalize(
      place.townResolved ||
      place.townHint ||
      ""
    );
  }

  function filterPlacesForArea(places, areaInfo, center = null) {
    const targetZip = extractZip(areaInfo.zip || "");
    const targetTown = normalize(areaInfo.town || "");

    if (targetZip) {
      const zipMatches = places.filter(
        (p) => getPlaceZip(p) === targetZip
      );

      if (zipMatches.length) return zipMatches;
    }

    if (targetTown) {
      const townMatches = places.filter(
        (p) => getPlaceTown(p) === targetTown
      );

      if (townMatches.length) return townMatches;
    }

    if (center) {
      const nearMatches = places.filter(
        (p) =>
          milesBetween(center.lat, center.lng, p.lat, p.lng) <= 2.25
      );

      if (nearMatches.length) return nearMatches;
    }

    return [];
  }
    async function fetchOverpass(url, query) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: query
    });

    if (!res.ok) throw new Error("Venue server failed");
    return res.json();
  }

  async function runOverpassWithFallback(query) {
    try {
      return await fetchOverpass("https://overpass-api.de/api/interpreter", query);
    } catch (_) {
      try {
        return await fetchOverpass("https://overpass.kumi.systems/api/interpreter", query);
      } catch (_) {
        return { elements: [] };
      }
    }
  }

  async function searchNearbyPlaces(lat, lng, mode = "nightlife", radiusMeters = 4200) {
    const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"](around:${radiusMeters},${lat},${lng});
  way["amenity"](around:${radiusMeters},${lat},${lng});
  relation["amenity"](around:${radiusMeters},${lat},${lng});
  node["tourism"](around:${radiusMeters},${lat},${lng});
  way["tourism"](around:${radiusMeters},${lat},${lng});
  relation["tourism"](around:${radiusMeters},${lat},${lng});
  node["leisure"](around:${radiusMeters},${lat},${lng});
  way["leisure"](around:${radiusMeters},${lat},${lng});
  relation["leisure"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`;

    const data = await runOverpassWithFallback(overpassQuery);
    const elements = Array.isArray(data.elements) ? data.elements : [];

    const mapped = elements
      .map((el) => {
        const tags = el.tags || {};
        const placeLat = el.lat ?? el.center?.lat;
        const placeLng = el.lon ?? el.center?.lon;
        const rawText = normalize(
          `${tags.name || ""} ${tags.amenity || ""} ${tags.cuisine || ""} ${tags.tourism || ""} ${tags.leisure || ""} ${tags.shop || ""}`
        );

        if (!placeLat || !placeLng || !tags.name) return null;
        if (!matchesMode(tags, mode)) return null;
        if (!isRelevantCandidate(tags)) return null;
        if (hasAny(rawText, HARD_BLOCK_WORDS)) return null;
        if (hasAny(rawText, MEDICAL_WORDS)) return null;
        if (hasAny(rawText, FAST_FOOD_WORDS)) return null;
        if (hasAny(rawText, DESSERT_WORDS)) return null;

        const phone = tags.phone || tags["contact:phone"] || "";
        const website = tags.website || tags["contact:website"] || tags.url || "";
        const hours = tags.opening_hours || tags["contact:opening_hours"] || "";
        const menu = tags.menu || tags["contact:menu"] || "";
        const fullAddress = [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
          tags["addr:postcode"]
        ]
          .filter(Boolean)
          .join(" ");

        return {
          name: tags.name,
          type: mode === "restaurants" ? restaurantCuisineLabel(tags) : classifyVenue(tags),
          lat: placeLat,
          lng: placeLng,
          address: fullAddress,
          phone,
          website,
          hours,
          menu,
          tags,
          townHint: tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "",
          zipHint: tags["addr:postcode"] || ""
        };
      })
      .filter(Boolean);

    const seen = new Set();
    const deduped = [];

    for (const item of mapped) {
      const key = `${normalize(item.name)}|${normalize(item.address)}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped;
  }

  async function enrichPlacesWithReverse(places, limit = 16) {
    const targets = places.slice(0, limit);

    await Promise.all(
      targets.map(async (place) => {
        try {
          const rev = await reverseGeocode(place.lat, place.lng);
          place.fullAddress = rev.address || place.address || "";
          place.townResolved = rev.town || place.townHint || "";
          place.zipResolved = rev.zip || place.zipHint || "";
          place.countyResolved = rev.county || "";
        } catch (_) {
          place.fullAddress = place.address || "";
          place.townResolved = place.townHint || "";
          place.zipResolved = place.zipHint || "";
          place.countyResolved = "";
        }
      })
    );

    return places;
  }

  function getPlaceZip(place) {
    return extractZip(
      place.zipResolved ||
      place.zipHint ||
      place.fullAddress ||
      place.address ||
      ""
    );
  }

  function getPlaceTown(place) {
    return normalize(
      place.townResolved ||
      place.townHint ||
      ""
    );
  }

  function filterPlacesForArea(places, areaInfo, center = null) {
    const targetZip = extractZip(areaInfo.zip || "");
    const targetTown = normalize(areaInfo.town || "");

    if (targetZip) {
      const zipMatches = places.filter((p) => getPlaceZip(p) === targetZip);
      if (zipMatches.length) return zipMatches;
    }

    if (targetTown) {
      const townMatches = places.filter((p) => getPlaceTown(p) === targetTown);
      if (townMatches.length) return townMatches;
    }

    if (center) {
      const nearMatches = places.filter(
        (p) => milesBetween(center.lat, center.lng, p.lat, p.lng) <= 2.25
      );
      if (nearMatches.length) return nearMatches;
    }

    return [];
  }

  function matchesSoloFilters(place, filters) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.address} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    if (filters.venue !== "any") {
      const venueMap = {
        bar: ["bar"],
        "sports bar": ["sports bar", "sports"],
        pub: ["pub"],
        tavern: ["tavern"],
        lounge: ["lounge"],
        club: ["club", "nightclub"],
        nightclub: ["nightclub", "club"],
        "casino nightclub": ["casino nightclub", "casino", "nightclub"],
        "dive bar": ["dive"],
        "pool hall": ["pool hall", "billiard"],
        "bar arcade": ["arcade"],
        "axe throwing": ["axe"],
        "restaurant bar": ["restaurant bar", "bar", "lounge"],
        "concert venue": ["concert", "music venue", "theater"],
        "beach bar": ["beach bar", "beach", "boardwalk"],
        restaurant: [
          "restaurant",
          "italian",
          "pizza",
          "sushi",
          "portuguese",
          "brazilian",
          "spanish",
          "steakhouse",
          "mediterranean",
          "greek",
          "moroccan",
          "ethiopian",
          "seafood",
          "french",
          "indian",
          "halal"
        ]
      };

      const needed = venueMap[filters.venue] || [filters.venue];
      if (!needed.some((word) => hay.includes(normalize(word)))) return false;
    }

    if (filters.music !== "any") {
      const musicMap = {
        "live music": ["live music", "music", "concert", "theater", "band"],
        dj: ["dj", "dance", "nightclub", "club"],
        "hip hop": ["hip hop"],
        house: ["house"],
        rock: ["rock"],
        latin: ["latin"],
        "top 40": ["top 40"],
        country: ["country"],
        edm: ["edm", "electronic", "dj"]
      };

      const needed = musicMap[filters.music] || [filters.music];
      if (!needed.some((word) => hay.includes(normalize(word)))) return false;
    }

    if (filters.vibe !== "any") {
      const vibeMap = {
        waterfront: ["waterfront", "river", "pier", "harbor", "sinatra", "boardwalk", "beach", "boulevard east", "port imperial"],
        rooftop: ["rooftop", "roof"],
        sports: ["sports"],
        dancing: ["dance", "dancing", "dj", "club"],
        "cheap drinks": ["cheap", "dive", "pub", "tavern", "happy hour"]
      };

      const needed = vibeMap[filters.vibe] || [filters.vibe];
      if (!needed.some((word) => hay.includes(normalize(word)))) return false;
    }

    if (filters.venue === "restaurant" && isDeliLikeRestaurant(place)) {
      return false;
    }

    return true;
  }

  function getAgeCrowdText(place) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    if (hay.includes("college") || hay.includes("university")) return "Usually younger crowd";
    if (hay.includes("nightclub") || hay.includes("club")) return "Usually 20s–30s";
    if (hay.includes("pub") || hay.includes("tavern")) return "Mixed adult crowd";
    if (hay.includes("lounge")) return "Usually 30+";
    if (hay.includes("wine") || hay.includes("cocktail")) return "Usually 30+";
    if (hay.includes("steakhouse") || hay.includes("brasserie") || hay.includes("bistro")) return "Usually adult crowd";
    return "Crowd not verified";
  }

  function knownClosed(place) {
    const hay = normalize(`${place.name} ${place.fullAddress || ""}`);
    return hay.includes("wicked wolf");
  }

  function isHighEndRestaurant(place) {
    const hay = placeHay(place);
    return (
      hay.includes("steakhouse") ||
      hay.includes("fine dining") ||
      hay.includes("wine bar") ||
      hay.includes("cocktail") ||
      hay.includes("seafood") ||
      hay.includes("chophouse") ||
      hay.includes("oyster") ||
      hay.includes("bistro") ||
      hay.includes("brasserie") ||
      hay.includes("lounge")
    );
  }

  function isMatureDrinksSpot(place) {
    const hay = placeHay(place);
    return (
      hay.includes("cocktail") ||
      hay.includes("wine") ||
      hay.includes("lounge") ||
      hay.includes("restaurant bar") ||
      hay.includes("bistro") ||
      hay.includes("jazz") ||
      hay.includes("piano")
    );
  }

  function isYoungPartyBar(place) {
    const hay = placeHay(place);
    return (
      hay.includes("college") ||
      hay.includes("nightclub") ||
      hay.includes("dj") ||
      hay.includes("beer pong") ||
      hay.includes("sports bar") ||
      hay.includes("texas arizona")
    );
  }

  function isLikelyRestaurant(place) {
    const hay = placeHay(place);

    if (isBadRestaurantCandidate(place)) return false;
    if (isDeliLikeRestaurant(place)) return false;

    return (
      place.type === "Restaurant" ||
      place.type === "Restaurant Bar" ||
      hay.includes("steakhouse") ||
      hay.includes("italian") ||
      hay.includes("spanish") ||
      hay.includes("portuguese") ||
      hay.includes("brazilian") ||
      hay.includes("sushi") ||
      hay.includes("japanese") ||
      hay.includes("mediterranean") ||
      hay.includes("greek") ||
      hay.includes("moroccan") ||
      hay.includes("ethiopian") ||
      hay.includes("seafood") ||
      hay.includes("mexican") ||
      hay.includes("pizza") ||
      hay.includes("brunch") ||
      hay.includes("french") ||
      hay.includes("indian") ||
      hay.includes("halal")
    );
  }

  function isLikelyDrinksSpot(place) {
    const hay = placeHay(place);

    if (
      isFastFood(place) ||
      isDessertOrSnackSpot(place) ||
      isMedicalOrNonNight(place) ||
      isHardBlockedPlace(place) ||
      isOfficeLikePlace(place)
    ) {
      return false;
    }

    return (
      place.type === "Bar" ||
      place.type === "Pub" ||
      place.type === "Tavern" ||
      place.type === "Lounge" ||
      place.type === "Sports Bar" ||
      place.type === "Dive Bar" ||
      place.type === "Beer Garden" ||
      place.type === "Restaurant Bar" ||
      hay.includes("cocktail") ||
      hay.includes("wine") ||
      hay.includes("rooftop") ||
      hay.includes("waterfront")
    );
  }

  function isLikelyCrowdSpot(place) {
    const hay = placeHay(place);

    if (
      isFastFood(place) ||
      isDessertOrSnackSpot(place) ||
      isMedicalOrNonNight(place) ||
      isHardBlockedPlace(place) ||
      isOfficeLikePlace(place)
    ) {
      return false;
    }

    return (
      place.type === "Nightclub" ||
      place.type === "Lounge" ||
      place.type === "Bar" ||
      place.type === "Pub" ||
      place.type === "Tavern" ||
      place.type === "Restaurant Bar" ||
      hay.includes("dj") ||
      hay.includes("dance") ||
      hay.includes("rooftop") ||
      hay.includes("waterfront") ||
      hay.includes("live music")
    );
  }
  
