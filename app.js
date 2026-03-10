document.addEventListener("DOMContentLoaded", () => {
  const VENUES = [
    { name: "Grand Vin", city: "Hoboken", type: "Lounge / Restaurant", lat: 40.7486, lng: -74.0324, area: "North Jersey" },
    { name: "Finnegan's Pub", city: "Hoboken", type: "Pub / Live Music", lat: 40.7517, lng: -74.0333, area: "North Jersey" },
    { name: "Mills Tavern", city: "Hoboken", type: "Cocktail Bar / Tavern", lat: 40.7398, lng: -74.0306, area: "North Jersey" },
    { name: "McGovern's Tavern", city: "Newark", type: "Tavern / Restaurant", lat: 40.7369, lng: -74.1706, area: "North Jersey" },
    { name: "Bar Franco", city: "Montclair", type: "Cocktail Lounge", lat: 40.8177, lng: -74.2102, area: "North Jersey" },
    { name: "Hudson View Lounge", city: "Weehawken", type: "Rooftop / Waterfront", lat: 40.7718, lng: -74.0153, area: "North Jersey" },
    { name: "Son Cubano", city: "West New York", type: "Restaurant / Lounge", lat: 40.7785, lng: -74.0078, area: "North Jersey" },
    { name: "Fort Lee Social", city: "Fort Lee", type: "Bar / Sports Bar", lat: 40.8509, lng: -73.9701, area: "North Jersey" },
    { name: "Ventanas Restaurant & Lounge", city: "Fort Lee", type: "Steakhouse / Rooftop", lat: 40.8516, lng: -73.9735, area: "North Jersey" },
    { name: "Hackensack Live Room", city: "Hackensack", type: "Music Venue / Bar", lat: 40.8862, lng: -74.0435, area: "North Jersey" },
    { name: "Totowa Night Hub", city: "Totowa", type: "Bar / Sports Bar", lat: 40.9052, lng: -74.2238, area: "North Jersey" },
    { name: "Franklin Steakhouse", city: "Fair Lawn", type: "Steakhouse / Bar", lat: 40.9406, lng: -74.1186, area: "North Jersey" },
    { name: "Montclair Social Lounge", city: "Montclair", type: "Cocktail Lounge", lat: 40.8206, lng: -74.2107, area: "North Jersey" },
    { name: "Iron Bar", city: "Morristown", type: "Bar / Live Music", lat: 40.7967, lng: -74.4815, area: "North Jersey" },

    { name: "The Stone Pony", city: "Asbury Park", type: "Music Venue / Bar", lat: 40.2208, lng: -73.9989, area: "Jersey Shore" },
    { name: "Watermark", city: "Asbury Park", type: "Beach Lounge / Rooftop", lat: 40.2197, lng: -73.9982, area: "Jersey Shore" },
    { name: "Jenkinson's", city: "Point Pleasant Beach", type: "Beach Bar / Club", lat: 40.0942, lng: -74.0362, area: "Jersey Shore" },
    { name: "Martell's Tiki Bar", city: "Point Pleasant Beach", type: "Beach Bar / Live Music", lat: 40.0947, lng: -74.0358, area: "Jersey Shore" },
    { name: "Seaside Shore Nightspot", city: "Seaside Heights", type: "Club / Beach Bar", lat: 39.9443, lng: -74.0727, area: "Jersey Shore" },
    { name: "Wildwood Boardwalk Nightspot", city: "Wildwood", type: "Bar / Club / Beach Bar", lat: 38.9876, lng: -74.8165, area: "Jersey Shore" },
    { name: "Red Bank Social", city: "Red Bank", type: "Bar / Lounge", lat: 40.3471, lng: -74.0643, area: "Jersey Shore" },

    { name: "Atlantic City Casino Club", city: "Atlantic City", type: "Casino Club / DJ Venue", lat: 39.3565, lng: -74.4313, area: "Atlantic City" },
    { name: "HQ2 Nightclub", city: "Atlantic City", type: "Casino Club / DJ Venue", lat: 39.3543, lng: -74.4340, area: "Atlantic City" },
    { name: "Boogie Nights", city: "Atlantic City", type: "Casino Club / DJ Venue", lat: 39.3548, lng: -74.4372, area: "Atlantic City" }
  ];

  const STARTER_CITIES = [
    "Newark NJ",
    "Hoboken NJ",
    "Jersey City NJ",
    "Weehawken NJ",
    "Fort Lee NJ",
    "Hackensack NJ",
    "Montclair NJ",
    "Morristown NJ",
    "Fair Lawn NJ",
    "Asbury Park NJ",
    "Point Pleasant Beach NJ",
    "Seaside Heights NJ",
    "Wildwood NJ",
    "Atlantic City NJ"
  ];

  function normalize(text) {
    return (text || "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function haversineMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  async function geocodeLocation(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });
    if (!res.ok) {
      throw new Error("Geocoding request failed");
    }
    const data = await res.json();
    if (!data.length) {
      throw new Error(`Location not found: ${query}`);
    }
    return {
      query,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name
    };
  }

  function nearestVenues(lat, lng, limit = 8) {
    return VENUES
      .map(v => ({
        ...v,
        distance: haversineMiles(lat, lng, v.lat, v.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  function findSoloMatches(query, limit = 10) {
    const q = normalize(query);
    return VENUES.filter(v => {
      const blob = normalize(`${v.name} ${v.city} ${v.type} ${v.area}`);
      return blob.includes(q);
    }).slice(0, limit);
  }

  function ensureResultsBox() {
    let box = document.getElementById("results");
    if (box) return box;

    const resultsHeading = Array.from(document.querySelectorAll("h1, h2, h3")).find(el =>
      normalize(el.textContent) === "results"
    );

    box = document.createElement("div");
    box.id = "results";
    box.style.marginTop = "20px";
    box.style.paddingBottom = "40px";

    if (resultsHeading && resultsHeading.parentNode) {
      resultsHeading.parentNode.insertBefore(box, resultsHeading.nextSibling);
    } else {
      document.body.appendChild(box);
    }

    return box;
  }

  const resultsBox = ensureResultsBox();

  function renderHtml(html) {
    resultsBox.innerHTML = html;
  }

  function renderVenueCards(title, subtitle, venues, extraTop = "") {
    const html = `
      <div style="margin-top:18px;">
        <h3 style="margin:0 0 8px;">${escapeHtml(title)}</h3>
        <div style="margin-bottom:14px; color:#666;">${escapeHtml(subtitle)}</div>
        ${extraTop}
        <div style="display:grid; gap:14px;">
          ${venues.map(v => `
            <div style="border:1px solid #ddd; border-radius:16px; padding:14px; background:#fafafa;">
              <div style="font-weight:800; font-size:1.08rem;">${escapeHtml(v.name)}</div>
              <div style="margin-top:4px;">${escapeHtml(v.city)} • ${escapeHtml(v.type)}</div>
              <div style="margin-top:4px; color:#666;">Area: ${escapeHtml(v.area)}</div>
              ${typeof v.distance === "number" ? `<div style="margin-top:6px;"><b>${v.distance.toFixed(1)} miles</b> from center</div>` : ""}
              <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;">
                <a href="https://maps.google.com/?q=${encodeURIComponent(v.name + " " + v.city + " NJ")}" target="_blank" rel="noopener noreferrer">Maps</a>
                <a href="https://www.google.com/search?q=${encodeURIComponent(v.name + " " + v.city + " DJs tonight")}" target="_blank" rel="noopener noreferrer">DJs tonight</a>
                <a href="https://www.google.com/search?q=${encodeURIComponent(v.name + " " + v.city + " events")}" target="_blank" rel="noopener noreferrer">Events</a>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    renderHtml(html);
  }

  function renderError(message) {
    renderHtml(`
      <div style="margin-top:18px; padding:14px; border:1px solid #e3b3b3; background:#fff3f3; border-radius:14px;">
        <b>Error:</b> ${escapeHtml(message)}
      </div>
    `);
  }

  function getButtonsByText() {
    const buttons = Array.from(document.querySelectorAll("button"));
    const get = (label) => buttons.find(btn => normalize(btn.textContent) === normalize(label));
    return {
      search: get("Search"),
      loadNj: get("Load NJ Venues"),
      middle: get("Meet in the Middle"),
      group: get("Group Center"),
      ai: get("Generate Night Plan")
    };
  }

  function getInputs() {
    const inputs = Array.from(document.querySelectorAll("input"));
    const textareas = Array.from(document.querySelectorAll("textarea"));

    const soloInput = inputs.find(i => normalize(i.placeholder).includes("city, zip, or address"));
    const midA = inputs.find(i => normalize(i.placeholder).includes("location a")) || inputs[1];
    const midB = inputs.find(i => normalize(i.placeholder).includes("location b")) || inputs[2];
    const aiInput = inputs.find(i => normalize(i.placeholder).includes("beach bar with dj")) || inputs[3];
    const groupBox = textareas[0];

    if (midA) midA.id = "locA";
    if (midB) midB.id = "locB";

    return { soloInput, midA, midB, aiInput, groupBox };
  }

  const els = getInputs();
  const btns = getButtonsByText();

  function setBusy(button, busyText) {
    if (!button) return () => {};
    const original = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    return () => {
      button.disabled = false;
      button.textContent = original;
    };
  }

  async function runSoloSearch() {
    const query = els.soloInput?.value?.trim();
    if (!query) {
      renderError("Enter a city, ZIP, or address first.");
      return;
    }

    const restore = setBusy(btns.search, "Searching...");
    try {
      let matches = findSoloMatches(query);

      if (!matches.length) {
        const geo = await geocodeLocation(query);
        matches = nearestVenues(geo.lat, geo.lng, 8);
        renderVenueCards(
          "Solo Search Results",
          `Closest nightlife matches to ${geo.display}`,
          matches,
          `<div style="margin-bottom:14px;"><a href="https://maps.google.com/?q=${geo.lat},${geo.lng}" target="_blank" rel="noopener noreferrer">Open searched area in Google Maps</a></div>`
        );
      } else {
        renderVenueCards(
          "Solo Search Results",
          `Matched "${query}" from the NightScout NJ venue list`,
          matches
        );
      }
    } catch (err) {
      renderError(err.message || "Search failed.");
    } finally {
      restore();
    }
  }

  function loadNJVenues() {
    renderVenueCards(
      "NightScout NJ Starter Venues",
      "North Jersey, Jersey Shore, and Atlantic City nightlife picks",
      VENUES
    );
  }

  async function meetInMiddle() {
    const locA = document.getElementById("locA")?.value?.trim();
    const locB = document.getElementById("locB")?.value?.trim();

    if (!locA || !locB) {
      renderError("Enter both locations first.");
      return;
    }

    const restore = setBusy(btns.middle, "Calculating...");
    try {
      const [geoA, geoB] = await Promise.all([
        geocodeLocation(locA),
        geocodeLocation(locB)
      ]);

      const midLat = (geoA.lat + geoB.lat) / 2;
      const midLng = (geoA.lng + geoB.lng) / 2;

      const nearest = nearestVenues(midLat, midLng, 8);

      const extraTop = `
        <div style="margin-bottom:14px; padding:14px; border:1px solid #ddd; border-radius:16px; background:#fafafa;">
          <div><b>Location A:</b> ${escapeHtml(geoA.display)}</div>
          <div style="margin-top:6px;"><b>Location B:</b> ${escapeHtml(geoB.display)}</div>
          <div style="margin-top:10px;"><b>Midpoint:</b> ${midLat.toFixed(5)}, ${midLng.toFixed(5)}</div>
          <div style="margin-top:10px;">
            <a href="https://maps.google.com/?q=${midLat},${midLng}" target="_blank" rel="noopener noreferrer">Open midpoint in Google Maps</a>
          </div>
        </div>
      `;

      renderVenueCards(
        "Meet in the Middle Results",
        "Closest nightlife options to the calculated midpoint",
        nearest,
        extraTop
      );
    } catch (err) {
      renderError(err.message || "Could not calculate midpoint.");
    } finally {
      restore();
    }
  }

  async function groupCenter() {
    const lines = (els.groupBox?.value || "")
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (lines.length < 2) {
      renderError("Enter at least 2 group locations, one per line.");
      return;
    }

    const restore = setBusy(btns.group, "Calculating...");
    try {
      const geos = [];
      for (const line of lines) {
        geos.push(await geocodeLocation(line));
      }

      const midLat = geos.reduce((sum, g) => sum + g.lat, 0) / geos.length;
      const midLng = geos.reduce((sum, g) => sum + g.lng, 0) / geos.length;

      const nearest = nearestVenues(midLat, midLng, 10);

      const extraTop = `
        <div style="margin-bottom:14px; padding:14px; border:1px solid #ddd; border-radius:16px; background:#fafafa;">
          <div><b>Group locations:</b></div>
          <div style="margin-top:8px;">${geos.map(g => escapeHtml(g.display)).join("<br>")}</div>
          <div style="margin-top:10px;"><b>Group center:</b> ${midLat.toFixed(5)}, ${midLng.toFixed(5)}</div>
          <div style="margin-top:10px;">
            <a href="https://maps.google.com/?q=${midLat},${midLng}" target="_blank" rel="noopener noreferrer">Open group center in Google Maps</a>
          </div>
        </div>
      `;

      renderVenueCards(
        "Group Center Results",
        "Closest nightlife options to the group midpoint",
        nearest,
        extraTop
      );
    } catch (err) {
      renderError(err.message || "Could not calculate group center.");
    } finally {
      restore();
    }
  }

  function generateNightPlan() {
    const prompt = els.aiInput?.value?.trim();
    if (!prompt) {
      renderError("Enter a nightlife idea first.");
      return;
    }

    const p = normalize(prompt);

    let area = "North Jersey";
    if (p.includes("shore") || p.includes("beach") || p.includes("asbury") || p.includes("point pleasant") || p.includes("seaside") || p.includes("wildwood")) {
      area = "Jersey Shore";
    }
    if (p.includes("atlantic city") || p.includes("casino")) {
      area = "Atlantic City";
    }

    let filtered = VENUES.filter(v => normalize(v.area) === normalize(area));

    if (p.includes("dj")) {
      filtered = filtered.filter(v => normalize(v.type).includes("club") || normalize(v.type).includes("dj") || normalize(v.type).includes("lounge"));
    }
    if (p.includes("beach")) {
      filtered = filtered.filter(v => normalize(v.type).includes("beach"));
    }
    if (p.includes("casino")) {
      filtered = filtered.filter(v => normalize(v.type).includes("casino"));
    }
    if (p.includes("live music")) {
      filtered = filtered.filter(v => normalize(v.type).includes("music"));
    }

    if (!filtered.length) filtered = VENUES.slice(0, 8);

    renderVenueCards(
      "Night Plan",
      `Theme: ${prompt}`,
      filtered.slice(0, 8)
    );
  }

  function seedSoloPlaceholder() {
    if (!els.soloInput) return;
    let idx = 0;
    setInterval(() => {
      if (document.activeElement === els.soloInput) return;
      els.soloInput.placeholder = STARTER_CITIES[idx % STARTER_CITIES.length];
      idx += 1;
    }, 2400);
  }

  btns.search?.addEventListener("click", runSoloSearch);
  btns.loadNj?.addEventListener("click", loadNJVenues);
  btns.middle?.addEventListener("click", meetInMiddle);
  btns.group?.addEventListener("click", groupCenter);
  btns.ai?.addEventListener("click", generateNightPlan);

  els.soloInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSoloSearch();
  });

  els.midA?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") meetInMiddle();
  });

  els.midB?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") meetInMiddle();
  });

  els.aiInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") generateNightPlan();
  });

  seedSoloPlaceholder();

  renderHtml(`
    <div style="margin-top:18px; padding:14px; border:1px solid #ddd; border-radius:16px; background:#fafafa;">
      NightScout is loaded. Try <b>Newark NJ</b> and <b>Fairview NJ</b> in Meet in the Middle.
    </div>
  `);
});
