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
  starterTowns: $("starterTowns"),

  searchBtn: $("searchBtn"),
  loadNJ: $("loadNJ"),
  middleBtn: $("middleBtn"),
  groupBtn: $("groupBtn"),
  aiBtn: $("aiBtn"),

  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),

  soloPanel: $("panel-solo"),
  middlePanel: $("panel-middle"),
  groupPanel: $("panel-group"),
  aiPanel: $("panel-ai")
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
  "Atlantic City, NJ 08401",
  "Bayonne, NJ 07002"
];

function escapeHtml(str) {
  return String(str || "")
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#39;");
}

function normalize(text){
  return String(text||"")
  .toLowerCase()
  .replace(/[.,]/g," ")
  .replace(/\s+/g," ")
  .trim();
}

function midpoint(a,b){
  return{
    lat:(a.lat+b.lat)/2,
    lng:(a.lng+b.lng)/2
  };
}

function centroid(points){
  return{
    lat:points.reduce((s,p)=>s+p.lat,0)/points.length,
    lng:points.reduce((s,p)=>s+p.lng,0)/points.length
  };
}

function milesBetween(lat1,lon1,lat2,lon2){
  const R=3958.8;
  const toRad=(d)=>d*Math.PI/180;

  const dLat=toRad(lat2-lat1);
  const dLon=toRad(lon2-lon1);

  const a=Math.sin(dLat/2)**2+
  Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;

  return 2*R*Math.asin(Math.sqrt(a));
}

async function geocodeAddress(q){

  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q+" New Jersey")}`;

  const res=await fetch(url);

  const data=await res.json();

  if(!data.length){
    throw new Error("Location not found");
  }

  return{
    lat:parseFloat(data[0].lat),
    lng:parseFloat(data[0].lon),
    display:data[0].display_name
  };
}

async function reverseGeocode(lat,lng){

  const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  const res=await fetch(url);
  const data=await res.json();

  const a=data.address||{};

  return{
    town:a.city||a.town||a.village||"Unknown",
    zip:a.postcode||"",
    county:a.county||"",
    address:data.display_name||""
  };
}

async function searchNearbyPlaces(lat,lng){

const q=`
[out:json][timeout:25];
(
node["amenity"="bar"](around:3500,${lat},${lng});
node["amenity"="pub"](around:3500,${lat},${lng});
node["amenity"="nightclub"](around:3500,${lat},${lng});
node["amenity"="restaurant"](around:3500,${lat},${lng});
);
out;
`;

const res=await fetch("https://overpass-api.de/api/interpreter",{
method:"POST",
body:q
});

const data=await res.json();

return (data.elements||[]).map(el=>({

name:el.tags?.name||"Unknown",

lat:el.lat,

lng:el.lon,

type:el.tags?.amenity||"venue",

address:[
el.tags?.["addr:housenumber"],
el.tags?.["addr:street"],
el.tags?.["addr:city"]
].filter(Boolean).join(" ")

}));

}

async function enrichPlaces(places){

for(const p of places){

try{

const rev=await reverseGeocode(p.lat,p.lng);

p.townResolved=rev.town;
p.fullAddress=rev.address;

}catch(e){}

}

return places;

}

function renderPlaces(center,areaInfo,places){

const sorted=places
.map(p=>({
...p,
distance:milesBetween(center.lat,center.lng,p.lat,p.lng)
}))
.sort((a,b)=>a.distance-b.distance)
.slice(0,20);

if(!sorted.length){

els.results.innerHTML=`
<div class="card">
<p>No venues found in this area yet.</p>
</div>
`;

return;
}

els.results.innerHTML=

sorted.map(p=>`

<div class="card">

<h3>${escapeHtml(p.name)}</h3>

<p><b>Type:</b> ${escapeHtml(p.type)}</p>

<p><b>Town:</b> ${escapeHtml(p.townResolved||areaInfo.town)}</p>

<p><b>Distance:</b> ${p.distance.toFixed(1)} miles</p>

<p><b>Address:</b> ${escapeHtml(p.fullAddress||p.address||"Unknown")}</p>

<div class="result-links">

<a target="_blank"
href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+" "+(p.fullAddress||" NJ"))}">
Directions
</a>

<a target="_blank"
href="https://www.google.com/search?q=${encodeURIComponent(p.name+" NJ")}">
Search
</a>

</div>

</div>

