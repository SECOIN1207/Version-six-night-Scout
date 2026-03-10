async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${AIzaSyDYtelX2ShPOmrdE2xKHO_Djf8SV3Dl9gI}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.results.length) {
    throw new Error("Address not found");
  }

  return data.results[0].geometry.location;
}

async function reverseGeocode(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  const result = data.results[0];

  let town = "";
  let zip = "";

  result.address_components.forEach(c => {
    if (c.types.includes("locality")) town = c.long_name;
    if (c.types.includes("postal_code")) zip = c.long_name;
  });

  return {
    town,
    zip,
    address: result.formatted_address
  };
}

function midpoint(a, b) {
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2
  };
}

async function searchPlaces(lat, lng) {
  const radius = 2500;

  const types = [
    "bar",
    "restaurant",
    "night_club"
  ];

  let places = [];

  for (const type of types) {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=${radius}` +
      `&type=${type}` +
      `&key=${GOOGLE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.results) {
      places = places.concat(data.results);
    }
  }

  return places;
}

function renderPlaces(places) {
  const results = document.getElementById("results");

  let html = "";

  places.forEach(p => {
    const mapLink =
      `https://www.google.com/maps/search/?api=1&query=` +
      encodeURIComponent(p.name + " " + p.vicinity);

    html += `
      <div class="card">
        <h3>${p.name}</h3>
        <p>${p.vicinity}</p>
        <a href="${mapLink}" target="_blank">Open in Maps</a>
      </div>
    `;
  });

  results.innerHTML += html;
}

async function meetInMiddle() {
  const a = document.getElementById("locA").value;
  const b = document.getElementById("locB").value;

  if (!a || !b) {
    alert("Enter both addresses");
    return;
  }

  try {
    const geoA = await geocodeAddress(a);
    const geoB = await geocodeAddress(b);

    const mid = midpoint(geoA, geoB);

    const location = await reverseGeocode(mid.lat, mid.lng);

    const places = await searchPlaces(mid.lat, mid.lng);

    const results = document.getElementById("results");

    results.innerHTML = `
      <h2>Meet in the Middle</h2>
      <p><b>Town:</b> ${location.town}</p>
      <p><b>ZIP:</b> ${location.zip}</p>
      <p><b>Address:</b> ${location.address}</p>
      <a href="https://maps.google.com/?q=${mid.lat},${mid.lng}" target="_blank">
        Open midpoint on map
      </a>
      <h3>Bars & Restaurants Nearby</h3>
    `;

    renderPlaces(places);

  } catch (err) {
    alert(err.message);
  }
}

document
  .getElementById("middleBtn")
  .addEventListener("click", meetInMiddle);
