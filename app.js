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
    aiBtn: $("aiBtn")
  };

  let activeMode = "solo";

  const NJ_TOWNS = [
    { town: "Hoboken", zip: "07030", county: "Hudson County", lat: 40.7440, lng: -74.0324 },
    { town: "Weehawken", zip: "07086", county: "Hudson County", lat: 40.7695, lng: -74.0204 },
    { town: "Jersey City", zip: "07302", county: "Hudson County", lat: 40.7190, lng: -74.0425 },
    { town: "Newark", zip: "07105", county: "Essex County", lat: 40.7256, lng: -74.1548 },
    { town: "Fairview", zip: "07022", county: "Bergen County", lat: 40.8193, lng: -73.9996 },
    { town: "Saddle Brook", zip: "07663", county: "Bergen County", lat: 40.8984, lng: -74.0926 },
    { town: "Bayonne", zip: "07002", county: "Hudson County", lat: 40.6687, lng: -74.1143 },
    { town: "Fort Lee", zip: "07024", county: "Bergen County", lat: 40.8509, lng: -73.9701 },
    { town: "Asbury Park", zip: "07712", county: "Monmouth County", lat: 40.2204, lng: -74.0121 },
    { town: "Point Pleasant Beach", zip: "08742", county: "Ocean County", lat: 40.0937, lng: -74.0479 },
    { town: "Atlantic City", zip: "08401", county: "Atlantic County", lat: 39.3643, lng: -74.4229 },
    { town: "Montclair", zip: "07042", county: "Essex County", lat: 40.8259, lng: -74.2090 },
    { town: "Morristown", zip: "07960", county: "Morris County", lat: 40.7968, lng: -74.4815 },
    { town: "Red Bank", zip: "07701", county: "Monmouth County", lat: 40.3471, lng: -74.0643 },
    { town: "Seaside Heights", zip: "08751", county: "Ocean County", lat: 39.9443, lng: -74.0729 },
    { town: "Wildwood", zip: "08260", county: "Cape May County", lat: 38.9918, lng: -74.8149 },
    { town: "Point Pleasant", zip: "08742", county: "Ocean County", lat: 40.0832, lng: -74.0682 }
  ];

  const STARTER_VENUES = [
    {
      name: "Son Cubano",
      town: "Weehawken",
      zip: "07086",
      county: "Hudson County",
      lat: 40.7785,
      lng: -74.0078,
      type: "restaurant bar",
      crowd: ["30+", "40+", "50+"],
      music: ["dj", "latin", "lounge"],
      vibe: ["waterfront", "upscale", "dancing"],
      address: "40-4 Riverwalk Pl, West New York, NJ 07093",
      notes: "Waterfront restaurant-bar with nightlife energy."
    },
    {
      name: "Waterside Restaurant and Catering",
      town: "North Bergen",
      zip: "07047",
      county: "Hudson County",
      lat: 40.7904,
      lng: -74.0038,
      type: "restaurant bar",
      crowd: ["30+", "40+", "50+"],
      music: ["dj", "lounge"],
      vibe: ["waterfront", "upscale"],
      address: "7800 B River Rd, North Bergen, NJ 07047",
      notes: "Waterfront event and nightlife-style restaurant."
    },
    {
      name: "Bar 115",
      town: "Edgewater",
      zip: "07020",
      county: "Bergen County",
      lat: 40.8132,
      lng: -73.9795,
      type: "lounge",
      crowd: ["30+", "40+"],
      music: ["dj", "house", "latin"],
      vibe: ["upscale", "dancing"],
      address: "115 River Rd, Edgewater, NJ 07020",
      notes: "Upscale lounge style crowd."
    },
    {
      name: "McGovern's Tavern",
      town: "Newark",
      zip: "07102",
      county: "Essex County",
      lat: 40.7369,
      lng: -74.1706,
      type: "tavern",
      crowd: ["30+", "40+", "50+"],
      music: ["live music", "rock"],
      vibe: ["cheap drinks", "classic"],
      address: "58 New St, Newark, NJ 07102",
      notes: "Classic Newark tavern."
    },
    {
      name: "Grand Vin",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7486,
      lng: -74.0324,
      type: "restaurant bar",
      crowd: ["30+", "40+", "50+"],
      music: ["live music", "jazz"],
      vibe: ["upscale"],
      address: "500 Grand St, Hoboken, NJ 07030",
      notes: "Grown-up crowd and polished vibe."
    },
    {
      name: "Finnegan's Pub",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7517,
      lng: -74.0333,
      type: "pub",
      crowd: ["30+", "40+"],
      music: ["live music", "rock"],
      vibe: ["classic"],
      address: "734 Willow Ave, Hoboken, NJ 07030",
      notes: "Classic live music pub."
    },
    {
      name: "Mills Tavern",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7398,
      lng: -74.0306,
      type: "restaurant bar",
      crowd: ["30+", "40+"],
      music: ["dj", "top 40"],
      vibe: ["dancing", "upscale"],
      address: "125 Washington St, Hoboken, NJ 07030",
      notes: "Dinner to drinks crossover."
    },
    {
      name: "8th Street Tavern",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7446,
      lng: -74.0283,
      type: "tavern",
      crowd: ["30+", "40+"],
      music: ["any"],
      vibe: ["classic"],
      address: "728 Washington St, Hoboken, NJ 07030",
      notes: "Neighborhood tavern."
    },
    {
      name: "The Ainsworth",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7378,
      lng: -74.0270,
      type: "restaurant bar",
      crowd: ["30+", "40+"],
      music: ["dj", "top 40"],
      vibe: ["waterfront", "sports", "upscale"],
      address: "310 Sinatra Dr, Hoboken, NJ 07030",
      notes: "Waterfront restaurant-bar."
    },
    {
      name: "Blue Eyes Restaurant",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7374,
      lng: -74.0265,
      type: "restaurant bar",
      crowd: ["30+", "40+", "50+"],
      music: ["any"],
      vibe: ["waterfront", "upscale"],
      address: "525 Sinatra Dr, Hoboken, NJ 07030",
      notes: "Waterfront Italian restaurant."
    },
    {
      name: "W Hoboken Lobby Bar",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7391,
      lng: -74.0253,
      type: "lounge",
      crowd: ["30+", "40+", "50+"],
      music: ["lounge", "dj"],
      vibe: ["waterfront", "upscale"],
      address: "225 River St, Hoboken, NJ 07030",
      notes: "Hotel lounge/bar with upscale crowd."
    },
    {
      name: "Bar Franco",
      town: "Montclair",
      zip: "07042",
      county: "Essex County",
      lat: 40.8177,
      lng: -74.2102,
      type: "lounge",
      crowd: ["30+", "40+"],
      music: ["dj", "house", "lounge"],
      vibe: ["upscale"],
      address: "5 Church St, Montclair, NJ 07042",
      notes: "Stylish cocktail lounge."
    },
    {
      name: "Wellmont Theater",
      town: "Montclair",
      zip: "07042",
      county: "Essex County",
      lat: 40.8127,
      lng: -74.2140,
      type: "concert venue",
      crowd: ["20s", "30+", "40+", "50+"],
      music: ["live music"],
      vibe: ["events"],
      address: "5 Seymour St, Montclair, NJ 07042",
      notes: "Major concert hall."
    },
    {
      name: "Stone Pony",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2208,
      lng: -73.9989,
      type: "concert venue",
      crowd: ["20s", "30+", "40+"],
      music: ["live music", "dj", "rock"],
      vibe: ["boardwalk", "events"],
      address: "913 Ocean Ave, Asbury Park, NJ 07712",
      notes: "Iconic live music venue."
    },
    {
      name: "Watermark",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2197,
      lng: -73.9982,
      type: "lounge",
      crowd: ["30+", "40+"],
      music: ["dj", "house", "lounge"],
      vibe: ["waterfront", "rooftop", "upscale"],
      address: "800 Ocean Ave, Asbury Park, NJ 07712",
      notes: "Oceanfront lounge."
    },
    {
      name: "Asbury Lanes",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2233,
      lng: -74.0020,
      type: "bar arcade",
      crowd: ["20s", "30+", "40+"],
      music: ["live music", "dj"],
      vibe: ["arcade", "events"],
      address: "209 4th Ave, Asbury Park, NJ 07712",
      notes: "Bowling, events, nightlife crossover."
    },
    {
      name: "Jenkinson's",
      town: "Point Pleasant Beach",
      zip: "08742",
      county: "Ocean County",
      lat: 40.0942,
      lng: -74.0362,
      type: "club",
      crowd: ["20s", "30+"],
      music: ["dj", "top 40", "house"],
      vibe: ["boardwalk", "beach", "dancing"],
      address: "300 Ocean Ave, Point Pleasant Beach, NJ 08742",
      notes: "Major beach nightlife spot."
    },
    {
      name: "Martell's Tiki Bar",
      town: "Point Pleasant Beach",
      zip: "08742",
      county: "Ocean County",
      lat: 40.0947,
      lng: -74.0358,
      type: "bar",
      crowd: ["20s", "30+", "40+"],
      music: ["live music", "dj", "top 40"],
      vibe: ["beach", "boardwalk"],
      address: "308 Boardwalk, Point Pleasant Beach, NJ 08742",
      notes: "Big summer beach bar."
    },
    {
      name: "Atlantic City Casino Club",
      town: "Atlantic City",
      zip: "08401",
      county: "Atlantic County",
      lat: 39.3565,
      lng: -74.4313,
      type: "club",
      crowd: ["20s", "30+", "40+"],
      music: ["dj", "house", "edm"],
      vibe: ["casino", "upscale", "events"],
      address: "1000 Boardwalk, Atlantic City, NJ 08401",
      notes: "Atlantic City casino nightlife."
    }
  ];

  const STARTER_TOWNS = [
    "Hoboken",
    "Weehawken",
    "Jersey City",
    "Newark",
    "Fairview",
    "Saddle Brook",
    "Fort Lee",
    "Asbury Park",
    "Point Pleasant Beach",
    "Atlantic City"
  ];

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/,/g, " ")
      .replace(/\./g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCase(text) {
    return String(text || "")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");
  }

  function extractZip(text) {
    const match = String(text || "").match(/\b\d{5}\b/);
    return match ? match[0] : "";
  }

  function parseLatLng(text) {
    const match = String(text || "").match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (!match) return null;
    return {
      lat: Number(match[1]),
      lng: Number(match[2])
    };
  }

  function toRad(d) {
    return (d * Math.PI) / 180;
  }

  function milesBetween(lat1, lng1, lat2, lng2) {
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

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

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[m][n];
  }

  function bestTownMatch(input) {
    const n = normalize(input);
    let best = null;
    let bestScore = Infinity;

    for (const town of NJ_TOWNS) {
      const dist = levenshtein(n, normalize(town.town));
      if (dist < bestScore) {
        bestScore = dist;
        best = town;
      }
      if (n.includes(normalize(town.town))) {
        return town;
      }
      if (extractZip(n) && extractZip(n) === town.zip) {
        return town;
      }
    }

    if (best && bestScore <= 3) return best;
    return null;
  }

  function nearestTownByPoint(lat, lng) {
    let winner = null;
    let bestMiles = Infinity;

    for (const town of NJ_TOWNS) {
      const d = milesBetween(lat, lng, town.lat, town.lng);
      if (d < bestMiles) {
        bestMiles = d;
        winner = town;
      }
    }

    return winner;
  }

  async function resolveLocation(input) {
    const raw = String(input || "").trim();
    if (!raw) throw new Error("Missing location");

    const latlng = parseLatLng(raw);
    if (latlng) {
      const town = nearestTownByPoint(latlng.lat, latlng.lng);
      return {
        input: raw,
        display: raw,
        town: town?.town || "Unknown",
        zip: town?.zip || "",
        county: town?.county || "",
        lat: latlng.lat,
        lng: latlng.lng
      };
    }

    const zip = extractZip(raw);
    if (zip) {
      const townByZip = NJ_TOWNS.find((t) => t.zip === zip);
      if (townByZip) {
        return {
          input: raw,
          display: `${townByZip.town}, NJ ${townByZip.zip}`,
          town: townByZip.town,
          zip: townByZip.zip,
          county: townByZip.county,
          lat: townByZip.lat,
          lng: townByZip.lng
        };
      }
    }

    const match = bestTownMatch(raw);
    if (match) {
      return {
        input: raw,
        display: `${match.town}, NJ ${match.zip}`,
        town: match.town,
        zip: match.zip,
        county: match.county,
        lat: match.lat,
        lng: match.lng
      };
    }

    throw new Error("Town or ZIP not found in NightScout yet. Try a major NJ town or ZIP.");
  }

  function venueMatchesFilters(venue, filters) {
    const crowd = filters.crowd || "any";
    const music = filters.music || "any";
    const type = filters.venue || "any";
    const vibe = filters.vibe || "any";

    if (crowd !== "any" && !venue.crowd.includes(crowd)) return false;

    if (music !== "any") {
      const wanted = normalize(music);
      const found = venue.music.some((m) => normalize(m).includes(wanted));
      if (!found) return false;
    }

    if (type !== "any") {
      const typeNorm = normalize(type);
      if (!normalize(venue.type).includes(typeNorm)) return false;
    }

    if (vibe !== "any") {
      const vibeNorm = normalize(vibe);
      const found = venue.vibe.some((v) => normalize(v).includes(vibeNorm));
      if (!found) return false;
    }

    return true;
  }

  function venuesNearPoint(lat, lng, maxMiles = 10) {
    return STARTER_VENUES
      .map((v) => ({
        ...v,
        distance: milesBetween(lat, lng, v.lat, v.lng)
      }))
      .filter((v) => v.distance <= maxMiles)
      .sort((a, b) => a.distance - b.distance);
  }

  function venuesInTown(townName) {
    const n = normalize(townName);
    return STARTER_VENUES
      .filter((v) => normalize(v.town) === n)
      .map((v) => ({
        ...v,
        distance: 0
      }));
  }

  function buildVenueCard(v) {
    const q = encodeURIComponent(`${v.name} ${v.address || v.town}`);
    const photoQ = encodeURIComponent(`${v.name} ${v.town} photos`);
    const searchQ = encodeURIComponent(`${v.name} ${v.town} NJ`);

    return `
      <div class="card">
        <h3>${escapeHtml(v.name)}</h3>
        <p><b>Type:</b> ${escapeHtml(v.type)}</p>
        <p><b>Town:</b> ${escapeHtml(v.town)}</p>
        ${v.address ? `<p><b>Address:</b> ${escapeHtml(v.address)}</p>` : ""}
        ${typeof v.distance === "number" ? `<p><b>Distance:</b> ${v.distance.toFixed(1)} miles</p>` : ""}
        ${v.notes ? `<p class="muted">${escapeHtml(v.notes)}</p>` : ""}
        <div class="result-links">
          <a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener noreferrer">Directions</a>
          <a href="https://www.google.com/search?tbm=isch&q=${photoQ}" target="_blank" rel="noopener noreferrer">Photos</a>
          <a href="https://www.google.com/search?q=${searchQ}" target="_blank" rel="noopener noreferrer">Search</a>
        </div>
      </div>
    `;
  }

  function renderError(message) {
    if (!els.results) return;
    els.results.innerHTML = `
      <div class="card" style="border-color:#e2b4b4;background:#fff4f4;">
        <p style="margin:0;"><b>Error:</b> ${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderStarterTowns() {
    return `
      <div class="solo-panel">
        <p class="muted small">Solo search stays on this page and searches the town or ZIP you entered.</p>
        <h3 style="font-size:20px;margin-top:18px;">Starter towns</h3>
        <div class="chip-row">
          ${STARTER_TOWNS.map(
            (town) =>
              `<button type="button" class="starter-town-btn" data-town="${escapeHtml(town)}">${escapeHtml(town)}</button>`
          ).join("")}
        </div>
      </div>
    `;
  }

  function renderSoloResults(area, venues, filters) {
    if (!els.results) return;

    const filtered = venues.filter((v) => venueMatchesFilters(v, filters));

    els.results.innerHTML = `
      <h2>Solo Search Results</h2>
      <p class="muted">Showing in-page results for <b>${escapeHtml(area.town)}</b> ${escapeHtml(area.zip)}.</p>

      <div class="card">
        <p><b>Town:</b> ${escapeHtml(area.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(area.zip)}</p>
        <p><b>County:</b> ${escapeHtml(area.county || "Unknown")}</p>
        <p><b>Filters:</b> Crowd: ${escapeHtml(filters.crowd)} | Music: ${escapeHtml(filters.music)} | Venue: ${escapeHtml(filters.venue)} | Vibe: ${escapeHtml(filters.vibe)}</p>
      </div>

      ${
        filtered.length
          ? filtered.map(buildVenueCard).join("")
          : `<div class="card"><p>No venues matched your current solo filters in ${escapeHtml(area.town)}.</p></div>`
      }
    `;
  }

  function renderMiddleResults(a, b, midTown, venues) {
    if (!els.results) return;

    els.results.innerHTML = `
      <h2>Meet in the Middle Results</h2>
      <p class="muted">Closest nightlife options to the calculated midpoint</p>

      <div class="card">
        <p><b>Location A:</b> ${escapeHtml(a.display)}</p>
        <p><b>Location B:</b> ${escapeHtml(b.display)}</p>
        <p><b>Midpoint Town:</b> ${escapeHtml(midTown.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(midTown.zip)}</p>
        <p><b>County:</b> ${escapeHtml(midTown.county)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${midTown.lat},${midTown.lng}" target="_blank" rel="noopener noreferrer">Open midpoint in Google Maps</a>
          <a href="https://www.google.com/search?q=${encodeURIComponent(`${midTown.town} NJ nightlife events`)}` target="_blank" rel="noopener noreferrer">Search this town</a>
        </div>
      </div>

      ${venues.length ? venues.map(buildVenueCard).join("") : `<div class="card"><p>No nightlife venues found near the midpoint yet.</p></div>`}
    `;
  }

  function renderGroupResults(points, midTown, venues) {
    if (!els.results) return;

    els.results.innerHTML = `
      <h2>Group Center Results</h2>
      <p class="muted">Closest nightlife options to the calculated group midpoint</p>

      <div class="card">
        ${points.map((p, i) => `<p><b>Point ${i + 1}:</b> ${escapeHtml(p.display)}</p>`).join("")}
        <p><b>Midpoint Town:</b> ${escapeHtml(midTown.town)}</p>
        <p><b>ZIP:</b> ${escapeHtml(midTown.zip)}</p>
        <p><b>County:</b> ${escapeHtml(midTown.county)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${midTown.lat},${midTown.lng}" target="_blank" rel="noopener noreferrer">Open group midpoint in Google Maps</a>
          <a href="https://www.google.com/search?q=${encodeURIComponent(`${midTown.town} NJ nightlife events`)}` target="_blank" rel="noopener noreferrer">Search this town</a>
        </div>
      </div>

      ${venues.length ? venues.map(buildVenueCard).join("") : `<div class="card"><p>No nightlife venues found near the group center yet.</p></div>`}
    `;
  }

  function renderNightPlan(prompt) {
    if (!els.results) return;

    const p = normalize(prompt);

    let suggestions = [];

    if (p.includes("beach")) {
      suggestions = STARTER_VENUES.filter((v) => v.vibe.includes("beach") || v.vibe.includes("boardwalk"));
    } else if (p.includes("rooftop")) {
      suggestions = STARTER_VENUES.filter((v) => v.vibe.includes("rooftop") || v.vibe.includes("upscale"));
    } else if (p.includes("dj")) {
      suggestions = STARTER_VENUES.filter((v) => v.music.includes("dj"));
    } else if (p.includes("live music")) {
      suggestions = STARTER_VENUES.filter((v) => v.music.includes("live music"));
    } else {
      suggestions = STARTER_VENUES.slice(0, 6);
    }

    els.results.innerHTML = `
      <h2>Night Plan</h2>
      <div class="card">
        <p><b>Prompt:</b> ${escapeHtml(prompt || "No prompt entered")}</p>
        <p>Here are some matching starter nightlife ideas:</p>
      </div>
      ${suggestions.slice(0, 8).map(buildVenueCard).join("")}
    `;
  }

  function setMode(mode) {
    activeMode = mode;

    const allButtons = Array.from(document.querySelectorAll("button"));
    allButtons.forEach((btn) => {
      const text = normalize(btn.textContent);
      const isModeButton =
        text === "solo" || text === "middle" || text === "group" || text === "ai";

      if (!isModeButton) return;

      if (text === mode) {
        btn.style.background = "#111";
        btn.style.color = "#fff";
      } else {
        btn.style.background = "#eee";
        btn.style.color = "#1473d7";
      }
    });

    const headers = Array.from(document.querySelectorAll("h3"));
    headers.forEach((h) => {
      const t = normalize(h.textContent);
      const nextEls = [];
      let sib = h.nextElementSibling;
      while (sib && sib.tagName !== "H3" && sib.tagName !== "H2") {
        nextEls.push(sib);
        sib = sib.nextElementSibling;
      }

      if (t === "solo search") {
        const show = mode === "solo";
        h.style.display = show ? "" : "none";
        nextEls.forEach((el) => (el.style.display = show ? "" : "none"));
      }

      if (t === "meet in the middle") {
        const show = mode === "middle";
        h.style.display = show ? "" : "none";
        nextEls.forEach((el) => (el.style.display = show ? "" : "none"));
      }

      if (t === "group coordination") {
        const show = mode === "group";
        h.style.display = show ? "" : "none";
        nextEls.forEach((el) => (el.style.display = show ? "" : "none"));
      }

      if (t === "night plan") {
        const show = mode === "ai";
        h.style.display = show ? "" : "none";
        nextEls.forEach((el) => (el.style.display = show ? "" : "none"));
      }
    });
  }

  async function soloSearch() {
    try {
      const raw = els.soloQuery?.value?.trim();
      if (!raw) throw new Error("Enter a town, ZIP, address, or lat/lng.");

      const area = await resolveLocation(raw);

      const filters = {
        crowd: els.soloCrowd?.value || "any",
        music: els.soloMusic?.value || "any",
        venue: els.soloVenue?.value || "any",
        vibe: els.soloVibe?.value || "any"
      };

      let venues = venuesInTown(area.town);

      if (!venues.length) {
        venues = venuesNearPoint(area.lat, area.lng, 8);
      }

      renderSoloResults(area, venues, filters);
    } catch (err) {
      renderError(err.message || "Could not run solo search.");
    }
  }

  async function meetInMiddle() {
    try {
      const rawA = els.locA?.value?.trim();
      const rawB = els.locB?.value?.trim();

      if (!rawA || !rawB) throw new Error("Enter both locations.");

      const a = await resolveLocation(rawA);
      const b = await resolveLocation(rawB);

      const mid = midpoint(a, b);
      const midTown = nearestTownByPoint(mid.lat, mid.lng);

      const venues = venuesNearPoint(mid.lat, mid.lng, 10);

      renderMiddleResults(a, b, midTown, venues);
    } catch (err) {
      renderError(err.message || "Could not calculate midpoint.");
    }
  }

  async function groupCenter() {
    try {
      const lines = String(els.groupList?.value || "")
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new Error("Enter at least 2 towns, ZIPs, addresses, or coordinates.");
      }

      const points = [];
      for (const line of lines) {
        points.push(await resolveLocation(line));
      }

      const center = centroid(points);
      const midTown = nearestTownByPoint(center.lat, center.lng);
      const venues = venuesNearPoint(center.lat, center.lng, 10);

      renderGroupResults(points, midTown, venues);
    } catch (err) {
      renderError(err.message || "Could not calculate group center.");
    }
  }

  function loadNJVenues() {
    if (!els.results) return;

    els.results.innerHTML = `
      <h2>NightScout Starter Towns</h2>
      ${renderStarterTowns()}
    `;

    document.querySelectorAll(".starter-town-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (els.soloQuery) els.soloQuery.value = btn.getAttribute("data-town") || "";
        setMode("solo");
        soloSearch();
      });
    });
  }

  function generateNightPlan() {
    const prompt = els.aiPrompt?.value?.trim() || "";
    renderNightPlan(prompt);
  }

  els.searchBtn?.addEventListener("click", soloSearch);
  els.loadNJ?.addEventListener("click", loadNJVenues);
  els.middleBtn?.addEventListener("click", meetInMiddle);
  els.groupBtn?.addEventListener("click", groupCenter);
  els.aiBtn?.addEventListener("click", generateNightPlan);

  const modeButtons = Array.from(document.querySelectorAll("button")).filter((btn) => {
    const t = normalize(btn.textContent);
    return t === "solo" || t === "middle" || t === "group" || t === "ai";
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = normalize(btn.textContent);
      setMode(mode);
    });
  });

  setMode("solo");
});
  
