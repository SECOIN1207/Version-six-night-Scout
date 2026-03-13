document.addEventListener("DOMContentLoaded", () => {

const els = {
  results: document.getElementById("results"),

  tabButtons: document.querySelectorAll(".tab-btn"),

  panelSolo: document.getElementById("panel-solo"),
  panelMiddle: document.getElementById("panel-middle"),
  panelGroup: document.getElementById("panel-group"),
  panelAi: document.getElementById("panel-ai"),

  soloQuery: document.getElementById("soloQuery"),
  soloCrowd: document.getElementById("soloCrowd"),
  soloMusic: document.getElementById("soloMusic"),
  soloVenue: document.getElementById("soloVenue"),
  soloVibe: document.getElementById("soloVibe"),

  searchBtn: document.getElementById("searchBtn"),
  loadNJ: document.getElementById("loadNJ"),

  locA: document.getElementById("locA"),
  locB: document.getElementById("locB"),
  middleBtn: document.getElementById("middleBtn"),

  groupList: document.getElementById("groupList"),
  groupBtn: document.getElementById("groupBtn"),

  aiPrompt: document.getElementById("aiPrompt"),
  aiBtn: document.getElementById("aiBtn"),

  starterTowns: document.getElementById("starterTowns")
};

const STARTER_TOWNS = [
"Hoboken, NJ 07030",
"Jersey City, NJ 07302",
"Montclair, NJ 07042",
"Red Bank, NJ 07701",
"Asbury Park, NJ 07712",
"Morristown, NJ 07960",
"Ridgewood, NJ 07450"
];

let lastMidpointState = null;

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#039;"
  }[m]));
}

function milesBetween(lat1,lng1,lat2,lng2){
  const R=3958.8;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=
    Math.sin(dLat/2)**2+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)**2;
  return R*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

function midpoint(a,b){
  return {
    lat:(a.lat+b.lat)/2,
    lng:(a.lng+b.lng)/2
  };
}

function centroid(points){
  const lat=points.reduce((s,p)=>s+p.lat,0)/points.length;
  const lng=points.reduce((s,p)=>s+p.lng,0)/points.length;
  return {lat,lng};
}

function extractZip(text){
  const m=(text||"").match(/\b\d{5}\b/);
  return m?m[0]:"";
}

function cleanLocationInput(x){
  return (x||"").replace(/\s+/g," ").trim();
}

async function fetchJsonWithTimeout(url,timeout=12000){
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),timeout);
  const res=await fetch(url,{signal:controller.signal});
  clearTimeout(t);
  return res;
}

async function geocodeAddress(address){

  const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  const res=await fetchJsonWithTimeout(url);

  const data=await res.json();

  if(!data.length) throw new Error("Location not found");

  return{
    lat:parseFloat(data[0].lat),
    lng:parseFloat(data[0].lon),
    display:data[0].display_name
  };
}

async function reverseGeocode(lat,lng){

  const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  const res=await fetchJsonWithTimeout(url);

  const data=await res.json();

  const a=data.address||{};

  return{
    town:a.city||a.town||a.village||"",
    zip:a.postcode||"",
    county:a.county||"",
    address:data.display_name||""
  };
}

async function runOverpass(query){

  const url="https://overpass-api.de/api/interpreter";

  const res=await fetch(url,{
    method:"POST",
    body:query
  });

  const data=await res.json();

  return data.elements||[];
}

async function searchNearbyPlaces(lat,lng,mode="everything",radius=3500){

  const q=`
  [out:json];
  (
    node(around:${radius},${lat},${lng})["amenity"];
    node(around:${radius},${lat},${lng})["tourism"];
    node(around:${radius},${lat},${lng})["leisure"];
  );
  out;
  `;

  const raw=await runOverpass(q);

  return raw.map(n=>({

    name:n.tags?.name||"Unknown",

    lat:n.lat,
    lng:n.lon,

    type:
      n.tags?.amenity||
      n.tags?.tourism||
      n.tags?.leisure||
      "",

    address:n.tags?.["addr:street"]||"",

    tags:n.tags||{}

  }));
}

function isFastFood(p){

  const name=normalize(p.name);

  const junk=[
    "burger king",
    "mcdonald",
    "taco bell",
    "wendy",
    "subway",
    "domino",
    "pizza hut",
    "dunkin",
    "7-eleven"
  ];

  return junk.some(j=>name.includes(j));
}

