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
    starterTowns: $("starterTowns"),
    tabSolo: $("tabSolo"),
    tabMiddle: $("tabMiddle"),
    tabGroup: $("tabGroup"),
    tabAI: $("tabAI"),
    soloPanel: $("soloPanel"),
    middlePanel: $("middlePanel"),
    groupPanel: $("groupPanel"),
    aiPanel: $("aiPanel")
  };

  let lastResults = [];
  let lastSearchMeta = null;

  const starterTowns = [
    "Hoboken",
    "Weehawken",
    "Jersey City",
    "Newark",
    "Fairview",
    "Saddle Brook",
    "Fort Lee",
    "Asbury Park",
    "Point Pleasant",
    "Atlantic City",
    "Montclair"
  ];

  const townCenters = {
    "hoboken": { lat: 40.7433, lng: -74.0288, zip: "07030", county: "Hudson County" },
    "weehawken": { lat: 40.7695, lng: -74.0204, zip: "07086", county: "Hudson County" },
    "jersey city": { lat: 40.7178, lng: -74.0431, zip: "07302", county: "Hudson County" },
    "newark": { lat: 40.7357, lng: -74.1724, zip: "07105", county: "Essex County" },
    "fairview": { lat: 40.8126, lng: -73.9990, zip: "07022", county: "Bergen County" },
    "saddle brook": { lat: 40.8995, lng: -74.0921, zip: "07663", county: "Bergen County" },
    "fort lee": { lat: 40.8509, lng: -73.9701, zip: "07024", county: "Bergen County" },
    "montclair": { lat: 40.8259, lng: -74.2090, zip: "07042", county: "Essex County" },
    "asbury park": { lat: 40.2204, lng: -74.0121, zip: "07712", county: "Monmouth County" },
    "point pleasant": { lat: 40.0912, lng: -74.0479, zip: "08742", county: "Ocean County" },
    "atlantic city": { lat: 39.3643, lng: -74.4229, zip: "08401", county: "Atlantic County" }
  };

  const venues = [
    {
      name: "Ainsworth Hoboken",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7397,
      lng: -74.0267,
      type: "restaurant bar",
      crowd: "30+",
      music: "dj",
      vibe: "waterfront",
      address: "310 Sinatra Dr, Hoboken, NJ 07030",
      hours: "Typical late afternoon to late night",
      happyHour: "Often weekday happy hour",
      events: "Popular for game days and weekend nightlife",
      notes: "Waterfront restaurant bar with strong social crowd and nightlife crossover"
    },
    {
      name: "Blue Eyes Restaurant",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7445,
      lng: -74.0257,
      type: "restaurant bar",
      crowd: "30+",
      music: "any",
      vibe: "waterfront",
      address: "525 Sinatra Dr, Hoboken, NJ 07030",
      hours: "Lunch through dinner",
      happyHour: "Check current specials",
      events: "Waterfront dining favorite",
      notes: "Strong Sinatra Drive waterfront pick"
    },
    {
      name: "Halifax",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7391,
      lng: -74.0283,
      type: "restaurant bar",
      crowd: "30+",
      music: "dj",
      vibe: "waterfront",
      address: "225 River St, Hoboken, NJ 07030",
      hours: "Dinner and late cocktails",
      happyHour: "Check current happy hour",
      events: "Hotel nightlife crossover",
      notes: "At the W area, polished crowd"
    },
    {
      name: "Grand Vin",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7486,
      lng: -74.0324,
      type: "lounge",
      crowd: "30+",
      music: "live music",
      vibe: "cheap drinks",
      address: "500 Grand St, Hoboken, NJ 07030",
      hours: "Afternoon through night",
      happyHour: "Known for weekday specials",
      events: "Live music nights",
      notes: "More grown-up than college crowd"
    },
    {
      name: "Texas Arizona",
      town: "Hoboken",
      zip: "07030",
      county: "Hudson County",
      lat: 40.7379,
      lng: -74.0295,
      type: "bar",
      crowd: "20s",
      music: "dj",
      vibe: "dancing",
      address: "76 River St, Hoboken, NJ 07030",
      hours: "Late-night",
      happyHour: "Check local specials",
      events: "Party-heavy nights",
      notes: "Younger crowd"
    },
    {
      name: "Son Cubano",
      town: "Weehawken",
      zip: "07086",
      county: "Hudson County",
      lat: 40.7785,
      lng: -74.0078,
      type: "restaurant bar",
      crowd: "30+",
      music: "latin",
      vibe: "waterfront",
      address: "40 Riverwalk Pl, Weehawken, NJ 07086",
      hours: "Dinner through late night",
      happyHour: "Check current cocktail deals",
      events: "Upscale dinner and nightlife energy",
      notes: "High-end crowd, very strong waterfront choice"
    },
    {
      name: "Blu on the Hudson",
      town: "Weehawken",
      zip: "07086",
      county: "Hudson County",
      lat: 40.7718,
      lng: -74.0153,
      type: "restaurant bar",
      crowd: "30+",
      music: "dj",
      vibe: "waterfront",
      address: "1200 Harbor Blvd, Weehawken, NJ 07086",
      hours: "Dinner through late night",
      happyHour: "Check current specials",
      events: "Date-night and nightlife crossover",
      notes: "Very pretty crowd, upscale energy"
    },
    {
      name: "Cellar 335",
      town: "Jersey City",
      zip: "07302",
      county: "Hudson County",
      lat: 40.7219,
      lng: -74.0464,
      type: "lounge",
      crowd: "30+",
      music: "dj",
      vibe: "dancing",
      address: "335 Newark Ave, Jersey City, NJ 07302",
      hours: "Evening to late night",
      happyHour: "Often available",
      events: "Weekend nightlife",
      notes: "Good for nightlife, not a college-only feel"
    },
    {
      name: "Hudson & Co",
      town: "Jersey City",
      zip: "07302",
      county: "Hudson County",
      lat: 40.7174,
      lng: -74.0353,
      type: "restaurant bar",
      crowd: "30+",
      music: "dj",
      vibe: "waterfront",
      address: "3 2nd St, Jersey City, NJ 07302",
      hours: "Lunch, dinner, late drinks",
      happyHour: "Check current waterfront specials",
      events: "Strong date and group spot",
      notes: "Good if you want skyline / waterfront feel"
    },
    {
      name: "McGovern's Tavern",
      town: "Newark",
      zip: "07102",
      county: "Essex County",
      lat: 40.7369,
      lng: -74.1706,
      type: "tavern",
      crowd: "30+",
      music: "live music",
      vibe: "cheap drinks",
      address: "58 New St, Newark, NJ 07102",
      hours: "Lunch through late night",
      happyHour: "Classic tavern pricing",
      events: "Neighborhood and live-music energy",
      notes: "Not a college bar"
    },
    {
      name: "Adega Grill",
      town: "Newark",
      zip: "07105",
      county: "Essex County",
      lat: 40.7282,
      lng: -74.1528,
      type: "restaurant bar",
      crowd: "30+",
      music: "latin",
      vibe: "dancing",
      address: "130 Ferry St, Newark, NJ 07105",
      hours: "Dinner through nightlife",
      happyHour: "Check specials",
      events: "Portuguese / social nightlife crossover",
      notes: "Can fit the restaurant-with-dancing lane"
    },
    {
      name: "Ventanas",
      town: "Fort Lee",
      zip: "07024",
      county: "Bergen County",
      lat: 40.8516,
      lng: -73.9735,
      type: "club",
      crowd: "30+",
      music: "dj",
      vibe: "rooftop",
      address: "200 Park Ave, Fort Lee, NJ 07024",
      hours: "Dinner and nightlife",
      happyHour: "Check current cocktail hour",
      events: "Upscale nightlife nights",
      notes: "Pretty crowd, high-end vibe"
    },
    {
      name: "Wellmont Theater",
      town: "Montclair",
      zip: "07042",
      county: "Essex County",
      lat: 40.8134,
      lng: -74.2157,
      type: "music venue",
      crowd: "30+",
      music: "live music",
      vibe: "dancing",
      address: "5 Seymour St, Montclair, NJ 07042",
      hours: "Depends on show night",
      happyHour: "No standard happy hour",
      events: "Concert hall / live events",
      notes: "Strong Montclair concert destination"
    },
    {
      name: "Bar Franco",
      town: "Montclair",
      zip: "07042",
      county: "Essex County",
      lat: 40.8177,
      lng: -74.2102,
      type: "lounge",
      crowd: "30+",
      music: "dj",
      vibe: "dancing",
      address: "5 Church St, Montclair, NJ 07042",
      hours: "Evening through late night",
      happyHour: "Check cocktail specials",
      events: "Stylish nightlife / date-night crossover",
      notes: "Good grown-up Montclair lounge"
    },
    {
      name: "Stone Pony",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2208,
      lng: -73.9989,
      type: "music venue",
      crowd: "20s",
      music: "live music",
      vibe: "waterfront",
      address: "913 Ocean Ave, Asbury Park, NJ 07712",
      hours: "Depends on event schedule",
      happyHour: "Not standard",
      events: "Concerts and seasonal events",
      notes: "Needs event-night awareness"
    },
    {
      name: "Watermark",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2197,
      lng: -73.9982,
      type: "lounge",
      crowd: "30+",
      music: "dj",
      vibe: "waterfront",
      address: "800 Ocean Ave, Asbury Park, NJ 07712",
      hours: "Afternoon through late night",
      happyHour: "Check current specials",
      events: "Strong weekend / summer nightlife",
      notes: "Oceanfront nightlife favorite"
    },
    {
      name: "Asbury Lanes",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2246,
      lng: -74.0112,
      type: "bar arcade",
      crowd: "30+",
      music: "live music",
      vibe: "dancing",
      address: "209 4th Ave, Asbury Park, NJ 07712",
      hours: "Depends on event / bowling schedule",
      happyHour: "Check current deals",
      events: "Bowling, music, events",
      notes: "Cool bowling / event pick you mentioned"
    },
    {
      name: "Convention Hall",
      town: "Asbury Park",
      zip: "07712",
      county: "Monmouth County",
      lat: 40.2225,
      lng: -73.9987,
      type: "music venue",
      crowd: "30+",
      music: "live music",
      vibe: "waterfront",
      address: "1300 Ocean Ave, Asbury Park, NJ 07712",
      hours: "Depends on event schedule",
      happyHour: "No standard happy hour",
      events: "Festivals, conventions, shows",
      notes: "Beer, tattoo, and boardwalk event potential"
    },
    {
      name: "Jenkinson's",
      town: "Point Pleasant",
      zip: "08742",
      county: "Ocean County",
      lat: 40.0942,
      lng: -74.0362,
      type: "club",
      crowd: "20s",
      music: "dj",
      vibe: "waterfront",
      address: "300 Ocean Ave, Point Pleasant Beach, NJ 08742",
      hours: "Seasonal late-night",
      happyHour: "Seasonal specials",
      events: "Beach nightlife and boardwalk events",
      notes: "Strong younger beach crowd"
    },
    {
      name: "Martell's Tiki Bar",
      town: "Point Pleasant",
      zip: "08742",
      county: "Ocean County",
      lat: 40.0947,
      lng: -74.0358,
      type: "bar",
      crowd: "30+",
      music: "live music",
      vibe: "waterfront",
      address: "308 Boardwalk, Point Pleasant Beach, NJ 08742",
      hours: "Seasonal beach hours",
      happyHour: "Check current seasonal deals",
      events: "Bands and beach weekends",
      notes: "More beach bar than club"
    },
    {
      name: "HQ2 Nightclub",
      town: "Atlantic City",
      zip: "08401",
      county: "Atlantic County",
      lat: 39.3567,
      lng: -74.4283,
      type: "club",
      crowd: "20s",
      music: "dj",
      vibe: "rooftop",
      address: "Hard Rock area, Atlantic City, NJ 08401",
      hours: "Depends on event schedule",
      happyHour: "No standard",
      events: "Guest DJs and casino nightlife",
      notes: "Atlantic City big-night option"
    },
    {
      name: "Bally's Lobby Bar Area",
      town: "Atlantic City",
      zip: "08401",
      county: "Atlantic County",
      lat: 39.3578,
      lng: -74.4346,
      type: "restaurant bar",
      crowd: "30+",
      music: "dj",
      vibe: "dancing",
      address: "1900 Pacific Ave, Atlantic City, NJ 08401",
      hours: "Casino hours",
      happyHour: "Varies",
      events: "Casino nightlife traffic",
      notes: "Casino crowd crossover"
    }
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
      .replace(/\s+/g, " ")
      .trim();
  }

  function milesBetween(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 3958.8;
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

  function setActiveTab(mode) {
    const map = {
      solo: [els.tabSolo, els.soloPanel],
      middle: [els.tabMiddle, els.middlePanel],
      group: [els.tabGroup, els.groupPanel],
      ai: [els.tabAI, els.aiPanel]
    };

    [els.tabSolo, els.tabMiddle, els.tabGroup, els.tabAI].forEach((btn) => {
      btn.classList.remove("active-tab");
    });

    [els.soloPanel, els.middlePanel, els.groupPanel, els.aiPanel].forEach((panel) => {
      panel.classList.remove("active");
    });

    if (map[mode]) {
      map[mode][0].classList.add("active-tab");
      map[mode][1].classList.add("active");
    }
  }

  function renderStarterTowns() {
    els.starterTowns.innerHTML = starterTowns
      .map(
        (town) =>
          `<button type="button" class="starter-town-btn" data-town="${escapeHtml(town)}">${escapeHtml(town)}</button>`
      )
      .join("");

    els.starterTowns.querySelectorAll("[data-town]").forEach((btn) => {
      btn.addEventListener("click", () => {
        els.soloQuery.value = btn.getAttribute("data-town");
        setActiveTab("solo");
        soloSearch();
      });
    });
  }

  function guessTownFromQuery(query) {
    const q = normalize(query);

    for (const key of Object.keys(townCenters)) {
      if (q.includes(key)) {
        return {
          town: key
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          ...townCenters[key]
        };
      }
    }

    const zipMatch = q.match(/\b\d{5}\b/);
    if (zipMatch) {
      const zip = zipMatch[0];
      const found = Object.entries(townCenters).find(([, data]) => data.zip === zip);
      if (found) {
        const townName = found[0]
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return { town: townName, ...found[1] };
      }
    }

    throw new Error("Town or ZIP not found in NightScout yet. Try a major NJ town or ZIP.");
  }

  function matchesCrowd(venueCrowd, wantedCrowd) {
    if (wantedCrowd === "any") return true;
    return normalize(venueCrowd) === normalize(wantedCrowd);
  }

  function matchesMusic(venueMusic, wantedMusic) {
    if (wantedMusic === "any") return true;
    return normalize(venueMusic) === normalize(wantedMusic);
  }

  function matchesVenueType(venueType, wantedType) {
    if (wantedType === "any") return true;
    return normalize(venueType) === normalize(wantedType);
  }

  function matchesVibe(venueVibe, wantedVibe) {
    if (wantedVibe === "any") return true;
    return normalize(venueVibe) === normalize(wantedVibe);
  }

  function renderVenueCard(v, distanceLabel = "") {
    const directionsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`;
    const photosLink = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(v.name + " " + v.town)}`;
    const searchLink = `https://www.google.com/search?q=${encodeURIComponent(v.name + " " + v.town + " NJ nightlife")}`;

    return `
      <div class="card">
        <h3>${escapeHtml(v.name)}</h3>
        <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(v.type)}</p>
        <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(v.town)}</p>
        <p style="margin:4px 0;"><b>Address:</b> ${escapeHtml(v.address)}</p>
        ${distanceLabel ? `<p style="margin:4px 0;"><b>${distanceLabel}</b></p>` : ""}
        <p style="margin:4px 0;"><b>Crowd:</b> ${escapeHtml(v.crowd)}</p>
        <p style="margin:4px 0;"><b>Music:</b> ${escapeHtml(v.music)}</p>
        <p style="margin:4px 0;"><b>Vibe:</b> ${escapeHtml(v.vibe)}</p>
        <p style="margin:4px 0;"><b>Hours:</b> ${escapeHtml(v.hours)}</p>
        <p style="margin:4px 0;"><b>Happy hour:</b> ${escapeHtml(v.happyHour)}</p>
        <p style="margin:4px 0;"><b>Specials / events:</b> ${escapeHtml(v.events)}</p>
        <p style="margin:4px 0;"><b>Notes:</b> ${escapeHtml(v.notes)}</p>

        <div class="result-links">
          <a href="${directionsLink}" target="_blank" rel="noopener noreferrer">Directions</a>
          <a href="${photosLink}" target="_blank" rel="noopener noreferrer">Photos</a>
          <a href="${searchLink}" target="_blank" rel="noopener noreferrer">Search</a>
        </div>
      </div>
    `;
  }

  function renderError(message) {
    els.results.innerHTML = `
      <div class="card error-card">
        <p style="margin:0;"><b>Error:</b> ${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderSoloResults(center, townInfo, filtered, filters) {
    const sorted = filtered
      .map((v) => ({
        ...v,
        distance: milesBetween(center.lat, center.lng, v.lat, v.lng)
      }))
      .sort((a, b) => a.distance - b.distance);

    if (!sorted.length) {
      els.results.innerHTML = `
        <h2>Solo Search Results</h2>
        <p class="muted">Showing in-page results for <b>${escapeHtml(townInfo.town)}</b> ${escapeHtml(townInfo.zip)}.</p>
        <div class="card">
          <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(townInfo.town)}</p>
          <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(townInfo.zip)}</p>
          <p style="margin:4px 0;"><b>County:</b> ${escapeHtml(townInfo.county)}</p>
          <p style="margin:4px 0;"><b>Filters:</b> Crowd: ${escapeHtml(filters.crowd)} | Music: ${escapeHtml(filters.music)} | Venue: ${escapeHtml(filters.venue)} | Vibe: ${escapeHtml(filters.vibe)}</p>
        </div>
        <div class="card">
          No venues matched your current solo filters in ${escapeHtml(townInfo.town)}.
        </div>
      `;
      return;
    }

    els.results.innerHTML = `
      <h2>Solo Search Results</h2>
      <p class="muted">Showing in-page results for <b>${escapeHtml(townInfo.town)}</b> ${escapeHtml(townInfo.zip)}.</p>

      <div class="card">
        <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(townInfo.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(townInfo.zip)}</p>
        <p style="margin:4px 0;"><b>County:</b> ${escapeHtml(townInfo.county)}</p>
        <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(townInfo.town)}, New Jersey</p>
        <p style="margin:4px 0;"><b>Filters:</b> Crowd: ${escapeHtml(filters.crowd)} | Music: ${escapeHtml(filters.music)} | Venue: ${escapeHtml(filters.venue)} | Vibe: ${escapeHtml(filters.vibe)}</p>
      </div>

      ${sorted
        .map((v) => renderVenueCard(v, `Approx distance from town center: ${v.distance.toFixed(1)} miles`))
        .join("")}
    `;
  }

  function renderMiddleResults(mid, nearestTown, geoA, geoB, list) {
    const sorted = list
      .map((v) => ({
        ...v,
        distance: milesBetween(mid.lat, mid.lng, v.lat, v.lng)
      }))
      .sort((a, b) => a.distance - b.distance);

    els.results.innerHTML = `
      <h2>Meet in the Middle Results</h2>
      <p class="muted">Closest nightlife options to the calculated midpoint</p>

      <div class="card">
        <p style="margin:4px 0;"><b>Location A:</b> ${escapeHtml(geoA.town)} ${escapeHtml(geoA.zip)}</p>
        <p style="margin:4px 0;"><b>Location B:</b> ${escapeHtml(geoB.town)} ${escapeHtml(geoB.zip)}</p>
        <p style="margin:4px 0;"><b>Midpoint Town:</b> ${escapeHtml(nearestTown.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(nearestTown.zip)}</p>
        <p style="margin:4px 0;"><b>County:</b> ${escapeHtml(nearestTown.county)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open midpoint in Google Maps</a>
        </div>
      </div>

      ${sorted
        .slice(0, 12)
        .map((v) => renderVenueCard(v, `Approx distance from midpoint: ${v.distance.toFixed(1)} miles`))
        .join("")}
    `;
  }

  function renderGroupResults(mid, nearestTown, points, list) {
    const sorted = list
      .map((v) => ({
        ...v,
        distance: milesBetween(mid.lat, mid.lng, v.lat, v.lng)
      }))
      .sort((a, b) => a.distance - b.distance);

    els.results.innerHTML = `
      <h2>Group Center Results</h2>
      <p class="muted">Closest nightlife options to the calculated group midpoint</p>

      <div class="card">
        ${points
          .map((p, i) => `<p style="margin:4px 0;"><b>Point ${i + 1}:</b> ${escapeHtml(p.town)} ${escapeHtml(p.zip)}</p>`)
          .join("")}
        <p style="margin:4px 0;"><b>Midpoint Town:</b> ${escapeHtml(nearestTown.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(nearestTown.zip)}</p>
        <p style="margin:4px 0;"><b>County:</b> ${escapeHtml(nearestTown.county)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open group midpoint in Google Maps</a>
        </div>
      </div>

      ${sorted
        .slice(0, 12)
        .map((v) => renderVenueCard(v, `Approx distance from group midpoint: ${v.distance.toFixed(1)} miles`))
        .join("")}
    `;
  }

  function renderAiResults(prompt, filtered) {
    els.results.innerHTML = `
      <h2>Night Plan</h2>
      <div class="card">
        <p style="margin:0;"><b>Prompt:</b> ${escapeHtml(prompt)}</p>
        <p style="margin-top:10px;">These are the strongest NightScout matches for that prompt.</p>
      </div>

      ${
        filtered.length
          ? filtered.map((v) => renderVenueCard(v)).join("")
          : `<div class="card">No strong direct matches yet. Try a town with your prompt, like "Asbury Park beach bar with DJ" or "Fort Lee rooftop lounge".</div>`
      }
    `;
  }

  function findNearestTown(lat, lng) {
    return Object.entries(townCenters)
      .map(([key, value]) => ({
        town: key
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        ...value,
        distance: milesBetween(lat, lng, value.lat, value.lng)
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function soloSearch() {
    try {
      const q = (els.soloQuery.value || "").trim();
      if (!q) {
        alert("Enter a town, ZIP, or address.");
        return;
      }

      const filters = {
        crowd: els.soloCrowd.value || "any",
        music: els.soloMusic.value || "any",
        venue: els.soloVenue.value || "any",
        vibe: els.soloVibe.value || "any"
      };

      const townInfo = guessTownFromQuery(q);
      const center = { lat: townInfo.lat, lng: townInfo.lng };

      const filtered = venues.filter((v) => {
        if (milesBetween(center.lat, center.lng, v.lat, v.lng) > 18) return false;
        if (!matchesCrowd(v.crowd, filters.crowd)) return false;
        if (!matchesMusic(v.music, filters.music)) return false;
        if (!matchesVenueType(v.type, filters.venue)) return false;
        if (!matchesVibe(v.vibe, filters.vibe)) return false;
        return true;
      });

      lastResults = filtered;
      lastSearchMeta = { mode: "solo", townInfo, center, filters };
      renderSoloResults(center, townInfo, filtered, filters);
    } catch (err) {
      renderError(err.message || "Could not run solo search.");
    }
  }

  function meetInMiddle() {
    try {
      const a = (els.locA.value || "").trim();
      const b = (els.locB.value || "").trim();

      if (!a || !b) {
        alert("Enter both locations.");
        return;
      }

      const geoA = guessTownFromQuery(a);
      const geoB = guessTownFromQuery(b);
      const mid = midpoint(geoA, geoB);
      const nearestTown = findNearestTown(mid.lat, mid.lng);

      const list = venues.filter((v) => {
        return milesBetween(mid.lat, mid.lng, v.lat, v.lng) <= 18;
      });

      lastResults = list;
      lastSearchMeta = { mode: "middle", mid, nearestTown, geoA, geoB };
      renderMiddleResults(mid, nearestTown, geoA, geoB, list);
    } catch (err) {
      renderError(err.message || "Could not calculate midpoint.");
    }
  }

  function groupCenter() {
    try {
      const raw = els.groupList.value || "";
      const lines = raw
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert("Enter at least 2 group locations.");
        return;
      }

      const points = lines.map((line) => guessTownFromQuery(line));
      const mid = centroid(points);
      const nearestTown = findNearestTown(mid.lat, mid.lng);

      const list = venues.filter((v) => {
        return milesBetween(mid.lat, mid.lng, v.lat, v.lng) <= 20;
      });

      lastResults = list;
      lastSearchMeta = { mode: "group", mid, nearestTown, points };
      renderGroupResults(mid, nearestTown, points, list);
    } catch (err) {
      renderError(err.message || "Could not calculate group center.");
    }
  }

  function generateNightPlan() {
    const prompt = (els.aiPrompt.value || "").trim();
    if (!prompt) {
      alert("Enter a night plan prompt.");
      return;
    }

    const p = normalize(prompt);

    const filtered = venues.filter((v) => {
      const blob = normalize(`${v.name} ${v.town} ${v.type} ${v.music} ${v.vibe} ${v.notes} ${v.events}`);

      let score = 0;
      if (p.includes("rooftop") && blob.includes("rooftop")) score += 3;
      if (p.includes("beach") && (blob.includes("waterfront") || blob.includes("beach"))) score += 3;
      if (p.includes("dj") && blob.includes("dj")) score += 3;
      if (p.includes("lounge") && blob.includes("lounge")) score += 2;
      if (p.includes("bar") && blob.includes("bar")) score += 2;
      if (p.includes("club") && blob.includes("club")) score += 2;
      if (p.includes("live music") && blob.includes("live music")) score += 3;
      if (p.includes("concert") && blob.includes("music venue")) score += 3;
      if (p.includes("st patrick") || p.includes("saint patrick")) {
        if (blob.includes("tavern") || blob.includes("pub") || blob.includes("bar")) score += 2;
      }
      if (p.includes("cinco")) {
        if (blob.includes("latin")) score += 2;
      }

      v._score = score;
      return score > 0;
    }).sort((a, b) => b._score - a._score).slice(0, 10);

    renderAiResults(prompt, filtered);
  }

  function loadNJVenues() {
    els.results.innerHTML = `
      <h2>NightScout Starter Guide</h2>
      <div class="card">
        <p><b>Use Solo</b> for one town or ZIP.</p>
        <p><b>Use Middle</b> for two people trying to meet up.</p>
        <p><b>Use Group</b> for multiple people.</p>
        <p><b>Use AI</b> for quick nightlife prompts like rooftop lounge, beach bar with DJ, live music, or waterfront restaurant bar.</p>
      </div>

      <div class="card">
        <p><b>Starter towns:</b> Hoboken, Weehawken, Jersey City, Newark, Fort Lee, Montclair, Asbury Park, Point Pleasant, Atlantic City.</p>
      </div>
    `;
  }

  els.tabSolo.addEventListener("click", () => setActiveTab("solo"));
  els.tabMiddle.addEventListener("click", () => setActiveTab("middle"));
  els.tabGroup.addEventListener("click", () => setActiveTab("group"));
  els.tabAI.addEventListener("click", () => setActiveTab("ai"));

  els.searchBtn.addEventListener("click", soloSearch);
  els.loadNJ.addEventListener("click", loadNJVenues);
  els.middleBtn.addEventListener("click", meetInMiddle);
  els.groupBtn.addEventListener("click", groupCenter);
  els.aiBtn.addEventListener("click", generateNightPlan);

  renderStarterTowns();
  loadNJVenues();
});
