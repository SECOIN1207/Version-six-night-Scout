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
    searchBtn: $("searchBtn"),
    loadNJ: $("loadNJ"),
    middleBtn: $("middleBtn"),
    groupBtn: $("groupBtn"),
    aiBtn: $("aiBtn"),
    starterTowns: $("starterTowns")
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
    "Atlantic City, NJ 08401"
  ];

  const TOWN_FIXES = {
    "saddlebrook": "Saddle Brook, NJ 07663",
    "saddle brook": "Saddle Brook, NJ 07663",
    "hoboken": "Hoboken, NJ 07030",
    "newark": "Newark, NJ 07105",
    "fairview": "Fairview, NJ 07022",
    "fort lee": "Fort Lee, NJ 07024",
    "weehawken": "Weehawken, NJ 07087",
    "jersey city": "Jersey City, NJ 07302",
    "montclair": "Montclair, NJ 07042",
    "asbury park": "Asbury Park, NJ 07712",
    "point pleasant": "Point Pleasant Beach, NJ 08742",
    "point pleasant beach": "Point Pleasant Beach, NJ 08742",
    "atlantic city": "Atlantic City, NJ 08401",
    "bayonne": "Bayonne, NJ 07002"
  };

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
      .replace(/,/g, " ")
      .replace(/\./g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLatLng(text) {
    return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(text || ""));
  }

  function parseLatLng(text) {
    const [lat, lng] = String(text).split(",").map((x) => parseFloat(x.trim()));
    return { lat, lng };
  }

  function extractZip(text) {
    const m = String(text || "").match(/\b\d{5}\b/);
    return m ? m[0] : "";
  }

  function cleanLocationInput(text) {
    let q = String(text || "").trim();

    q = q.replace(/\bSaddlebrook\b/gi, "Saddle Brook");
    q = q.replace(/\bFairview\s+New\s+Jersey\s+07105\b/gi, "Fairview, NJ 07022");
    q = q.replace(/\bNewark\s+New\s+Jersey\b/gi, "Newark, NJ");
    q = q.replace(/\bBayonne\s+New\s+Jersey\b/gi, "Bayonne, NJ");
    q = q.replace(/\bHoboken\s+New\s+Jersey\b/gi, "Hoboken, NJ");
    q = q.replace(/\bWeehawken\s+New\s+Jersey\b/gi, "Weehawken, NJ");
    q = q.replace(/\s+/g, " ").trim();

    const norm = normalize(q);
    if (TOWN_FIXES[norm]) {
      return TOWN_FIXES[norm];
    }

    return q;
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

  async function geocodeAddress(address) {
    const cleaned = cleanLocationInput(address);

    if (isLatLng(cleaned)) {
      const parsed = parseLatLng(cleaned);
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        display: `${parsed.lat}, ${parsed.lng}`,
        input: address
      };
    }

    const zipHint = extractZip(cleaned);
    const query = cleaned.includes("NJ") || cleaned.includes("New Jersey")
      ? cleaned
      : `${cleaned}, New Jersey, USA`;

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error("Could not look up that location");
    }

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

        if (blob.includes("new jersey")) score += 200;
        if (zipHint && blob.includes(zipHint)) score += 300;

        wanted.split(" ").forEach((part) => {
          if (part && blob.includes(part)) score += 20;
        });

        if (item.address?.state === "New Jersey") score += 120;

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0].item;

    return {
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lon),
      display: best.display_name,
      input: address
    };
  }

  async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error("Could not identify midpoint town");
    }

    const data = await res.json();
    const addr = data.address || {};

    const town =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.hamlet ||
      addr.county ||
      "Unknown";

    return {
      town,
      zip: addr.postcode || "",
      county: addr.county || "",
      address: data.display_name || "",
      state: addr.state || ""
    };
  }

  function classifyVenue(tags = {}) {
    const amenity = String(tags.amenity || "").toLowerCase();
    const leisure = String(tags.leisure || "").toLowerCase();
    const tourism = String(tags.tourism || "").toLowerCase();
    const name = String(tags.name || "").toLowerCase();
    const cuisine = String(tags.cuisine || "").toLowerCase();
    const text = `${amenity} ${leisure} ${tourism} ${name} ${cuisine}`;

    if (amenity === "nightclub") return "Club";
    if (amenity === "pub") return "Pub";
    if (amenity === "bar") return "Bar";
    if (amenity === "biergarten") return "Beer Garden";
    if (amenity === "casino") return "Casino";
    if (text.includes("tavern")) return "Tavern";
    if (text.includes("lounge")) return "Lounge";
    if (text.includes("dive")) return "Dive Bar";
    if (text.includes("arcade")) return "Bar Arcade";
    if (text.includes("axe")) return "Axe Throwing";
    if (text.includes("billiard") || text.includes("pool hall")) return "Pool Hall";
    if (text.includes("concert") || text.includes("music") || text.includes("theater")) return "Music Venue";
    if (amenity === "restaurant" && (text.includes("bar") || text.includes("lounge"))) return "Restaurant Bar";
    if (amenity === "restaurant") return "Restaurant";
    if (amenity === "cafe") return "Cafe";
    return "Venue";
  }

  function matchesMode(tags = {}, mode = "nightlife") {
    const amenity = String(tags.amenity || "").toLowerCase();
    const leisure = String(tags.leisure || "").toLowerCase();
    const tourism = String(tags.tourism || "").toLowerCase();
    const name = String(tags.name || "").toLowerCase();
    const cuisine = String(tags.cuisine || "").toLowerCase();

    const text = `${amenity} ${leisure} ${tourism} ${name} ${cuisine}`;

    const nightlifeMatch =
      amenity === "bar" ||
      amenity === "pub" ||
      amenity === "nightclub" ||
      amenity === "biergarten" ||
      amenity === "casino" ||
      text.includes("tavern") ||
      text.includes("lounge") ||
      text.includes("dive") ||
      text.includes("arcade") ||
      text.includes("axe") ||
      text.includes("pool hall") ||
      text.includes("billiard") ||
      text.includes("concert") ||
      text.includes("music") ||
      text.includes("theater") ||
      text.includes("dj");

    const restaurantMatch =
      amenity === "restaurant" ||
      amenity === "cafe" ||
      cuisine.length > 0;

    if (mode === "restaurants") return restaurantMatch;
    if (mode === "nightlife") return nightlifeMatch || (amenity === "restaurant" && (text.includes("bar") || text.includes("lounge")));
    return nightlifeMatch || restaurantMatch;
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
    if (cuisine.includes("mexican")) return "Mexican";
    if (cuisine.includes("pizza")) return "Pizza";
    return cuisine.split(";")[0].split(",")[0];
  }

  async function fetchOverpass(url, query) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: query
    });

    if (!res.ok) {
      throw new Error("Overpass failed");
    }

    return res.json();
  }

  async function searchNearbyPlaces(lat, lng, mode = "nightlife", radiusMeters = 3500) {
    const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"](around:${radiusMeters},${lat},${lng});
  way["amenity"](around:${radiusMeters},${lat},${lng});
  relation["amenity"](around:${radiusMeters},${lat},${lng});
  node["leisure"](around:${radiusMeters},${lat},${lng});
  way["leisure"](around:${radiusMeters},${lat},${lng});
  relation["leisure"](around:${radiusMeters},${lat},${lng});
  node["tourism"](around:${radiusMeters},${lat},${lng});
  way["tourism"](around:${radiusMeters},${lat},${lng});
  relation["tourism"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`;

    let data = null;

    try {
      data = await fetchOverpass("https://overpass-api.de/api/interpreter", overpassQuery);
    } catch (_) {
      data = await fetchOverpass("https://overpass.kumi.systems/api/interpreter", overpassQuery);
    }

    const elements = Array.isArray(data.elements) ? data.elements : [];

    const mapped = elements
      .map((el) => {
        const tags = el.tags || {};
        const placeLat = el.lat ?? el.center?.lat;
        const placeLng = el.lon ?? el.center?.lon;

        if (!placeLat || !placeLng || !tags.name) return null;
        if (!matchesMode(tags, mode)) return null;

        const kind =
          mode === "restaurants"
            ? restaurantCuisineLabel(tags)
            : classifyVenue(tags);

        return {
          name: tags.name,
          type: kind,
          lat: placeLat,
          lng: placeLng,
          address: [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:city"] || tags["addr:town"] || tags["addr:village"]
          ]
            .filter(Boolean)
            .join(" "),
          tags
        };
      })
      .filter(Boolean);

    const deduped = [];
    const seen = new Set();

    for (const item of mapped) {
      const key = `${normalize(item.name)}|${normalize(item.address)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped;
  }

  function matchesSoloFilters(place, filters) {
    const hay = normalize(
      `${place.name} ${place.type} ${place.address} ${JSON.stringify(place.tags || {})}`
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
        restaurant: ["restaurant", "cafe", "pizza", "steakhouse", "italian", "sushi", "portuguese", "brazilian", "spanish"]
      };

      const needed = venueMap[filters.venue] || [filters.venue];
      const ok = needed.some((word) => hay.includes(normalize(word)));
      if (!ok) return false;
    }

    if (filters.music !== "any") {
      const musicMap = {
        "live music": ["live music", "music", "concert", "theater"],
        dj: ["dj", "dance", "nightclub", "club"],
        "hip hop": ["hip hop"],
        house: ["house"],
        rock: ["rock"],
        latin: ["latin"],
        "top 40": ["top 40"]
      };

      const needed = musicMap[filters.music] || [filters.music];
      const ok = needed.some((word) => hay.includes(normalize(word)));
      if (!ok) return false;
    }

    if (filters.vibe !== "any") {
      const vibeMap = {
        waterfront: ["waterfront", "river", "pier", "harbor", "sinatra", "boulevard east", "boardwalk", "beach"],
        rooftop: ["rooftop", "roof"],
        sports: ["sports"],
        dancing: ["dance", "dancing", "dj", "club"],
        "cheap drinks": ["dive", "pub", "tavern", "cheap"]
      };

      const needed = vibeMap[filters.vibe] || [filters.vibe];
      const ok = needed.some((word) => hay.includes(normalize(word)));
      if (!ok) return false;
    }

    return true;
  }

  function placeLinksHtml(place, town) {
    const q = `${place.name} ${place.address || town} NJ`;
    const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    const photos = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + " " + town + " NJ")}`;
    const search = `https://www.google.com/search?q=${encodeURIComponent(place.name + " " + town + " NJ")}`;

    return `
      <div class="result-links">
        <a href="${directions}" target="_blank" rel="noopener noreferrer">Directions</a>
        <a href="${photos}" target="_blank" rel="noopener noreferrer">Photos</a>
        <a href="${search}" target="_blank" rel="noopener noreferrer">Search</a>
      </div>
    `;
  }

  function modeButtonsHtml(active) {
    const mk = (mode, label) => {
      const activeClass = active === mode ? "active-mode" : "";
      return `<button type="button" class="mode-btn ${activeClass}" data-mode="${mode}">${label}</button>`;
    };

    return `
      <div class="mode-switch">
        ${mk("nightlife", "Nightlife")}
        ${mk("restaurants", "Restaurants")}
        ${mk("everything", "Everything")}
      </div>
    `;
  }

  function placeCardsHtml(center, midpointInfo, places, mode) {
    const sorted = places
      .map((p) => ({
        ...p,
        distance: milesBetween(center.lat, center.lng, p.lat, p.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    if (!sorted.length) {
      return `
        <div class="card">
          <p style="margin:0;">No results found in ${escapeHtml(midpointInfo.town)}.</p>
        </div>
      `;
    }

    return sorted
      .map((p) => {
        return `
          <div class="card">
            <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
            <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
            <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(midpointInfo.town)}</p>
            <p style="margin:4px 0;"><b>Distance:</b> ${p.distance.toFixed(1)} miles</p>
            ${p.address ? `<p style="margin:4px 0;"><b>Address:</b> ${escapeHtml(p.address)}</p>` : ""}
            ${placeLinksHtml(p, midpointInfo.town)}
          </div>
        `;
      })
      .join("");
  }

  let lastSearchState = null;

  function renderMiddleResults(mid, midpointInfo, places, geoA, geoB, mode) {
    els.results.innerHTML = `
      <h2>Meet in the Middle Results</h2>

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

      ${placeCardsHtml(mid, midpointInfo, places, mode)}
    `;

    lastSearchState = {
      kind: "middle",
      mid,
      midpointInfo,
      geoA,
      geoB
    };

    wireModeButtons();
  }

  function renderGroupResults(mid, midpointInfo, places, geos, mode) {
    const list = geos
      .map((g, i) => `<p><b>Point ${i + 1}:</b> ${escapeHtml(g.display)}</p>`)
      .join("");

    els.results.innerHTML = `
      <h2>Group Center Results</h2>

      <div class="card">
        ${list}
        <p><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
        ${midpointInfo.county ? `<p><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
        <p><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open group midpoint in Google Maps</a>
        </div>
        ${modeButtonsHtml(mode)}
      </div>

      ${placeCardsHtml(mid, midpointInfo, places, mode)}
    `;

    lastSearchState = {
      kind: "group",
      mid,
      midpointInfo,
      geos
    };

    wireModeButtons();
  }

  function renderSoloResults(center, areaInfo, places, filters) {
    const filtered = places.filter((p) => matchesSoloFilters(p, filters));

    const sorted = filtered
      .map((p) => ({
        ...p,
        distance: milesBetween(center.lat, center.lng, p.lat, p.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    els.results.innerHTML = `
      <h2>Solo Search Results</h2>

      <div class="card">
        <p><b>Town:</b> ${escapeHtml(areaInfo.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(areaInfo.zip || "Not available")}</p>
        ${areaInfo.county ? `<p><b>County:</b> ${escapeHtml(areaInfo.county)}</p>` : ""}
        <p><b>Area:</b> ${escapeHtml(areaInfo.address)}</p>
        <p><b>Filters:</b> Crowd: ${escapeHtml(filters.crowd)} | Music: ${escapeHtml(filters.music)} | Venue: ${escapeHtml(filters.venue)} | Vibe: ${escapeHtml(filters.vibe)}</p>
      </div>

      ${
        sorted.length
          ? sorted
              .map((p) => {
                return `
                  <div class="card">
                    <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
                    <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
                    <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(areaInfo.town)}</p>
                    <p style="margin:4px 0;"><b>Distance:</b> ${p.distance.toFixed(1)} miles</p>
                    ${p.address ? `<p style="margin:4px 0;"><b>Address:</b> ${escapeHtml(p.address)}</p>` : ""}
                    ${placeLinksHtml(p, areaInfo.town)}
                  </div>
                `;
              })
              .join("")
          : `<div class="card"><p style="margin:0;">No venues matched your current filters in ${escapeHtml(areaInfo.town)}.</p></div>`
      }
    `;
  }

  async function rerunMode(mode) {
    if (!lastSearchState) return;

    els.results.innerHTML = `<p>Loading ${escapeHtml(mode)}...</p>`;

    const places = await searchNearbyPlaces(lastSearchState.mid.lat, lastSearchState.mid.lng, mode);

    if (lastSearchState.kind === "middle") {
      renderMiddleResults(
        lastSearchState.mid,
        lastSearchState.midpointInfo,
        places,
        lastSearchState.geoA,
        lastSearchState.geoB,
        mode
      );
    } else if (lastSearchState.kind === "group") {
      renderGroupResults(
        lastSearchState.mid,
        lastSearchState.midpointInfo,
        places,
        lastSearchState.geos,
        mode
      );
    }
  }

  function wireModeButtons() {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.getAttribute("data-mode");
        try {
          await rerunMode(mode);
        } catch (err) {
          els.results.innerHTML = `
            <div class="card error-card">
              <p style="margin:0;">${escapeHtml(err.message || "Could not switch modes")}</p>
            </div>
          `;
        }
      });
    });
  }

  async function soloSearch() {
    const q = els.soloQuery.value.trim();

    if (!q) {
      alert("Enter a town, ZIP, address, or coordinates.");
      return;
    }

    const filters = {
      crowd: els.soloCrowd.value || "any",
      music: els.soloMusic.value || "any",
      venue: els.soloVenue.value || "any",
      vibe: els.soloVibe.value || "any"
    };

    els.results.innerHTML = `<p>Searching ${escapeHtml(q)}...</p>`;

    try {
      const center = await geocodeAddress(q);
      const areaInfo = await reverseGeocode(center.lat, center.lng);

      const mode = filters.venue === "restaurant" ? "restaurants" : "everything";
      const places = await searchNearbyPlaces(center.lat, center.lng, mode);

      renderSoloResults(center, areaInfo, places, filters);
      lastSearchState = null;
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Search failed")}</p>
        </div>
      `;
    }
  }

  async function meetInMiddle() {
    const a = els.locA.value.trim();
    const b = els.locB.value.trim();

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
      const places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");

      renderMiddleResults(mid, midpointInfo, places, geoA, geoB, "nightlife");
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Midpoint failed")}</p>
        </div>
      `;
    }
  }

  async function groupCenter() {
    const lines = els.groupList.value
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
        const geo = await geocodeAddress(line);
        geos.push(geo);
      }

      const mid = centroid(geos);
      const midpointInfo = await reverseGeocode(mid.lat, mid.lng);
      const places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");

      renderGroupResults(mid, midpointInfo, places, geos, "nightlife");
    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Group center failed")}</p>
        </div>
      `;
    }
  }

  function loadNJVenues() {
    els.results.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0;">Starter NJ towns</h3>
        <p style="margin-bottom:6px;">Tap one of the starter towns below or run a Solo, Middle, or Group search.</p>
      </div>
    `;
  }

  function generateNightPlan() {
    const q = els.aiPrompt.value.trim();

    if (!q) {
      alert("Enter a night plan prompt.");
      return;
    }

    els.results.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0;">Night Plan</h3>
        <p><b>Prompt:</b> ${escapeHtml(q)}</p>
        <p>Use Solo Search, Meet in the Middle, or Group Center first, then refine from the live results below.</p>
      </div>
    `;
  }

  function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const panels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");

        tabButtons.forEach((b) => b.classList.remove("active-tab"));
        panels.forEach((p) => p.classList.remove("active-panel"));

        btn.classList.add("active-tab");

        const panel = document.getElementById(`panel-${tab}`);
        if (panel) {
          panel.classList.add("active-panel");
        }
      });
    });
  }

  function setupStarterTowns() {
    if (!els.starterTowns) return;

    els.starterTowns.innerHTML = "";

    STARTER_TOWNS.forEach((town) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "starter-chip";
      btn.textContent = town.replace(", NJ", "");
      btn.addEventListener("click", () => {
        els.soloQuery.value = town;
      });
      els.starterTowns.appendChild(btn);
    });
  }

  els.searchBtn.addEventListener("click", soloSearch);
  els.loadNJ.addEventListener("click", loadNJVenues);
  els.middleBtn.addEventListener("click", meetInMiddle);
  els.groupBtn.addEventListener("click", groupCenter);
  els.aiBtn.addEventListener("click", generateNightPlan);

  setupTabs();
  setupStarterTowns();
});
  
