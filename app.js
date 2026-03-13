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
    "belleville": "Belleville, NJ 07109"
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
    "brunch"
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
    "five guys"
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
    q = q.replace(/\s+,/g, ",");
    q = q.replace(/,\s*,/g, ",");
    q = q.trim();

    const norm = normalize(q);
    if (TOWN_FIXES[norm]) return TOWN_FIXES[norm];
    return q;
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
    const query =
      cleaned.includes("NJ") || cleaned.includes("New Jersey")
        ? cleaned
        : `${cleaned}, New Jersey, USA`;

    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=` +
      encodeURIComponent(query);

    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) throw new Error("Could not look up that location");

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      throw new Error(`Town or ZIP not found: ${address}`);
    }

    const wanted = normalize(cleaned);

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
            item.address?.house_number
          ]
            .filter(Boolean)
            .join(" ")
        );

        let score = 0;
        if (blob.includes("new jersey")) score += 300;
        if (item.address?.state === "New Jersey") score += 300;
        if (zipHint && blob.includes(zipHint)) score += 500;

        wanted.split(" ").forEach((part) => {
          if (part && blob.includes(part)) score += 25;
        });

        if (item.class === "place") score += 20;
        if (["city", "town", "village"].includes(item.type)) score += 20;

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0].item;
    const result = {
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lon),
      display: best.display_name,
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

    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

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

  async function searchNearbyPlaces(lat, lng, mode = "nightlife", radiusMeters = 3500) {
    const overpassQuery = `
