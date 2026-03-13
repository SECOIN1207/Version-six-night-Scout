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
    "englewood": "Englewood, NJ 07631"
  };

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

  function sameTownOrZip(place, areaInfo) {
    const placeBlob = normalize(
      [
        place.fullAddress,
        place.address,
        place.townResolved,
        place.townHint,
        place.zipResolved,
        place.zipHint,
        JSON.stringify(place.tags || {})
      ]
        .filter(Boolean)
        .join(" ")
    );

    const townNeedle = normalize(areaInfo.town || "");
    const zipNeedle = normalize(areaInfo.zip || "");

    if (zipNeedle && placeBlob.includes(zipNeedle)) return true;
    if (townNeedle && placeBlob.includes(townNeedle)) return true;

    return false;
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
    function helpBoxHtml(title, text) {
    return `
      <div class="card warning-card">
        <p style="margin:0;"><b>${escapeHtml(title)}:</b> ${escapeHtml(text)}</p>
      </div>
    `;
  }

  function modeButtonsHtml(active) {
    const makeBtn = (mode, label) => {
      const activeClass = active === mode ? "active-mode" : "";
      return `<button type="button" class="mode-btn ${activeClass}" data-mode="${mode}">${label}</button>`;
    };

    return `
      <div class="mode-switch">
        ${makeBtn("nightlife", "Nightlife")}
        ${makeBtn("restaurants", "Restaurants")}
        ${makeBtn("everything", "Everything")}
      </div>
    `;
  }

  function placeCardsHtml(center, areaInfo, places) {
    const sorted = places
      .map((p) => ({
        ...p,
        distance: milesBetween(center.lat, center.lng, p.lat, p.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    if (!sorted.length) {
      return `
        <div class="card warning-card">
          <p style="margin:0;"><b>Location worked.</b> No live venues were returned right now.</p>
        </div>
      `;
    }

    return sorted
      .map((p) => {
        const addressText = p.fullAddress || p.address || "Address not listed";
        const hoursText = p.hours || "Hours not listed";
        const crowdText = getAgeCrowdText(p);
        const statusText = knownClosed(p) ? "Reported closed" : "Open status not verified";

        return `
          <div class="card">
            <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
            <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
            <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(p.townResolved || areaInfo.town)}</p>
            <p style="margin:4px 0;"><b>Distance:</b> ${p.distance.toFixed(1)} miles</p>
            <p style="margin:4px 0;"><b>Address:</b> ${escapeHtml(addressText)}</p>
            <p style="margin:4px 0;"><b>Hours:</b> ${escapeHtml(hoursText)}</p>
            <p style="margin:4px 0;"><b>Crowd:</b> ${escapeHtml(crowdText)}</p>
            <p style="margin:4px 0;"><b>Status:</b> ${escapeHtml(statusText)}</p>
            ${placeLinksHtml(p, areaInfo.town)}
          </div>
        `;
      })
      .join("");
  }

  function renderSoloResults(center, areaInfo, places, filters) {
    const localOnly = filterPlacesForArea(places, areaInfo);
    const aliveOnly = localOnly.filter((p) => !knownClosed(p));
    const filtered = aliveOnly.filter((p) => matchesSoloFilters(p, filters));

    els.results.innerHTML = `
      <h2>Solo Search Results</h2>
      ${helpBoxHtml(
        "How to use Solo",
        "The more specific you are, the better it gets. Town + venue type + vibe usually gives the strongest matches."
      )}
      <div class="card">
        <p><b>Town:</b> ${escapeHtml(areaInfo.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(areaInfo.zip || "Not available")}</p>
        ${areaInfo.county ? `<p><b>County:</b> ${escapeHtml(areaInfo.county)}</p>` : ""}
        <p><b>Area:</b> ${escapeHtml(areaInfo.address)}</p>
        <p><b>Filters:</b> Crowd: ${escapeHtml(filters.crowd)} | Music: ${escapeHtml(filters.music)} | Venue: ${escapeHtml(filters.venue)} | Vibe: ${escapeHtml(filters.vibe)}</p>
      </div>
      ${placeCardsHtml(center, areaInfo, filtered)}
    `;
  }

  function renderMiddleResults(mid, midpointInfo, places, geoA, geoB, mode) {
    const localPlaces = filterPlacesForArea(places, midpointInfo)
      .filter((p) => !knownClosed(p));

    els.results.innerHTML = `
      <h2>Meet in the Middle Results</h2>
      ${helpBoxHtml("Tip", "Use clean addresses like 137 Fleming Ave, Newark, NJ 07105.")}
      <div class="card">
        <p><b>Location A:</b> ${escapeHtml(geoA.display)}</p>
        <p><b>Location B:</b> ${escapeHtml(geoB.display)}</p>
        <p><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
        ${midpointInfo.county ? `<p><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
        <p><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open midpoint in Google Maps</a>
        </div>
        ${modeButtonsHtml(mode)}
      </div>
      ${placeCardsHtml(mid, midpointInfo, localPlaces)}
    `;

    lastMidpointState = {
      type: "middle",
      mid,
      midpointInfo,
      geoA,
      geoB
    };

    wireModeButtons();
  }

  function renderGroupResults(mid, midpointInfo, places, geos, mode) {
    const localPlaces = filterPlacesForArea(places, midpointInfo)
      .filter((p) => !knownClosed(p));

    const pointsHtml = geos
      .map((g, i) => `<p><b>Point ${i + 1}:</b> ${escapeHtml(g.display)}</p>`)
      .join("");

    els.results.innerHTML = `
      <h2>Group Center Results</h2>
      ${helpBoxHtml("Tip", "One location per line works best. Town + NJ + ZIP is usually enough.")}
      <div class="card">
        ${pointsHtml}
        <p><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
        ${midpointInfo.county ? `<p><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
        <p><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open group midpoint in Google Maps</a>
        </div>
        ${modeButtonsHtml(mode)}
      </div>
      ${placeCardsHtml(mid, midpointInfo, localPlaces)}
    `;

    lastMidpointState = {
      type: "group",
      mid,
      midpointInfo,
      geos
    };

    wireModeButtons();
  }

  async function rerunMode(mode) {
    if (!lastMidpointState) return;

    els.results.innerHTML = `<p>Loading ${escapeHtml(mode)}...</p>`;

    let places = [];
    try {
      places = await searchNearbyPlaces(lastMidpointState.mid.lat, lastMidpointState.mid.lng, mode);
      await enrichPlacesWithReverse(places, 10);
    } catch (_) {
      places = [];
    }

    if (lastMidpointState.type === "middle") {
      renderMiddleResults(
        lastMidpointState.mid,
        lastMidpointState.midpointInfo,
        places,
        lastMidpointState.geoA,
        lastMidpointState.geoB,
        mode
      );
    } else {
      renderGroupResults(
        lastMidpointState.mid,
        lastMidpointState.midpointInfo,
        places,
        lastMidpointState.geos,
        mode
      );
    }
  }

  function wireModeButtons() {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const mode = btn.getAttribute("data-mode");
        await rerunMode(mode);
      };
    });
  }

  async function soloSearch() {
    const q = (els.soloQuery?.value || "").trim();
    if (!q) {
      alert("Enter a town, ZIP, address, or coordinates.");
      return;
    }

    const filters = {
      crowd: els.soloCrowd?.value || "any",
      music: els.soloMusic?.value || "any",
      venue: els.soloVenue?.value || "any",
      vibe: els.soloVibe?.value || "any"
    };

    els.results.innerHTML = `<p>Searching ${escapeHtml(q)}...</p>`;

    try {
      const center = await geocodeAddress(q);
      const areaInfo = await reverseGeocode(center.lat, center.lng);

      let mode = "everything";
      if (filters.venue === "restaurant") mode = "restaurants";
      if (
        [
          "bar",
          "pub",
          "tavern",
          "lounge",
          "club",
          "dive bar",
          "pool hall",
          "bar arcade",
          "axe throwing",
          "restaurant bar"
        ].includes(filters.venue)
      ) {
        mode = "nightlife";
      }

      const places = await searchNearbyPlaces(center.lat, center.lng, mode, 4200);
      await enrichPlacesWithReverse(places, 14);

      renderSoloResults(center, areaInfo, places, filters);
      lastMidpointState = null;
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Search failed")}</p>
        </div>
      `;
    }
  }

  async function meetInMiddle() {
    const a = (els.locA?.value || "").trim();
    const b = (els.locB?.value || "").trim();

    if (!a || !b) {
      alert("Enter both locations.");
      return;
    }

    els.results.innerHTML = "<p>Calculating midpoint...</p>";

    try {
      const geoA = await geocodeAddress(a);
      const geoB = await geocodeAddress(b);
      const mid = midpoint(geoA, geoB);
      const midpointInfo = await reverseGeocode(mid.lat, mid.lng);

      let places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");
      await enrichPlacesWithReverse(places, 10);

      renderMiddleResults(mid, midpointInfo, places, geoA, geoB, "nightlife");
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Meet in the middle failed")}</p>
        </div>
      `;
    }
  }

  async function groupCenter() {
    const lines = (els.groupList?.value || "")
      .split(/\n+/)
      .map((x) => cleanLocationInput(x))
      .filter((x) => x.trim().length);

    if (lines.length < 2) {
      alert("Enter at least 2 locations.");
      return;
    }

    els.results.innerHTML = "<p>Calculating group center...</p>";

    try {
      const geos = [];
      for (const line of lines) {
        geos.push(await geocodeAddress(line));
      }

      const mid = centroid(geos);
      const midpointInfo = await reverseGeocode(mid.lat, mid.lng);

      let places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");
      await enrichPlacesWithReverse(places, 10);

      renderGroupResults(mid, midpointInfo, places, geos, "nightlife");
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Group center failed")}</p>
        </div>
      `;
    }
  }

  async function searchStatewideIntent(intent) {
    const areaQuery = `
[out:json][timeout:60];
area["name"="New Jersey"]["boundary"="administrative"]->.searchArea;
(
  node["amenity"](area.searchArea);
  way["amenity"](area.searchArea);
  relation["amenity"](area.searchArea);
  node["tourism"](area.searchArea);
  way["tourism"](area.searchArea);
  relation["tourism"](area.searchArea);
  node["leisure"](area.searchArea);
  way["leisure"](area.searchArea);
  relation["leisure"](area.searchArea);
);
out center tags;
`;

    const data = await runOverpassWithFallback(areaQuery);
    const elements = Array.isArray(data.elements) ? data.elements : [];

    const mapped = elements
      .map((el) => {
        const tags = el.tags || {};
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng || !tags.name) return null;

        const text = normalize(
          `${tags.name} ${tags.amenity || ""} ${tags.tourism || ""} ${tags.leisure || ""} ${tags.cuisine || ""} ${tags.description || ""}`
        );

        return {
          name: tags.name,
          lat,
          lng,
          tags,
          type: classifyVenue(tags),
          address: [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:city"] || tags["addr:town"] || tags["addr:village"]
          ]
            .filter(Boolean)
            .join(" "),
          phone: tags.phone || tags["contact:phone"] || "",
          website: tags.website || tags["contact:website"] || tags.url || "",
          hours: tags.opening_hours || "",
          menu: tags.menu || tags["contact:menu"] || "",
          intentScore: 0,
          text
        };
      })
      .filter(Boolean)
      .map((place) => {
        let score = 0;

        if (intent === "rooftop") {
          if (place.text.includes("rooftop")) score += 100;
          if (place.text.includes("roof")) score += 40;
          if (place.text.includes("lounge")) score += 15;
          if (place.text.includes("bar")) score += 15;
        }

        if (intent === "brunch") {
          if (place.text.includes("brunch")) score += 100;
          if (place.text.includes("restaurant")) score += 20;
          if (place.hours.includes("Su")) score += 10;
        }

        if (intent === "live music") {
          if (place.text.includes("live music")) score += 100;
          if (place.text.includes("music")) score += 30;
          if (place.text.includes("concert")) score += 30;
          if (place.text.includes("theater")) score += 20;
        }

        if (intent === "country") {
          if (place.text.includes("country")) score += 100;
        }

        if (intent === "edm") {
          if (place.text.includes("edm")) score += 100;
          if (place.text.includes("dj")) score += 30;
          if (place.text.includes("nightclub")) score += 20;
        }

        if (intent === "waterfront") {
          if (place.text.includes("waterfront")) score += 100;
          if (place.text.includes("river")) score += 20;
          if (place.text.includes("harbor")) score += 20;
          if (place.text.includes("ocean")) score += 20;
        }

        if (place.website) score += 5;
        if (place.phone) score += 5;
        if (place.hours) score += 5;

        place.intentScore = score;
        return place;
      })
      .filter((p) => p.intentScore > 0)
      .sort((a, b) => b.intentScore - a.intentScore)
      .slice(0, 8);

    await enrichPlacesWithReverse(mapped, 8);
    return mapped;
  }

  function renderAIDiscovery(prompt, places, title, subtitle) {
    els.results.innerHTML = `
      <h2>${escapeHtml(title || "Night Plan")}</h2>
      <div class="card">
        <p><b>Prompt:</b> ${escapeHtml(prompt)}</p>
        <p>${escapeHtml(subtitle || "Best-matching New Jersey places for your prompt.")}</p>
      </div>
      ${
        places.length
          ? places
              .map((p) => `
                <div class="card">
                  <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
                  <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
                  <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(p.townResolved || p.townHint || "New Jersey")}</p>
                  <p style="margin:4px 0;"><b>Address:</b> ${escapeHtml(p.fullAddress || p.address || "Address not listed")}</p>
                  <p style="margin:4px 0;"><b>Hours:</b> ${escapeHtml(p.hours || "Hours not listed")}</p>
                  ${placeLinksHtml(p, p.townResolved || "New Jersey")}
                </div>
              `)
              .join("")
          : `<div class="card warning-card"><p style="margin:0;">No strong NJ matches came back for that prompt yet.</p></div>`
      }
    `;
  }

  async function generateNightPlan() {
    const q = (els.aiPrompt?.value || "").trim();
    if (!q) {
      alert("Enter a night plan prompt.");
      return;
    }

    els.results.innerHTML = `<p>Building a night plan...</p>`;

    const lower = normalize(q);

    let intent = "nightlife";
    let title = "Night Plan";
    let subtitle = "Best-matching New Jersey places for your prompt.";

    if (lower.includes("rooftop")) {
      intent = "rooftop";
      title = "Top Rooftop Matches";
      subtitle = "Best-matching rooftop bars and rooftop-style spots in New Jersey.";
    } else if (lower.includes("brunch")) {
      intent = "brunch";
      title = "Sunday Brunch Matches";
      subtitle = "Best-matching brunch-style places in New Jersey.";
    } else if (lower.includes("live music") || lower.includes("concert") || lower.includes("band")) {
      intent = "live music";
      title = "Live Music Matches";
      subtitle = "Best-matching live music venues in New Jersey.";
    } else if (lower.includes("country")) {
      intent = "country";
      title = "Country Bar Matches";
      subtitle = "Best-matching country-style bars and venues in New Jersey.";
    } else if (lower.includes("edm") || lower.includes("dj")) {
      intent = "edm";
      title = "DJ / EDM Matches";
      subtitle = "Best-matching DJ and nightlife venues in New Jersey.";
    } else if (lower.includes("waterfront") || lower.includes("riverfront")) {
      intent = "waterfront";
      title = "Waterfront Matches";
      subtitle = "Best-matching waterfront bars and venues in New Jersey.";
    }

    try {
      const places = await searchStatewideIntent(intent);
      renderAIDiscovery(q, places, title, subtitle);
      lastMidpointState = null;
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Night plan failed")}</p>
        </div>
      `;
    }
  }

  function loadNJVenues() {
    els.results.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0;">Starter NJ towns</h3>
        <p style="margin-bottom:8px;">Use Solo for one town, Middle for two places, or Group for multiple people.</p>
        <p style="margin-bottom:0;">Tip: town + venue type + vibe usually works better than a very generic search.</p>
      </div>
    `;
  }

  function setupStarterTowns() {
    if (!els.starterTowns) return;

    els.starterTowns.innerHTML = "";

    STARTER_TOWNS.forEach((town) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "starter-chip";
      btn.textContent = town.replace(", NJ", "");
      btn.onclick = () => {
        if (els.soloQuery) els.soloQuery.value = town;
        showPanel("solo");
      };
      els.starterTowns.appendChild(btn);
    });
  }

  function addExtraMusicOptions() {
    if (!els.soloMusic) return;

    const existing = Array.from(els.soloMusic.options).map((o) => o.value);
    const extras = [
      { value: "edm", label: "EDM" },
      { value: "country", label: "Country" }
    ];

    extras.forEach((item) => {
      if (!existing.includes(item.value)) {
        const opt = document.createElement("option");
        opt.value = item.value;
        opt.textContent = item.label;
        els.soloMusic.appendChild(opt);
      }
    });
  }

  function injectHelpText() {
    if (els.panelSolo && !els.panelSolo.querySelector(".solo-help")) {
      const p = document.createElement("p");
      p.className = "muted solo-help";
      p.style.marginTop = "0";
      p.innerHTML =
        "Tip: the more specific you are, the better the Solo results get. Example: <b>Hoboken, NJ 07030</b> + tavern + cheap drinks.";
      els.panelSolo.insertBefore(p, els.panelSolo.firstChild);
    }

    if (els.panelMiddle && !els.panelMiddle.querySelector(".middle-help")) {
      const p = document.createElement("p");
      p.className = "muted middle-help";
      p.style.marginTop = "0";
      p.textContent =
        "Tip: use clean addresses or town + ZIP.";
      els.panelMiddle.insertBefore(p, els.panelMiddle.firstChild);
    }

    if (els.panelGroup && !els.panelGroup.querySelector(".group-help")) {
      const p = document.createElement("p");
      p.className = "muted group-help";
      p.style.marginTop = "0";
      p.textContent =
        "Tip: one location per line. Town + ZIP works great, and full street addresses work too.";
      els.panelGroup.insertBefore(p, els.panelGroup.firstChild);
    }

    if (els.panelAi && !els.panelAi.querySelector(".ai-help")) {
      const p = document.createElement("p");
      p.className = "muted ai-help";
      p.style.marginTop = "0";
      p.textContent =
        "Tip: ask broad things here like rooftop lounge with a DJ or Sunday brunch.";
      els.panelAi.insertBefore(p, els.panelAi.firstChild);
    }
  }

  function hideAllPanels() {
    [els.panelSolo, els.panelMiddle, els.panelGroup, els.panelAi].forEach((panel) => {
      if (!panel) return;
      panel.classList.remove("active-panel");
    });
  }

  function setActiveTab(tabName) {
    els.tabButtons.forEach((btn) => {
      btn.classList.remove("active-tab");
      if (btn.dataset.tab === tabName) btn.classList.add("active-tab");
    });
  }

  function showPanel(name) {
    hideAllPanels();

    if (name === "solo" && els.panelSolo) els.panelSolo.classList.add("active-panel");
    if (name === "middle" && els.panelMiddle) els.panelMiddle.classList.add("active-panel");
    if (name === "group" && els.panelGroup) els.panelGroup.classList.add("active-panel");
    if (name === "ai" && els.panelAi) els.panelAi.classList.add("active-panel");

    setActiveTab(name);
  }

  function setupTopTabs() {
    els.tabButtons.forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tab = btn.dataset.tab;
        if (tab) showPanel(tab);
      };
    });
  }

  function setupActionButtons() {
    if (els.searchBtn) {
      els.searchBtn.onclick = (e) => {
        e.preventDefault();
        soloSearch();
      };
    }

    if (els.loadNJ) {
      els.loadNJ.onclick = (e) => {
        e.preventDefault();
        loadNJVenues();
      };
    }

    if (els.middleBtn) {
      els.middleBtn.onclick = (e) => {
        e.preventDefault();
        meetInMiddle();
      };
    }

    if (els.groupBtn) {
      els.groupBtn.onclick = (e) => {
        e.preventDefault();
        groupCenter();
      };
    }

    if (els.aiBtn) {
      els.aiBtn.onclick = (e) => {
        e.preventDefault();
        generateNightPlan();
      };
    }
  }

  function setupEnterKeys() {
    if (els.soloQuery) {
      els.soloQuery.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          soloSearch();
        }
      });
    }

    if (els.locA) {
      els.locA.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          meetInMiddle();
        }
      });
    }

    if (els.locB) {
      els.locB.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          meetInMiddle();
        }
      });
    }

    if (els.aiPrompt) {
      els.aiPrompt.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          generateNightPlan();
        }
      });
    }
  }

  function initializeApp() {
    addExtraMusicOptions();
    injectHelpText();
    setupStarterTowns();
    setupTopTabs();
    setupActionButtons();
    setupEnterKeys();
    showPanel("solo");

    if (els.results && !els.results.innerHTML.trim()) {
      els.results.innerHTML = `
        <div class="card">
          <h3 style="margin-top:0;">NightScout ready</h3>
          <p style="margin-bottom:8px;">Search by town, ZIP, or address. Use Middle for two locations, Group for multiple people, and AI for NJ nightlife prompts.</p>
          <p style="margin-bottom:0;">Starter towns are loaded for quick testing.</p>
        </div>
      `;
    }
  }

  function checkLateNightWarning() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const alreadyShown = localStorage.getItem("nightWarningShown");
    const today = new Date().toDateString();

    if (hours === 0 && minutes >= 15 && alreadyShown !== today) {
      const warning = document.getElementById("nightWarning");
      if (warning) {
        warning.style.display = "block";
        warning.style.pointerEvents = "auto";
      }
      localStorage.setItem("nightWarningShown", today);
    }
  }

  function closeNightWarning() {
    const warning = document.getElementById("nightWarning");
    if (warning) {
      warning.style.display = "none";
      warning.style.pointerEvents = "none";
    }
  }

  window.closeNightWarning = closeNightWarning;

  setInterval(checkLateNightWarning, 60000);

  initializeApp();
});
