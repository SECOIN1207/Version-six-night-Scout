// NightScout Core App
// Nightlife Intelligence Engine

const resultsDiv = document.getElementById("results");

function showResults(html){
    resultsDiv.innerHTML = html;
}

// ----------------------------
// Basic Search
// ----------------------------

function searchPlace(){
    const query = document.querySelector("input[placeholder='City, ZIP, or address']").value;

    if(!query){
        alert("Enter a location");
        return;
    }

    const mapLink = `https://maps.google.com/?q=${encodeURIComponent(query)}`;

    showResults(`
        <h3>Search Result</h3>
        <p>${query}</p>
        <a href="${mapLink}" target="_blank">Open in Google Maps</a>
    `);
}

// ----------------------------
// Load NJ Venues (demo dataset)
// ----------------------------

const njVenues = [
{ name:"Bar A", city:"Lake Como", type:"Beach Bar" },
{ name:"DJais", city:"Belmar", type:"Club" },
{ name:"Headliner", city:"Neptune", type:"Club" },
{ name:"The Parker House", city:"Sea Girt", type:"Bar" },
{ name:"Tropicana", city:"Atlantic City", type:"Casino Club" },
{ name:"HQ2 Nightclub", city:"Atlantic City", type:"Casino Club" }
];

function loadNJVenues(){

    let html = "<h3>NJ Nightlife Venues</h3>";

    njVenues.forEach(v=>{
        html += `<p><b>${v.name}</b> — ${v.city} (${v.type})</p>`;
    });

    showResults(html);
}

// ----------------------------
// Meet in the Middle
// ----------------------------

async function meetInMiddle(){

const locA = document.getElementById("locA").value;
const locB = document.getElementById("locB").value;

if(!locA || !locB){
alert("Enter two locations");
return;
}

try{

const geoA = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locA)}`).then(r=>r.json());
const geoB = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locB)}`).then(r=>r.json());

if(!geoA.length || !geoB.length){
alert("Location not found");
return;
}

const lat1 = parseFloat(geoA[0].lat);
const lon1 = parseFloat(geoA[0].lon);

const lat2 = parseFloat(geoB[0].lat);
const lon2 = parseFloat(geoB[0].lon);

// midpoint math
const midLat = (lat1 + lat2) / 2;
const midLon = (lon1 + lon2) / 2;

const mapLink = `https://maps.google.com/?q=${midLat},${midLon}`;

showResults(`
<h3>Meet in the Middle</h3>

<p><b>Location A:</b> ${locA}</p>
<p><b>Location B:</b> ${locB}</p>

<p><b>Midpoint Coordinates:</b><br>
${midLat.toFixed(5)}, ${midLon.toFixed(5)}</p>

<p>
<a href="${mapLink}" target="_blank">Open Midpoint in Google Maps</a>
</p>
`);

}catch(e){

console.error(e);
alert("Error calculating midpoint");

}

}

// ----------------------------
// Group Center
// ----------------------------

async function groupCenter(){

const lines = document.querySelector("textarea").value.split("\n").filter(l=>l.trim());

if(lines.length < 2){
alert("Enter multiple locations");
return;
}

let latSum = 0;
let lonSum = 0;

for(let loc of lines){

const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`).then(r=>r.json());

if(!geo.length) continue;

latSum += parseFloat(geo[0].lat);
lonSum += parseFloat(geo[0].lon);

}

const midLat = latSum / lines.length;
const midLon = lonSum / lines.length;

const mapLink = `https://maps.google.com/?q=${midLat},${midLon}`;

showResults(`
<h3>Group Center</h3>

<p>Based on ${lines.length} locations</p>

<p>${midLat.toFixed(5)}, ${midLon.toFixed(5)}</p>

<a href="${mapLink}" target="_blank">Open Group Center</a>
`);

}

// ----------------------------
// AI Night Plan Generator
// ----------------------------

function generateNightPlan(){

const idea = document.querySelector("input[placeholder='Example: beach bar with DJ']").value;

if(!idea){
alert("Enter a nightlife idea");
return;
}

showResults(`
<h3>Night Plan</h3>

<p>Theme: <b>${idea}</b></p>

<ul>
<li>Start: cocktail bar</li>
<li>Main stop: live DJ venue</li>
<li>Late night: club or beach bar</li>
<li>Food: late-night pizza or diner</li>
</ul>

<p>Tip: Use Meet in the Middle to choose a fair meetup location.</p>
`);

}

// ----------------------------
// Button Wiring
// ----------------------------

document.querySelector("button:nth-of-type(5)")?.addEventListener("click", searchPlace);
document.querySelector("button:nth-of-type(6)")?.addEventListener("click", loadNJVenues);
document.querySelector("button:nth-of-type(7)")?.addEventListener("click", meetInMiddle);
document.querySelector("button:nth-of-type(8)")?.addEventListener("click", groupCenter);
document.querySelector("button:nth-of-type(9)")?.addEventListener("click", generateNightPlan);