function isMedicalOrNonNight(p){

  const t=normalize(p.type);

  return[
    "hospital",
    "clinic",
    "pharmacy",
    "dentist",
    "school",
    "bank",
    "post_office"
  ].includes(t);
}

function isLikelyRestaurant(p){

  const t=normalize(p.type);
  const name=normalize(p.name);

  if(isFastFood(p)) return false;

  return(
    t.includes("restaurant")||
    name.includes("bistro")||
    name.includes("grill")||
    name.includes("steak")||
    name.includes("trattoria")||
    name.includes("ristorante")
  );
}

function isLikelyDrinksSpot(p){

  const t=normalize(p.type);
  const name=normalize(p.name);

  return(
    t.includes("bar")||
    name.includes("bar")||
    name.includes("lounge")||
    name.includes("pub")
  );
}
  function scoreRestaurant(p, prefs={}){

  let score=0;

  const name=normalize(p.name);

  if(name.includes("steak")) score+=5;
  if(name.includes("bistro")) score+=4;
  if(name.includes("ristorante")) score+=4;
  if(name.includes("trattoria")) score+=4;
  if(name.includes("italian")) score+=3;
  if(name.includes("grill")) score+=2;

  if(p.tags?.cuisine){
    const c=normalize(p.tags.cuisine);

    if(c.includes("italian")) score+=4;
    if(c.includes("steak")) score+=4;
    if(c.includes("seafood")) score+=3;
    if(c.includes("mediterranean")) score+=3;
  }

  if(p.tags?.outdoor_seating==="yes") score+=2;

  if(prefs.crowd==="40+") score+=2;

  return score;
}

function scoreDrinks(p,prefs={}){

  let score=0;

  const name=normalize(p.name);

  if(name.includes("lounge")) score+=5;
  if(name.includes("cocktail")) score+=4;
  if(name.includes("rooftop")) score+=5;
  if(name.includes("waterfront")) score+=5;
  if(name.includes("bar")) score+=3;

  if(p.tags?.outdoor_seating==="yes") score+=2;

  if(prefs.vibe==="waterfront") score+=3;

  return score;
}

function pickTopUnique(arr,scoreFn,count){

  const ranked=[...arr]
    .map(p=>({...p,_score:scoreFn(p)}))
    .sort((a,b)=>b._score-a._score);

  const out=[];
  const seen=new Set();

  for(const p of ranked){

    if(seen.has(p.name)) continue;

    out.push(p);
    seen.add(p.name);

    if(out.length>=count) break;
  }

  return out;
}

async function enrichPlacesWithReverse(places,limit=10){

  const targets=places.slice(0,limit);

  await Promise.all(targets.map(async(p)=>{

    try{

      const r=await reverseGeocode(p.lat,p.lng);

      p.fullAddress=r.address;
      p.townResolved=r.town;
      p.zipResolved=r.zip;

    }catch{

      p.fullAddress=p.address||"";
      p.townResolved="";
      p.zipResolved="";
    }

  }));

  return places;
}

function placeLinksHtml(p,town){

  const q=encodeURIComponent(`${p.name} ${town}`);

  return`
  <div class="result-links">
    <a target="_blank" href="https://www.google.com/maps?q=${q}">Google Maps</a>
    <a target="_blank" href="https://www.yelp.com/search?find_desc=${q}">Yelp</a>
  </div>
  `;
}

function placeCardsHtml(center,areaInfo,places){

  const sorted=places
  .map(p=>({...p,distance:milesBetween(center.lat,center.lng,p.lat,p.lng)}))
  .sort((a,b)=>a.distance-b.distance)
  .slice(0,20);

  if(!sorted.length){
    return`
    <div class="card warning-card">
    No venues found nearby.
    </div>
    `;
  }

  return sorted.map(p=>`

  <div class="card">

  <h3>${escapeHtml(p.name)}</h3>

  <p><b>Type:</b> ${escapeHtml(p.type)}</p>

  <p><b>Distance:</b> ${p.distance.toFixed(1)} miles</p>

  <p><b>Address:</b> ${escapeHtml(p.fullAddress||"")}</p>

  ${placeLinksHtml(p,areaInfo.town)}

  </div>

  `).join("");

}

