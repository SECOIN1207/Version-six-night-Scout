document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    soloQuery: $("soloQuery"),
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
  let lastA = null;
  let lastB = null;
  let lastGroup = null;
  let lastMode = "nightlife";

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

  function extractTownHint(text) {
    const cleaned = normalize(text)
      .replace(/\bnew jersey\b/g, "")
      .replace(/\bnj\b/g, "")
      .replace(/\busa\b/g, "")
      .replace(/\bunited states\b/g, "")
      .replace(/\b\d{5}\b/g, "")
      .trim();

    if (!cleaned) return "";

    const parts = cleaned.split(" ").filter(Boolean);
    if (!parts.length) return "";

    return cleaned;
  }

  function milesBetween(lat1, lon1, lat2, lon2) {
    const toRad = (d) => d * Math.PI / 180;
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
      lat: (a.lat + a.lat + b.lat - a.lat) / 2,
      lng: (a.lng + a.lng + b.lng - a.lng) / 2
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
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error("Could not geocode address");
    }

    const data = await res.json();

    if (!data.length) {
      throw new Error(`Address not found: ${address}`);
    }

    const zipHint = extractZip(address);
    const townHint = extractTownHint(address);

    const scored = data
      .map((item) => {
        const addr = item.address || {};
        const display = item.display_name || "";
        const blob = normalize(
          [
            display,
            addr.city,
            addr.town,
            addr.village,
            addr.municipality,
            addr.suburb,
            addr.county,
            addr.state,
            addr.postcode
          ].filter(Boolean).join(" ")
        );

        let score = 0;

        if (blob.includes("new jersey")) score += 50;
        if ((addr.state || "").toLowerCase() === "new jersey") score += 80;

        if (zipHint && String(addr.postcode || "") === zipHint) score += 200;

        if (townHint) {
          const words = townHint.split(" ").filter(Boolean);
          let townWordHits = 0;
          for (const w of words) {
            if (blob.includes(w)) townWordHits += 1;
          }
          score += townWordHits * 25;
        }

        if (blob.includes("road") || blob.includes("drive") || blob.includes("avenue") || blob.includes("street")) {
          score -= 8;
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
      headers: {
        "Accept": "application/json"
      }
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

    const zip = addr.postcode || "";
    const county = addr.county || "";
    const state = addr.state || "";

    return {
      town,
      zip,
      county,
      state,
      address: data.display_name || `${town}, ${state}`
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
    if (leisure === "bowling_alley") return "Bowling / Arcade";
    if (text.includes("billiard") || text.includes("pool hall") || text.includes("poolroom")) return "Pool Hall";
    if (text.includes("axe") || text.includes("ax throwing")) return "Axe Throwing";
    if (text.includes("arcade")) return "Bar Arcade";
    if (text.includes("music") || text.includes("concert") || text.includes("live")) return "Music Venue";
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

    return cuisine
      .split(";")[0]
      .split(",")[0]
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
      leisure === "bowling_alley" ||
      text.includes("arcade") ||
      text.includes("axe") ||
      text.includes("music") ||
      text.includes("concert") ||
      text.includes("billiard") ||
      text.includes("pool hall") ||
      text.includes("lounge") ||
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

  async function searchNearbyPlaces(lat, lng, mode = "nightlife") {
    const radiusMeters = 3000;

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
      const key = `${item.name.toLowerCase()}|${item.address.toLowerCase()}`;
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
            renderMiddleResults(lastCenter.mid, lastCenter.midpointInfo, places, lastA, lastB, mode);
          } else if (lastCenter.kind === "group") {
            renderGroupResults(lastCenter.mid, lastCenter.midpointInfo, places, lastGroup, mode, lastCenter.outlierNote);
          }
        } catch (err) {
          if (els.results) {
            els.results.innerHTML = `
              <div class="card" style="border:1px solid #f0b4b4;border-radius:16px;padding:14px;margin:14px 0;background:#fff3f3;">
                <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Could not switch result mode")}</p>
              </div>
            `;
          }
        }
      });
    });
  }

  function placeCardsHtml(mid, midpointInfo, places, mode) {
    const sorted = places
      .map((p) => ({
        ...p,
        distance: milesBetween(mid.lat, mid.lng, p.lat, p.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15);

    if (!sorted.length) {
      return `
        <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
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
          <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
            <h3 style="margin:0 0 8px;">${escapeHtml(p.name)}</h3>
            <p style="margin:4px 0;"><b>Type:</b> ${escapeHtml(p.type)}</p>
            <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(midpointInfo.town)}${midpointInfo.zip ? ` ${escapeHtml(midpointInfo.zip)}` : ""}</p>
            <p style="margin:4px 0;"><b>Approx distance from midpoint:</b> ${p.distance.toFixed(1)} miles</p>
            ${p.address ? `<p style="margin:4px 0;">${escapeHtml(p.address)}</p>` : ""}
            <div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;">
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
      <p style="color:#666;margin-top:0;">Closest ${escapeHtml(modeLabel)} options to the calculated midpoint</p>

      <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
        <p style="margin:4px 0;"><b>Location A:</b> ${escapeHtml(geoA.display)}</p>
        <p style="margin:4px 0;"><b>Location B:</b> ${escapeHtml(geoB.display)}</p>
        <p style="margin:10px 0 4px;"><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
        <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
        ${midpointInfo.county ? `<p style="margin:4px 0;"><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
        <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
        <div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;">
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
      <p style="color:#666;margin-top:0;">Closest ${escapeHtml(modeLabel)} options to the group midpoint</p>

      <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
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
        <div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;">
          <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open group midpoint in Google Maps</a>
          <a href="https://www.google.com/search?q=${encodeURIComponent(`${midpointInfo.town} NJ bars restaurants clubs lounges`) }" target="_blank" rel="noopener noreferrer">Search this town</a>
        </div>
        ${modeButtonsHtml(mode)}
      </div>

      ${placeCardsHtml(mid, midpointInfo, places, mode)}
    `;

    wireModeButtons();
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

      lastA = geoA;
      lastB = geoB;
      lastGroup = null;
      lastCenter = { kind: "middle", mid, midpointInfo };
      lastMode = "nightlife";

      renderMiddleResults(mid, midpointInfo, places, geoA, geoB, "nightlife");
    } catch (err) {
      console.error(err);
      if (els.results) {
        els.results.innerHTML = `
          <div class="card" style="border:1px solid #f0b4b4;border-radius:16px;padding:14px;margin:14px 0;background:#fff3f3;">
            <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Something went wrong")}</p>
          </div>
        `;
      } else {
        alert(err.message || "Something went wrong");
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
      .map((x) => x.trim())
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

      lastA = null;
      lastB = null;
      lastGroup = cleanedPoints;
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
          <div class="card" style="border:1px solid #f0b4b4;border-radius:16px;padding:14px;margin:14px 0;background:#fff3f3;">
            <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Could not calculate group midpoint")}</p>
          </div>
        `;
      } else {
        alert(err.message || "Could not calculate group midpoint");
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
      <p>Use <b>Meet in the Middle</b> or <b>Group Center</b> to calculate a real midpoint town, then NightScout will show nightlife or restaurants for that area.</p>
      <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
        <p style="margin:0;"><b>Tip:</b> In group mode, use exact town names with ZIP codes when possible, like <b>Saddle Brook NJ 07663</b> and <b>Fairview NJ 07022</b>.</p>
      </div>
    `;
  }

  function soloSearch() {
    const q = els.soloQuery?.value?.trim();
    if (!q) {
      alert("Enter a town, ZIP, or address.");
      return;
    }

    if (!els.results) return;

    els.results.innerHTML = `
      <h2>Solo Search</h2>
      <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
        <p style="margin:0 0 10px;"><b>Search:</b> ${escapeHtml(q)}</p>
        <a href="https://www.google.com/search?q=${encodeURIComponent(`${q} NJ bars pubs taverns lounges clubs pool halls bar arcades axe throwing music venues`) }" target="_blank" rel="noopener noreferrer">Search nightlife in this town</a>
      </div>
    `;
  }

  function generateNightPlan() {
    const q = els.aiPrompt?.value?.trim();
    if (!els.results) return;

    els.results.innerHTML = `
      <h2>Night Plan</h2>
      <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
        <p style="margin:0;"><b>Prompt:</b> ${escapeHtml(q || "No prompt entered")}</p>
        <p style="margin-top:10px;">Use Meet in the Middle first, then switch between <b>Nightlife</b> and <b>Restaurants</b> in the results.</p>
      </div>
    `;
  }

  if (els.middleBtn) els.middleBtn.addEventListener("click", meetInMiddle);
  if (els.groupBtn) els.groupBtn.addEventListener("click", groupCenter);
  if (els.loadNJ) els.loadNJ.addEventListener("click", loadNJVenues);
  if (els.searchBtn) els.searchBtn.addEventListener("click", soloSearch);
  if (els.aiBtn) els.aiBtn.addEventListener("click", generateNightPlan);
});
