    } catch (err) {
      els.results.innerHTML = `
        <div class="card error-card">
          <p style="margin:0;">${escapeHtml(err.message || "Search failed")}</p>
        </div>
      `;
    }
  }

  async function meetInMiddle() {
    const a = els.locA?.value?.trim();
    const b = els.locB?.value?.trim();

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

      let places = [];
      try {
        places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");
        await enrichPlacesWithReverse(places, 10);
      } catch (_) {
        places = [];
      }

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

      let places = [];
      try {
        places = await searchNearbyPlaces(mid.lat, mid.lng, "nightlife");
        await enrichPlacesWithReverse(places, 10);
      } catch (_) {
        places = [];
      }

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
        if (knownClosed({ name: tags.name, fullAddress: "" })) return null;

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
          if (place.text.includes("moose")) score += 20;
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
          if (place.text.includes("port imperial")) score += 20;
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
          : `<div class="card warning-card"><p style="margin:0;">No strong NJ matches came back for that prompt yet. Try words like rooftop, brunch, live music, country, EDM, waterfront.</p></div>`
      }
    `;
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

  async function generateNightPlan() {
    const q = els.aiPrompt?.value?.trim();
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
    const soloPanel = els.soloSearch;
    const middlePanel = els.middleSearch;
    const groupPanel = els.groupSearch;
    const aiPanel = els.aiSearch;

    if (soloPanel && !soloPanel.querySelector(".solo-help")) {
      const p = document.createElement("p");
      p.className = "muted solo-help";
      p.style.marginTop = "0";
      p.innerHTML =
        "Tip: the more specific you are, the better the Solo results get. Example: <b>Hoboken, NJ 07030</b> + tavern + cheap drinks.";
      soloPanel.insertBefore(p, soloPanel.firstChild);
    }

    if (middlePanel && !middlePanel.querySelector(".middle-help")) {
      const p = document.createElement("p");
      p.className = "muted middle-help";
      p.style.marginTop = "0";
      p.textContent =
        "Tip: use clean addresses or town + ZIP. If your phone adds double commas, delete the extra comma before searching.";
      middlePanel.insertBefore(p, middlePanel.firstChild);
    }

    if (groupPanel && !groupPanel.querySelector(".group-help")) {
      const p = document.createElement("p");
      p.className = "muted group-help";
      p.style.marginTop = "0";
      p.textContent =
        "Tip: one location per line. Town + ZIP works great, and full street addresses work too.";
      groupPanel.insertBefore(p, groupPanel.firstChild);
    }

    if (aiPanel && !aiPanel.querySelector(".ai-help")) {
      const p = document.createElement("p");
      p.className = "muted ai-help";
      p.style.marginTop = "0";
      p.textContent =
        "Tip: ask broad things here like “top 5 NJ rooftop bars” or “best Sunday brunch spots in New Jersey.”";
      aiPanel.insertBefore(p, aiPanel.firstChild);
    }
  }

  function setActiveTopButton(activeBtn) {
    [els.soloBtn, els.middleBtn, els.groupBtn, els.aiBtn].forEach((btn) => {
      if (!btn) return;
      btn.classList.remove("active-tab", "active-mode", "active");
    });

    if (activeBtn) {
      activeBtn.classList.add("active-tab");
    }
  }

  function hideAllPanels() {
    [els.soloSearch, els.middleSearch, els.groupSearch, els.aiSearch].forEach((panel) => {
      if (!panel) return;
      panel.style.display = "none";
      panel.classList.remove("active-panel");
    });
  }

  function showPanel(name) {
    hideAllPanels();

    if (name === "solo") {
      if (els.soloSearch) {
        els.soloSearch.style.display = "block";
        els.soloSearch.classList.add("active-panel");
      }
      setActiveTopButton(els.soloBtn);
    }

    if (name === "middle") {
      if (els.middleSearch) {
        els.middleSearch.style.display = "block";
        els.middleSearch.classList.add("active-panel");
      }
      setActiveTopButton(els.middleBtn);
    }

    if (name === "group") {
      if (els.groupSearch) {
        els.groupSearch.style.display = "block";
        els.groupSearch.classList.add("active-panel");
      }
      setActiveTopButton(els.groupBtn);
    }

    if (name === "ai") {
      if (els.aiSearch) {
        els.aiSearch.style.display = "block";
        els.aiSearch.classList.add("active-panel");
      }
      setActiveTopButton(els.aiBtn);
    }
  }

  function setupTopButtons() {
    if (els.soloBtn) {
      els.soloBtn.onclick = (e) => {
        e.preventDefault();
        showPanel("solo");
      };
    }

    if (els.middleBtn) {
      els.middleBtn.onclick = (e) => {
        e.preventDefault();
        showPanel("middle");
      };
    }

    if (els.groupBtn) {
      els.groupBtn.onclick = (e) => {
        e.preventDefault();
        showPanel("group");
      };
    }

    if (els.aiBtn) {
      els.aiBtn.onclick = (e) => {
        e.preventDefault();
        showPanel("ai");
      };
    }
  }

  function setupActionButtons() {
    if (els.searchBtn) {
      els.searchBtn.onclick = (e) => {
        e.preventDefault();
        soloSearch();
      };
    }

    if (els.middleSearchBtn) {
      els.middleSearchBtn.onclick = (e) => {
        e.preventDefault();
        meetInMiddle();
      };
    }

    if (els.groupSearchBtn) {
      els.groupSearchBtn.onclick = (e) => {
        e.preventDefault();
        groupCenter();
      };
    }

    if (els.aiSearchBtn) {
      els.aiSearchBtn.onclick = (e) => {
        e.preventDefault();
        generateNightPlan();
      };
    }

    if (els.loadNJ) {
      els.loadNJ.onclick = (e) => {
        e.preventDefault();
        loadNJVenues();
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
    setupTopButtons();
    setupActionButtons();
    setupEnterKeys();

    // default view
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

  initializeApp();
});