async function soloSearch(){

  const q=els.soloQuery.value.trim();

  if(!q){
    alert("Enter a town or ZIP.");
    return;
  }

  els.results.innerHTML="Searching...";

  try{

    const center=await geocodeAddress(q);

    const areaInfo=await reverseGeocode(center.lat,center.lng);

    let places=await searchNearbyPlaces(center.lat,center.lng,"everything",4200);

    places=places
      .filter(p=>!isFastFood(p))
      .filter(p=>!isMedicalOrNonNight(p));

    await enrichPlacesWithReverse(places,10);

    els.results.innerHTML=placeCardsHtml(center,areaInfo,places);

  }catch(e){

    els.results.innerHTML="Search failed.";

  }

}

async function meetInMiddle(){

  const a=cleanLocationInput(els.locA.value);
  const b=cleanLocationInput(els.locB.value);

  if(!a||!b){
    alert("Enter both locations.");
    return;
  }

  els.results.innerHTML="Calculating midpoint...";

  try{

    const [geoA,geoB]=await Promise.all([
      geocodeAddress(a),
      geocodeAddress(b)
    ]);

    const mid=midpoint(geoA,geoB);

    const areaInfo=await reverseGeocode(mid.lat,mid.lng);

    let places=await searchNearbyPlaces(mid.lat,mid.lng,"everything",3500);

    places=places
      .filter(p=>!isFastFood(p))
      .filter(p=>!isMedicalOrNonNight(p));

    await enrichPlacesWithReverse(places,10);

    els.results.innerHTML=placeCardsHtml(mid,areaInfo,places);

  }catch(e){

    els.results.innerHTML="Load failed.";

  }

}

async function groupCenter(){

  const lines=els.groupList.value
  .split("\n")
  .map(cleanLocationInput)
  .filter(Boolean);

  if(lines.length<2){
    alert("Enter at least two locations.");
    return;
  }

  els.results.innerHTML="Calculating group center...";

  try{

    const geos=await Promise.all(lines.map(geocodeAddress));

    const mid=centroid(geos);

    const areaInfo=await reverseGeocode(mid.lat,mid.lng);

    let places=await searchNearbyPlaces(mid.lat,mid.lng,"everything",3500);

    places=places
      .filter(p=>!isFastFood(p))
      .filter(p=>!isMedicalOrNonNight(p));

    await enrichPlacesWithReverse(places,10);

    els.results.innerHTML=placeCardsHtml(mid,areaInfo,places);

  }catch{

    els.results.innerHTML="Group calculation failed.";

  }

}

async function generateNightPlan(){

  const q=els.aiPrompt.value.trim();

  if(!q){
    alert("Enter a prompt.");
    return;
  }

  els.results.innerHTML="Building plan...";

  try{

    const center=await geocodeAddress(q);

    const areaInfo=await reverseGeocode(center.lat,center.lng);

    let places=await searchNearbyPlaces(center.lat,center.lng,"everything",4200);

    places=places
      .filter(p=>!isFastFood(p))
      .filter(p=>!isMedicalOrNonNight(p));

    await enrichPlacesWithReverse(places,15);

    const dinner=pickTopUnique(places,p=>scoreRestaurant(p),3);

    const drinks=pickTopUnique(places,p=>scoreDrinks(p),2);

    let html=`<h2>Night Plan for ${escapeHtml(areaInfo.town)}</h2>`;

    html+="<h3>Dinner</h3>";

    dinner.forEach(p=>{
      html+=`
      <div class="card">
      <h3>${escapeHtml(p.name)}</h3>
      ${placeLinksHtml(p,areaInfo.town)}
      </div>
      `;
    });

    html+="<h3>Drinks After</h3>";

    drinks.forEach(p=>{
      html+=`
      <div class="card">
      <h3>${escapeHtml(p.name)}</h3>
      ${placeLinksHtml(p,areaInfo.town)}
      </div>
      `;
    });

    els.results.innerHTML=html;

  }catch{

    els.results.innerHTML="AI plan failed.";

  }

}

function showPanel(name){

  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active-panel"));

  document.querySelector(`#panel-${name}`).classList.add("active-panel");

  els.tabButtons.forEach(b=>b.classList.remove("active-tab"));

  document.querySelector(`[data-tab="${name}"]`).classList.add("active-tab");

}

function initializeApp(){

  els.searchBtn.onclick=soloSearch;

  els.middleBtn.onclick=meetInMiddle;

  els.groupBtn.onclick=groupCenter;

  els.aiBtn.onclick=generateNightPlan;

  els.tabButtons.forEach(btn=>{
    btn.onclick=()=>showPanel(btn.dataset.tab);
  });

}

initializeApp();

});