`).join("");

}

async function soloSearch(){

const q=els.soloQuery.value.trim();

if(!q){

alert("Enter a town or address");

return;

}

els.results.innerHTML="Searching...";

try{

const center=await geocodeAddress(q);

const areaInfo=await reverseGeocode(center.lat,center.lng);

let places=await searchNearbyPlaces(center.lat,center.lng);

await enrichPlaces(places);

renderPlaces(center,areaInfo,places);

}catch(err){

els.results.innerHTML=`
<div class="card error-card">
<p>${escapeHtml(err.message)}</p>
</div>
`;

}

}

async function meetInMiddle(){

const a=els.locA.value.trim();
const b=els.locB.value.trim();

if(!a||!b){

alert("Enter both locations");

return;

}

els.results.innerHTML="Calculating midpoint...";

try{

const geoA=await geocodeAddress(a);
const geoB=await geocodeAddress(b);

const mid=midpoint(geoA,geoB);

const areaInfo=await reverseGeocode(mid.lat,mid.lng);

let places=await searchNearbyPlaces(mid.lat,mid.lng);

await enrichPlaces(places);

renderPlaces(mid,areaInfo,places);

}catch(err){

els.results.innerHTML=`
<div class="card error-card">
<p>${escapeHtml(err.message)}</p>
</div>
`;

}

}

async function groupCenter(){

const lines=(els.groupList.value||"")
.split("\n")
.map(x=>x.trim())
.filter(x=>x.length);

if(lines.length<2){

alert("Enter at least 2 locations");

return;

}

els.results.innerHTML="Calculating group center...";

try{

const geos=[];

for(const l of lines){

geos.push(await geocodeAddress(l));

}

const mid=centroid(geos);

const areaInfo=await reverseGeocode(mid.lat,mid.lng);

let places=await searchNearbyPlaces(mid.lat,mid.lng);

await enrichPlaces(places);

renderPlaces(mid,areaInfo,places);

}catch(err){

els.results.innerHTML=`
<div class="card error-card">
<p>${escapeHtml(err.message)}</p>
</div>
`;

}

}

function generateNightPlan(){

const q=els.aiPrompt.value.trim();

if(!q){

alert("Enter a prompt");

return;

}

els.results.innerHTML=`

<div class="card">

<h3>Night Plan</h3>

<p>${escapeHtml(q)}</p>

<p>Use Solo search or Middle search to discover real venues.</p>

</div>

`;

}

function setupStarterTowns(){

if(!els.starterTowns)return;

STARTER_TOWNS.forEach(town=>{

const btn=document.createElement("button");

btn.className="starter-chip";

btn.textContent=town.replace(", NJ","");

btn.onclick=()=>{

els.soloQuery.value=town;

};

els.starterTowns.appendChild(btn);

});

}

function hideAllPanels(){

[els.soloPanel,els.middlePanel,els.groupPanel,els.aiPanel]

.forEach(p=>p.classList.remove("active-panel"));

}

function showPanel(name){

hideAllPanels();

if(name==="solo")els.soloPanel.classList.add("active-panel");

if(name==="middle")els.middlePanel.classList.add("active-panel");

if(name==="group")els.groupPanel.classList.add("active-panel");

if(name==="ai")els.aiPanel.classList.add("active-panel");

els.tabButtons.forEach(btn=>{

btn.classList.remove("active-tab");

if(btn.dataset.tab===name){

btn.classList.add("active-tab");

}

});

}

function setupTabs(){

els.tabButtons.forEach(btn=>{

btn.onclick=()=>showPanel(btn.dataset.tab);

});

}

function setupButtons(){

els.searchBtn.onclick=soloSearch;

els.middleBtn.onclick=meetInMiddle;

els.groupBtn.onclick=groupCenter;

els.aiBtn.onclick=generateNightPlan;

els.loadNJ.onclick=()=>{

els.results.innerHTML=`
<div class="card">
<h3>NightScout ready</h3>
<p>Search any NJ town to discover nightlife.</p>
</div>
`;

};

}

function setupEnterKeys(){

els.soloQuery.addEventListener("keydown",e=>{
if(e.key==="Enter")soloSearch();
});

els.locA.addEventListener("keydown",e=>{
if(e.key==="Enter")meetInMiddle();
});

els.locB.addEventListener("keydown",e=>{
if(e.key==="Enter")meetInMiddle();
});

els.aiPrompt.addEventListener("keydown",e=>{
if(e.key==="Enter")generateNightPlan();
});

}

function initializeApp(){

setupStarterTowns();

setupTabs();

setupButtons();

setupEnterKeys();

showPanel("solo");

}

initializeApp();

});
