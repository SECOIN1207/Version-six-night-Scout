function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

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
    throw new Error("Address not found");
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name
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

function midpoint(a, b) {
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2
  };
}

async function searchNearbyPlaces(lat, lng) {
  const radiusMeters = 2500;

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"~"bar|pub|restaurant|cafe|fast_food|nightclub"](around:${radiusMeters},${lat},${lng});
      way["amenity"~"bar|pub|restaurant|cafe|fast_food|nightclub"](around:${radiusMeters},${lat},${lng});
      relation["amenity"~"bar|pub|restaurant|cafe|fast_food|nightclub"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  const res = await fetch(url, {
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

      const typeMap = {
        bar: "Bar",
        pub: "Pub",
        restaurant: "Restaurant",
        cafe: "Cafe",
        fast_food: "Fast Food",
        nightclub: "Club"
      };

      return {
        name: tags.name,
        type: typeMap[tags.amenity] || "Venue",
        lat: placeLat,
        lng: placeLng,
        address: [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:city"] || tags["addr:town"] || tags["addr:village"]
        ]
          .filter(Boolean)
          .join(" "),
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

function renderPlaces(mid, midpointInfo, places, locationA, locationB) {
  const results = document.getElementById("results");
  if (!results) return;

  const sorted = places
    .map((p) => ({
      ...p,
      distance: milesBetween(mid.lat, mid.lng, p.lat, p.lng)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 12);

  const cards = sorted.length
    ? sorted
        .map((p) => {
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${p.name} ${p.address || midpointInfo.town}`
          )}`;

          const searchLink = `https://www.google.com/search?q=${encodeURIComponent(
            `${p.name} ${midpointInfo.town} nightlife`
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
        .join("")
    : `
      <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
        <p style="margin:0;">
          No venue results came back in the immediate midpoint area.
          Try the map link below and search the midpoint town directly.
        </p>
      </div>
    `;

  results.innerHTML = `
    <h2>Meet in the Middle Results</h2>
    <p style="color:#666;margin-top:0;">Closest nightlife options to the calculated midpoint</p>

    <div class="card" style="border:1px solid #ddd;border-radius:16px;padding:14px;margin:14px 0;background:#fafafa;">
      <p style="margin:4px 0;"><b>Location A:</b> ${escapeHtml(locationA.display)}</p>
      <p style="margin:4px 0;"><b>Location B:</b> ${escapeHtml(locationB.display)}</p>
      <p style="margin:10px 0 4px;"><b>Midpoint Town:</b> ${escapeHtml(midpointInfo.town)}</p>
      <p style="margin:4px 0;"><b>ZIP:</b> ${escapeHtml(midpointInfo.zip || "Not available")}</p>
      ${midpointInfo.county ? `<p style="margin:4px 0;"><b>County:</b> ${escapeHtml(midpointInfo.county)}</p>` : ""}
      <p style="margin:4px 0;"><b>Area:</b> ${escapeHtml(midpointInfo.address)}</p>
      <div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;">
        <a href="https://www.google.com/maps?q=${mid.lat},${mid.lng}" target="_blank" rel="noopener noreferrer">Open midpoint in Google Maps</a>
        <a href="https://www.google.com/search?q=${encodeURIComponent(`${midpointInfo.town} NJ bars restaurants clubs lounges`) }" target="_blank" rel="noopener noreferrer">Search this town</a>
      </div>
    </div>

    ${cards}
  `;
}

async function meetInMiddle() {
  const aInput = document.getElementById("locA");
  const bInput = document.getElementById("locB");
  const button = document.getElementById("middleBtn");
  const results = document.getElementById("results");

  const a = aInput?.value?.trim();
  const b = bInput?.value?.trim();

  if (!a || !b) {
    alert("Enter both addresses");
    return;
  }

  const originalButtonText = button ? button.textContent : "";
  if (button) {
    button.disabled = true;
    button.textContent = "Calculating...";
  }

  if (results) {
    results.innerHTML = `<p>Calculating midpoint and nearby venues...</p>`;
  }

  try {
    const geoA = await geocodeAddress(a);
    const geoB = await geocodeAddress(b);

    const mid = midpoint(geoA, geoB);
    const midpointInfo = await reverseGeocode(mid.lat, mid.lng);
    const places = await searchNearbyPlaces(mid.lat, mid.lng);

    renderPlaces(mid, midpointInfo, places, geoA, geoB);
  } catch (err) {
    console.error(err);
    if (results) {
      results.innerHTML = `
        <div class="card" style="border:1px solid #f0b4b4;border-radius:16px;padding:14px;margin:14px 0;background:#fff3f3;">
          <p style="margin:0;"><b>Error:</b> ${escapeHtml(err.message || "Something went wrong")}</p>
        </div>
      `;
    } else {
      alert(err.message || "Something went wrong");
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalButtonText || "Meet in the Middle";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const middleBtn = document.getElementById("middleBtn");
  if (middleBtn) {
    middleBtn.addEventListener("click", meetInMiddle);
  }
});
