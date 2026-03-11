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

  let lastCenter = null;
  let lastMode = "nightlife";
  let lastMiddleA = null;
  let lastMiddleB = null;
  let lastGroupPoints = null;

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

  function extractZip(text) {
    const match = String(text || "").match(/\b\d{5}\b/);
    return match ? match[0] : "";
  }

  function titleCase(str) {
    return String(str || "")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
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

  async function geocodeAddress(address) {
    const query = `${address}, New Jersey, USA`;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error("Could not geocode address");
    }

    const data = await res.json();

    if (!data.length) {
      throw new Error(`Address not found: ${address}`);
    }

    const zipHint = extractZip(address);
    const addressNorm = normalize(address);

    const scored = data
      .map((item) => {
        const addr = item.address || {};
        const display = item.display_name || "";
        const blob = normalize(
          [
            display,
            addr.house_number,
            addr.road,
            addr.city,
            addr.town,
            addr.village,
            addr.municipality,
            addr.suburb,
            addr.county,
            addr.state,
            addr.postcode
          ]
            .filter(Boolean)
            .join(" ")
        );

        let score = 0;

        if (blob.includes("new jersey")) score += 100;
        if (String(addr.state || "").toLowerCase() === "new jersey") score += 150;

        if (zipHint && String(addr.postcode || "") === zipHint) score += 250;

        const chunks = addressNorm.split(" ").filter(Boolean);
        for (const c of chunks) {
          if (blob.includes(c)) score += 12;
        }

        if (
          blob.includes("road") ||
          blob.includes("drive") ||
          blob.includes("avenue") ||
          blob.includes("street")
        ) {
          score -= 5;
        }

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0].item;

    return {
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lon),
      display: best.display_name,
      raw: best
    };
  }

  async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error("Could not reverse geocode midpoint");
    }

    const data = await res.json();
    const addr = data.address || {};

    const town =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.county ||
      "Unknown area";

    return {
      town,
      zip: addr.postcode || "",
      county: addr.county || "",
      state: addr.state || "",
      address: data.display_name || ""
    };
  }

  function classifyVenue(tags = {}) {
    const amenity = (tags.amenity || "").toLowerCase();
    const leisure = (tags.leisure || "").toLowerCase();
    const tourism = (tags.tourism || "").toLowerCase();
    const name = (tags.name || "").toLowerCase();
    const cuisine = (tags.cuisine || "").toLowerCase();
    const text = `${amenity} ${leisure} ${tourism} ${name} ${cuisine}`;

    if (amenity === "nightclub") return "Club";
    if (amenity === "pub") return "Pub";
    if (amenity === "bar") return "Bar";
    if (amenity === "biergarten") return "Beer Garden";
    if (amenity === "casino") return "Casino";
    if (text.includes("tavern")) return "Tavern";
    if (text.includes("lounge")) return "Lounge";
    if (text.includes("dive")) return "Dive Bar";
    if (leisure === "bowling_alley") return "Bowling / Arcade";
    if (text.includes("billiard") || text.includes("pool hall") || text.includes("poolroom")) return "Pool Hall";
    if (text.includes("axe") || text.includes("ax throwing")) return "Axe Throwing";
    if (text.includes("arcade")) return "Bar Arcade";
    if (text.includes("music") || text.includes("concert") || text.includes("live")) return "Music Venue";
    if (amenity === "restaurant" && (text.includes("bar") || text.includes("lounge"))) return "Restaurant Bar";
    if (amenity === "restaurant") return "Restaurant";
    if (amenity === "cafe") return "Cafe";
    if (amenity === "fast_food") return "Fast Food";
    if (tourism === "hotel") return "Hotel Bar / Venue";
    return "Venue";
  }

  function restaurantCuisineLabel(tags = {}) {
    const cuisine = (tags.cuisine || "").toLowerCase();

    if (!cuisine) return "Restaurant";
    if (cuisine.includes("italian")) return "Italian";
    if (cuisine.includes("sushi") || cuisine.includes("japanese")) return "Sushi / Japanese";
    if (cuisine.includes("portuguese")) return "Portuguese";
    if (cuisine.includes("brazilian")) return "Brazilian";
    if (cuisine.includes("spanish")) return "Spanish";
    if (cuisine.includes("steak")) return "Steakhouse";
    if (cuisine.includes("mexican")) return "Mexican";
    if (cuisine.includes("chinese")) return "Chinese";
    if (cuisine.includes("thai")) return "Thai";
    if (cuisine.includes("indian")) return "Indian";
    if (cuisine.includes("pizza")) return "Pizza";
    return titleCase(cuisine.split(";")[0].split(",")[0]);
  }

  function matchesMode(tags = {}, mode = "nightlife") {
    const amenity = (tags.amenity || "").toLowerCase();
    const leisure = (tags.leisure || "").toLowerCase();
    const tourism = (tags.tourism || "").toLowerCase();
    const name = (tags.name || "").toLowerCase();
    const cuisine = (tags.cuisine || "").toLowerCase();
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
      leisure === "bowling_alley" ||
      text.includes("arcade") ||
      text.includes("axe") ||
      text.includes("music") ||
      text.includes("concert") ||
      text.includes("billiard") ||
      text.includes("pool hall") ||
      text.includes("dance") ||
      text.includes("dj");

    const restaurantMatch =
      amenity === "restaurant" ||
      amenity === "cafe" ||
      amenity === "fast_food";

    const restaurantWithNightlife =
      amenity === "restaurant" &&
      (text.includes("bar") ||
        text.includes("lounge") ||
        text.includes("dance") ||
        text.includes("dj") ||
        text.includes("music") ||
        text.includes("night"));

    if (mode === "nightlife") return nightlifeMatch || restaurantWithNightlife;
    if (mode === "restaurants") return restaurantMatch;
    if (mode === "everything") return nightlifeMatch || restaurantMatch || restaurantWithNightlife;
    return true;
  }

  function matchesSoloFilters(place, filters) {
    const typeText = normalize(`${place.type} ${place.name} ${place.amenity} ${place.cuisine}`);
    const addrText = normalize(place.address);
    const combined = `${typeText} ${addrText}`;

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
        "restaurant bar": ["restaurant bar", "lounge", "bar"],
        restaurant: ["restaurant", "cafe", "fast food"]
      };

      const targets = venueMap[filters.venue] || [filters.venue];
      const ok = targets.some((t) => combined.includes(normalize(t)));
      if (!ok) return false;
    }

    if (filters.music !== "any") {
      const musicTargets = {
        "live music": ["live", "music", "concert"],
        dj: ["dj", "dance", "nightclub", "club"],
        "hip hop": ["hip hop"],
        house: ["house"],
        rock: ["rock"],
        latin: ["latin"],
        "top 40": ["top 40"]
      };

      const targets = musicTargets[filters.music] || [filters.music];
      const ok = targets.some((t) => combined.includes(normalize(t)));
      if (!ok) return false;
    }

    if (filters.vibe !== "any") {
      const vibeTargets = {
        waterfront: ["waterfront", "river", "harbor", "pier"],
        rooftop: ["rooftop", "roof"],
        sports: ["sports", "stadium"],
        dancing: ["dance", "dancing", "dj", "nightclub", "club"],
        "cheap drinks": ["pub", "dive", "tavern", "bar"]
      };

      const targets = vibeTargets[filters.vibe] || [filters.vibe];
      const ok = targets.some((t) => combined.includes(normalize(t)));
      if (!ok) return false;
    }

    return true;
  }

  async function searchNearbyPlaces(lat, lng, mode = "nightlife", radiusMeters = 3000) {
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

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: overpassQuery
    });

    if (!res.ok) {
      throw new Error("Could not load nearby venues");
    }

    const data = await res.json();
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
          amenity: tags.amenity || "",
          cuisine: tags.cuisine || "",
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

  function modeButtonsHtml(active) {
    const mk = (mode, label) => {
      const isActive = active === mode;
      return `
        <button
          type="button"
          data-mode="${mode}"
          style="
            padding:8px 14px;
            margin-right:8px;
            margin-bottom:8px;
            border-radius:12px;
            border:1px solid #ccc;
            cursor:pointer;
            background:${isActive ? "#111" : "#f3f3f3"};
            color:${isActive ? "#fff" : "#111"};
            font-weight:700;
          "
        >${label}</button>
      `;
    };

    return `
      <div style="margin:12px 0 6px;">
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
          <p style="margin:0;">
            No ${escapeHtml(mode)} results came back in ${escapeHtml(midpointInfo.town)}.
          </p>
        </div>
      `;
    }

    return sorted
      .map((p) => {
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${p.name} ${p.address || midpointInfo.town}`
        )}`;

        const searchLink = `https://www.google.com/search?q=${encodeURIComponent(
          `${p.name} ${midpointInfo.town} NJ`
        )}`;

        return `
          <div class="card">
            <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
            <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
            <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(midpointInfo.town)}${midpointInfo.zip ? ` ${escapeHtml(midpointInfo.zip)}` : ""}</p>
            <p style="margin:4px 0;"><b>Approx distance from center:</b> ${p.distance.toFixed(1)} miles</p>
            ${p.address ? `<p style="margin:4px 0;">${escapeHtml(p.address)}</p>` : ""}
            <div class="result-links">
              <a href="${mapLink}" target="_blank" rel="noopener noreferrer">Maps</a>
              <a href="${searchLink}" target="_blank" rel="noopener noreferrer">Search</a>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderMiddleResults(mid, midpointInfo, places, geoA, geoB, mode) {
    if (!els.results) return;

    const modeLabel =
      mode === "nightlife" ? "nightlife" :
      mode === "restaurants" ? "restaurants" :
      "all venues";

    els.results.innerHTML = `
      <h2>Meet in the Middle Results</h2>
      <p class="muted" style="margin-top:0;">Closest ${escapeHtml(modeLabel)} options to the calculated midpoint</p>

      <div class="card">
        <p style="margin:4px 0;"><b>Location A:</b> ${escapeHtml(geoA.display)}</p>
        <p style="margin:4px 0;"><b>Location B:</b> ${escapeHtml(geoB.display)}</p>
        <p style="margin:10px 0 4px;"><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
        ${midpointInfo.county ? `<p style="margin:4px 0;"><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
        <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open midpoint in Google Maps</a>
          <a href="https://www.google.com/search?q=${encodeURIComponent(`${midpointInfo.town} NJ bars restaurants clubs lounges`) }" target="_blank" rel="noopener noreferrer">Search this town</a>
        </div>
        ${modeButtonsHtml(mode)}
      </div>

      ${placeCardsHtml(mid, midpointInfo, places, mode)}
    `;

    wireModeButtons();
  }

  function renderGroupResults(mid, midpointInfo, places, groupGeos, mode, outlierNote = "") {
    if (!els.results) return;

    const modeLabel =
      mode === "nightlife" ? "nightlife" :
      mode === "restaurants" ? "restaurants" :
      "all venues";

    const groupLines = groupGeos
      .map((g, i) => `<p style="margin:4px 0;"><b>Point ${i + 1}:</b> ${escapeHtml(g.display)}</p>`)
      .join("");

    els.results.innerHTML = `
      <h2>Group Center Results</h2>
      <p class="muted" style="margin-top:0;">Closest ${escapeHtml(modeLabel)} options to the calculated group midpoint</p>

      <div class="card">
        ${groupLines}
        <p style="margin:10px 0 4px;"><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
        ${midpointInfo.county ? `<p style="margin:4px 0;"><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
        <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
        ${
          outlierNote
            ? `<div class="card" style="border:1px solid #f0d08a;background:#fff9e8;margin-top:12px;"><p style="margin:0;"><b>Possible bad match:</b> ${escapeHtml(outlierNote)}</p></div>`
            : ""
        }
        <div class="result-links">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open group midpoint in Google Maps</a>
          <a href="https://www.google.com/search?q=${encodeURIComponent(`${midpointInfo.town} NJ bars restaurants clubs lounges`) }" target="_blank" rel="noopener noreferrer">Search this town</a>
        </div>
        ${modeButtonsHtml(mode)}
      </div>

      ${placeCardsHtml(mid, midpointInfo, places, mode)}
    `;

    wireModeButtons();
  }

  function renderSoloResults(center, areaInfo, places, filters) {
    if (!els.results) return;

    const filtered = places.filter((p) => matchesSoloFilters(p, filters));

    const intro = `
      <h2>Solo Search Results</h2>
      <p class="muted" style="margin-top:0;">
        Showing in-page results for <b>${escapeHtml(areaInfo.town)}</b>${areaInfo.zip ? ` ${escapeHtml(areaInfo.zip)}` : ""}.
      </p>

      <div class="card">
        <p style="margin:4px 0;"><b>Town:</b> ${escapeHtml(areaInfo.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(areaInfo.zip || "Not available")}</p>
        ${areaInfo.county ? `<p style="margin:4px 0;"><b>County:</b> ${escapeHtml(areaInfo.county)}</p>` : ""}
        <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(areaInfo.address)}</p>
        <p style="margin:10px 0 0;"><b>Filters:</b>
          Crowd: ${escapeHtml(filters.crowd)} |
          Music: ${escapeHtml(filters.music)} |
          Venue: ${escapeHtml(filters.venue)} |
          Vibe: ${escapeHtml(filters.vibe)}
        </p>
      </div>
    `;

    if (!filtered.length) {
      els.results.innerHTML = `
        ${intro}
        <div class="card">
          <p style="margin:0;">No venues matched your current solo filters in ${escapeHtml(areaInfo.town)}.</p>
        </div>
      `;
      return;
    }

    const sorted = filtered
      .map((p) => ({
        ...p,
        distance: milesBetween(center.lat, center.lng, p.lat, p.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    els.results.innerHTML = `
      ${intro}
      ${sorted
        .map((p) => {
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${p.name} ${p.address || areaInfo.town}`
          )}`;
          const searchLink = `https://www.google.com/search?q=${encodeURIComponent(
            `${p.name} ${areaInfo.town} NJ`
          )}`;
          return `
            <div class="card">
              <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
              <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
              <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(areaInfo.town)}${areaInfo.zip ? ` ${escapeHtml(areaInfo.zip)}` : ""}</p>
              <p style="margin:4px 0;"><b>Approx distance from town center:</b> ${p.distance.toFixed(1)} miles</p>
              ${p.address ? `<p style="margin:4px 0;">${escapeHtml(p.address)}</p>` : ""}
              <div class="result-links">
                <a href="${mapLink}" target="_blank" rel="noopener noreferrer">Maps</a>
                <a href="${searchLink}" target="_blank" rel="noopener noreferrer">Search</a>
              </div>
            </div>
          `;
        })
        .join("")}
    `;
  }

  function detectOutliers(points) {
    if (points.length < 3) return { kept: points, removed: [], note: "" };

    const fullCenter = centroid(points);

    const withDistances = points.map((p) => ({
      ...p,
      centerDistance: milesBetween(p.lat, p.lng, fullCenter.lat, fullCenter.lng)
    }));

    const distances = withDistances.map((p) => p.centerDistance).sort((a, b) => a - b);
    const median = distances[Math.floor(distances.length / 2)] || 0;

    const removed = withDistances.filter((p) => p.centerDistance > Math.max(25, median * 2.2));
    const kept = withDistances.filter((p) => !removed.includes(p));

    if (!removed.length || kept.length < 2) {
      return { kept: withDistances, removed: [], note: "" };
    }

    const note = removed
      .map((r) => `${r.input} resolved as ${r.display}`)
      .join(" | ");

    return { kept, removed, note };
  }

  function wireModeButtons() {
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.getAttribute("data-mode");
        lastMode = mode;

        if (!lastCenter) return;

        try {
          if (els.results) {
            els.results.innerHTML = `<p>Loading ${mode} near ${escapeHtml(lastCenter.midpointInfo.town)}...</p>`;
          }

          const places = await searchNearbyPlaces(lastCenter.mid.lat, lastCenter.mid.lng, mode);

          if (lastCenter.kind === "middle") {
            renderMiddleResults(lastCenter.mid, lastCenter.midpointInfo, places, lastMiddleA, lastMiddleB, mode);
          } else if (lastCenter.kind === "group") {
            renderGroupResults(lastCenter.mid, lastCenter.midpointInfo, places, lastGroupPoints, mode, lastCenter.outlierNote);
          }
        } catch (err) {
          if (els.results) {
            els.results.innerHTML = `
              <div class="card" style="border:1px solid #f0b4b4;background:#fff3f3;">
                <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Could not switch mode")}</p>
              </div>
            `;
          }
        }
      });
    });
  }

  async function soloSearch() {
    const q = els.soloQuery?.value?.trim();
    if (!q) {
      alert("Enter a town, ZIP, or address.");
      return;
    }

    const filters = {
      crowd: els.soloCrowd?.value || "any",
      music: els.soloMusic?.value || "any",
      venue: els.soloVenue?.value || "any",
      vibe: els.soloVibe?.value || "any"
    };

    const originalText = els.searchBtn ? els.searchBtn.textContent : "";
    if (els.searchBtn) {
      els.searchBtn.disabled = true;
      els.searchBtn.textContent = "Searching...";
    }

    if (els.results) {
      els.results.innerHTML = `<p>Searching ${escapeHtml(q)} and keeping the results on this page...</p>`;
    }

    try {
      const center = await geocodeAddress(q);
      const areaInfo = await reverseGeocode(center.lat, center.lng);

      const mode = filters.venue === "restaurant" ? "restaurants" : "everything";
      const places = await searchNearbyPlaces(center.lat, center.lng, mode, 3500);

      renderSoloResults(center, areaInfo, places, filters);
    } catch (err) {
      console.error(err);
      if (els.results) {
        els.results.innerHTML = `
          <div class="card" style="border:1px solid #f0b4b4;background:#fff3f3;">
            <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Could not run solo search")}</p>
          </div>
        `;
      } else {
        alert(err.message || "Could not run solo search");
      }
    } finally {
      if (els.searchBtn) {
        els.searchBtn.disabled = false;
        els.searchBtn.textContent = originalText || "Search";
      }
    }
  }

  async function meetInMiddle() {
    const a = els.locA?.value?.trim();
    const b = els.locB?.value?.trim();

    if (!a || !b) {
      alert("Enter both addresses");
      return;
    }

    const originalText = els.middleBtn ? els.middleBtn.textContent : "";
    if (els.middleBtn) {
      els.middleBtn.disabled = true;
      els.middleBtn.textContent = "Calculating...";
    }

    if (els.results) {
      els.results.innerHTML = `<p>Calculating midpoint and nightlife options...</p>`;
    }

    try {
      const geoA = await geocodeAddress(a);
      const geoB = await geocodeAddress(b);
      geoA.input = a;
      geoB.input = b;

      const mid = midpoint(geoA, geoB);
      const midpointInfo = await reverseGeocode(mid.lat, mid.lng);
      const places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");

      lastMiddleA = geoA;
      lastMiddleB = geoB;
      lastGroupPoints = null;
      lastCenter = { kind: "middle", mid, midpointInfo };
      lastMode = "nightlife";

      renderMiddleResults(mid, midpointInfo, places, geoA, geoB, "nightlife");
    } catch (err) {
      console.error(err);
      if (els.results) {
        els.results.innerHTML = `
          <div class="card" style="border:1px solid #f0b4b4;background:#fff3f3;">
            <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Something went wrong")}</p>
          </div>
        `;
      }
    } finally {
      if (els.middleBtn) {
        els.middleBtn.disabled = false;
        els.middleBtn.textContent = originalText || "Meet in the Middle";
      }
    }
  }

  async function groupCenter() {
    const raw = els.groupList?.value || "";

    const lines = raw
      .split(/\n+/)
      .map((x) =>
        x
          .trim()
          .replace(/\s+/g, " ")
          .replace(/,+/g, ",")
          .replace(/Dr\./gi, "Dr, ")
          .replace(/St\./gi, "St, ")
          .replace(/Ave\./gi, "Ave, ")
          .replace(/\bSaddlebrook\b/gi, "Saddle Brook")
          .replace(/\bFairview,\s*New Jersey\s*07105\b/gi, "Fairview, NJ 07022")
      )
      .filter(Boolean);

    if (lines.length < 2) {
      alert("Enter at least 2 towns, cities, ZIP codes, or addresses in the group box.");
      return;
    }

    const originalText = els.groupBtn ? els.groupBtn.textContent : "";
    if (els.groupBtn) {
      els.groupBtn.disabled = true;
      els.groupBtn.textContent = "Calculating...";
    }

    if (els.results) {
      els.results.innerHTML = `<p>Calculating group midpoint and nightlife options...</p>`;
    }

    try {
      const groupGeos = [];

      for (const line of lines) {
        const geo = await geocodeAddress(line);
        geo.input = line;
        groupGeos.push(geo);
      }

      const outlierCheck = detectOutliers(groupGeos);
      const cleanedPoints = outlierCheck.kept;

      const mid = centroid(cleanedPoints);
      const midpointInfo = await reverseGeocode(mid.lat, mid.lng);
      const places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");

      lastMiddleA = null;
      lastMiddleB = null;
      lastGroupPoints = cleanedPoints;
      lastCenter = {
        kind: "group",
        mid,
        midpointInfo,
        outlierNote: outlierCheck.note
      };
      lastMode = "nightlife";

      renderGroupResults(mid, midpointInfo, places, cleanedPoints, "nightlife", outlierCheck.note);
    } catch (err) {
      console.error(err);
      if (els.results) {
        els.results.innerHTML = `
          <div class="card" style="border:1px solid #f0b4b4;background:#fff3f3;">
            <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Could not calculate group midpoint")}</p>
            <p style="margin:10px 0 0;">
              Try full lines like:<br>
              112 Washington St, Hoboken, NJ 07030<br>
              367 Henry St, Fairview, NJ 07022<br>
              137 Fleming Ave, Newark, NJ 07105<br>
              142 Rehart Dr, Saddle Brook, NJ 07663
            </p>
          </div>
        `;
      }
    } finally {
      if (els.groupBtn) {
        els.groupBtn.disabled = false;
        els.groupBtn.textContent = originalText || "Group Center";
      }
    }
  }

  function loadNJVenues() {
    if (!els.results) return;

    els.results.innerHTML = `
      <h2>NightScout</h2>
      <p>Use <b>Solo Search</b> for one town, <b>Meet in the Middle</b> for two locations, or <b>Group Center</b> for multiple people.</p>
      <div class="card">
        <p style="margin:0;">
          <b>Tip:</b> In group mode, use exact town names with ZIP codes when possible,
          like <b>Saddle Brook NJ 07663</b> and <b>Fairview NJ 07022</b>.
        </p>
      </div>
    `;
  }

  function generateNightPlan() {
    const q = els.aiPrompt?.value?.trim();
    if (!els.results) return;

    els.results.innerHTML = `
      <h2>Night Plan</h2>
      <div class="card">
        <p style="margin:0;"><b>Prompt:</b> ${escapeHtml(q || "No prompt entered")}</p>
        <p style="margin-top:10px;">
          Use Solo Search, Meet in the Middle, or Group Center first, then refine your choice from the results.
        </p>
      </div>
    `;
  }

  els.searchBtn?.addEventListener("click", soloSearch);
  els.loadNJ?.addEventListener("click", loadNJVenues);
  els.middleBtn?.addEventListener("click", meetInMiddle);
  els.groupBtn?.addEventListener("click", groupCenter);
  els.aiBtn?.addEventListener("click", generateNightPlan);
});generateNightPlan);
});