[out:json][timeout:30];
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

        if (!placeLat || !placeLng || !tags.name) return null;
        if (!matchesMode(tags, mode)) return null;

        const phone = tags.phone || tags["contact:phone"] || "";
        const website = tags.website || tags["contact:website"] || tags.url || "";
        const hours = tags.opening_hours || tags["contact:opening_hours"] || "";
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
          menu: tags.menu || tags["contact:menu"] || "",
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

  async function enrichPlacesWithReverse(places, limit = 12) {
    const targets = places.slice(0, limit);

    for (const place of targets) {
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
    }

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

  function filterPlacesForArea(places, areaInfo) {
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

    return [];
  }

  function matchesSoloFilters(place, filters) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.address} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    if (filters.venue !== "any") {
      const venueMap = {
        bar: ["bar"],
        pub: ["pub"],
        tavern: ["tavern"],
        lounge: ["lounge"],
        club: ["club", "nightclub"],
        "dive bar": ["dive"],
        "pool hall": ["pool hall", "billiard"],
        "bar arcade": ["arcade"],
        "axe throwing": ["axe"],
        "restaurant bar": ["restaurant bar", "bar", "lounge"],
        restaurant: ["restaurant", "italian", "pizza", "sushi", "portuguese", "brazilian", "spanish", "steakhouse"]
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
    return "Crowd not verified";
  }

  function knownClosed(place) {
    const hay = normalize(`${place.name} ${place.fullAddress || ""}`);
    return hay.includes("wicked wolf");
  }

  function isFastFood(place) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );
    return FAST_FOOD_WORDS.some((word) => hay.includes(normalize(word)));
  }

  function isLikelyRestaurant(place) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    if (isFastFood(place)) return false;

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
      hay.includes("brunch")
    );
  }

  function isLikelyDrinksSpot(place) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    if (isFastFood(place)) return false;

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
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    if (isFastFood(place)) return false;

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

  function placeLinksHtml(place, town) {
    const queryText = `${place.name} ${place.fullAddress || place.address || town} NJ`;
    const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
    const photos = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + " " + town + " NJ")}`;
    const search = `https://www.google.com/search?q=${encodeURIComponent(place.name + " " + town + " NJ")}`;
    const call = place.phone ? `tel:${place.phone.replace(/[^\d+]/g, "")}` : "";
    const website = place.website || "";
    const menu = place.menu
      ? place.menu
      : `https://www.google.com/search?q=${encodeURIComponent(place.name + " menu " + town + " NJ")}`;

    let html = `<div class="result-links">`;
    if (call) html += `<a href="${call}">Call</a>`;
    html += `<a href="${directions}" target="_blank" rel="noopener noreferrer">Directions</a>`;
    if (website) html += `<a href="${website}" target="_blank" rel="noopener noreferrer">Website</a>`;
    html += `<a href="${photos}" target="_blank" rel="noopener noreferrer">Photos</a>`;
    html += `<a href="${menu}" target="_blank" rel="noopener noreferrer">Menu</a>`;
    html += `<a href="${search}" target="_blank" rel="noopener noreferrer">Search</a>`;
    html += `</div>`;
    return html;
  }

  function extractLocationFromPrompt(prompt) {
    const raw = String(prompt || "").trim();
    const lower = normalize(raw);

    const zip = extractZip(raw);
    if (zip) return zip;

    const entries = Object.entries(TOWN_FIXES).sort((a, b) => b[0].length - a[0].length);
    for (const [needle, fixed] of entries) {
      if (lower.includes(needle)) return fixed;
    }

    const inMatch = raw.match(/\bin\s+([A-Za-z\s]+)(?:,\s*(?:NJ|New Jersey))?/i);
    if (inMatch && inMatch[1]) {
      return cleanLocationInput(`${inMatch[1].trim()}, NJ`);
    }

    return "";
  }

  function parseAIOptions(prompt) {
    const text = normalize(prompt);

    let cuisine = "";
    for (const word of CUISINE_KEYWORDS) {
      if (text.includes(normalize(word))) {
        cuisine = word;
        break;
      }
    }

    let age = "any";
    if (text.includes("40") || text.includes("50") || text.includes("older crowd") || text.includes("mature")) age = "40+";
    else if (text.includes("30")) age = "30+";
    else if (text.includes("20")) age = "20s";

    let budget = "moderate";
    if (text.includes("cheap") || text.includes("$5 beer") || text.includes("happy hour") || text.includes("cheap drinks")) budget = "cheap";
    if (text.includes("upscale") || text.includes("fine dining") || text.includes("expensive") || text.includes("steakhouse")) budget = "upscale";

    return {
      cuisine,
      age,
      budget,
      wantsBrunch: text.includes("brunch") || text.includes("sunday"),
      wantsWaterfront: text.includes("waterfront") || text.includes("on the water"),
      wantsRooftop: text.includes("rooftop"),
      wantsLiveMusic: text.includes("live music") || text.includes("band"),
      wantsDJ: text.includes("dj"),
      wantsHappyHour: text.includes("happy hour") || text.includes("cheap cocktails") || text.includes("cheap beers"),
      wantsDateNight: text.includes("date") || text.includes("girlfriend") || text.includes("wife") || text.includes("romantic"),
      wantsFriends: text.includes("buddy") || text.includes("friends") || text.includes("group"),
      wantsFun: text.includes("fun") || text.includes("great night") || text.includes("good time")
    };
  }

  function scoreRestaurant(place, prefs) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    let score = 0;

    if (!isLikelyRestaurant(place)) score -= 1000;
    if (isFastFood(place)) score -= 1000;

    if (place.website) score += 8;
    if (place.menu) score += 10;
    if (place.hours) score += 6;
    if (place.type === "Restaurant Bar") score += 10;
    if (hay.includes("steakhouse")) score += 10;
    if (hay.includes("seafood")) score += 8;
    if (hay.includes("italian")) score += 8;
    if (hay.includes("sushi")) score += 8;
    if (hay.includes("spanish")) score += 8;
    if (hay.includes("portuguese")) score += 8;
    if (hay.includes("brazilian")) score += 8;
    if (hay.includes("mediterranean")) score += 8;
    if (hay.includes("greek")) score += 8;
    if (hay.includes("brunch")) score += 8;

    if (prefs.cuisine && hay.includes(normalize(prefs.cuisine))) score += 40;
    if (prefs.wantsBrunch && hay.includes("brunch")) score += 35;
    if (prefs.wantsDateNight && (hay.includes("steakhouse") || hay.includes("wine") || hay.includes("piano"))) score += 15;
    if (prefs.budget === "cheap" && (hay.includes("pizza") || hay.includes("mexican") || hay.includes("happy hour"))) score += 12;
    if (prefs.budget === "upscale" && (hay.includes("steakhouse") || hay.includes("seafood") || hay.includes("wine"))) score += 15;

    return score;
  }

  function scoreDrinks(place, prefs) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.fullAddress || ""} ${JSON.stringify(place.tags || {})}`
    );

    let score = 0;

    if (!isLikelyDrinksSpot(place)) score -= 1000;
    if (isFastFood(place)) score -= 1000;

    if (place.website) score += 6;
    if (place.hours) score += 6;
    if (place.type === "Lounge") score += 12;
    if (place.type === "Restaurant Bar") score += 10;
    if (place.type === "Bar") score += 8;
    if (place.type === "Pub") score += 6;

    if (prefs.wantsWaterfront && hay.includes("waterfront")) score += 35;
    if (prefs.wantsRooftop && hay.includes("rooftop")) score += 35;
    if (prefs.wantsHappyHour && hay.includes("happy hour")) score += 30;
    if (prefs.budget === "cheap" && (hay.includes("dive") || hay.includes("pub") || hay.includes("tavern"))) score += 15;
    if (prefs.wantsDateNight && (hay.includes("cocktail") || hay.includes("wine") || hay.includes("lounge"))) score += 15;
    if (prefs.wantsFriends && (hay.includes("sports") || hay.includes("pub") || hay.includes("tavern"))) score += 10;

    return score;
  }
