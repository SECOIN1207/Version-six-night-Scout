document.addEventListener("DOMContentLoaded", () => {

const $ = id => document.getElementById(id)

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
starterTowns: $("starterTowns")
}

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
"Atlantic City, NJ 08401"
]

function escapeHtml(str){
return String(str||"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#39;")
}

function normalize(t){
return String(t||"")
.toLowerCase()
.replace(/,/g," ")
.replace(/\s+/g," ")
.trim()
}

function isLatLng(text){
return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(text))
}

function parseLatLng(text){
const [lat,lng]=text.split(",").map(x=>parseFloat(x.trim()))
return {lat,lng}
}

function milesBetween(lat1,lon1,lat2,lon2){
const R=3958.8
const toRad=d=>d*Math.PI/180
const dLat=toRad(lat2-lat1)
const dLon=toRad(lon2-lon1)

const a=Math.sin(dLat/2)**2+
Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2

return 2*R*Math.asin(Math.sqrt(a))
}

function midpoint(a,b){
return {
lat:(a.lat+b.lat)/2,
lng:(a.lng+b.lng)/2
}
}

function centroid(points){
return {
lat:points.reduce((s,p)=>s+p.lat,0)/points.length,
lng:points.reduce((s,p)=>s+p.lng,0)/points.length
}
}

function cleanUserLocation(text){

let q=String(text||"").trim()

q=q.replace(/\bSaddlebrook\b/gi,"Saddle Brook")
q=q.replace(/\bPt\.?\s*Pleasant\b/gi,"Point Pleasant Beach")

const aliases={
"hoboken":"Hoboken, NJ 07030",
"newark":"Newark, NJ 07105",
"fairview":"Fairview, NJ 07022",
"saddle brook":"Saddle Brook, NJ 07663",
"saddlebrook":"Saddle Brook, NJ 07663",
"fort lee":"Fort Lee, NJ 07024",
"montclair":"Montclair, NJ 07042",
"asbury park":"Asbury Park, NJ 07712",
"point pleasant":"Point Pleasant Beach, NJ 08742",
"atlantic city":"Atlantic City, NJ 08401",
"jersey city":"Jersey City, NJ 07302"
}

const norm=normalize(q)

if(aliases[norm]) return aliases[norm]

return q
}

async function geocodeAddress(address){

const cleaned=cleanUserLocation(address)

if(isLatLng(cleaned)){
const parsed=parseLatLng(cleaned)
return {
lat:parsed.lat,
lng:parsed.lng,
display:`${parsed.lat}, ${parsed.lng}`
}
}

const query = `${cleaned}, New Jersey, USA`

const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`

const res=await fetch(url)

const data=await res.json()

if(!data.length) throw new Error("Location not found")

const best=data[0]

return {
lat:parseFloat(best.lat),
lng:parseFloat(best.lon),
display:best.display_name
}

}

async function reverseGeocode(lat,lng){

const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`

const res=await fetch(url)
const data=await res.json()

const addr=data.address||{}

const town=
addr.city||
addr.town||
addr.village||
addr.county||
"Unknown"

return {
town,
zip:addr.postcode||"",
county:addr.county||"",
address:data.display_name
}

}

function classifyVenue(tags){

const amenity=(tags.amenity||"").toLowerCase()
const name=(tags.name||"").toLowerCase()

if(amenity==="nightclub") return "Club"
if(amenity==="pub") return "Pub"
if(amenity==="bar") return "Bar"

if(name.includes("tavern")) return "Tavern"
if(name.includes("lounge")) return "Lounge"
if(name.includes("arcade")) return "Bar Arcade"

if(amenity==="restaurant") return "Restaurant"

return "Venue"
}

async function searchNearbyPlaces(lat,lng,radius=4000){

const query=`
[out:json][timeout:25];
(
node["amenity"](around:${radius},${lat},${lng});
way["amenity"](around:${radius},${lat},${lng});
relation["amenity"](around:${radius},${lat},${lng});
);
out center tags;
`

const res=await fetch("https://overpass-api.de/api/interpreter",{
method:"POST",
body:query
})

const data=await res.json()

return data.elements
.map(el=>{

const tags=el.tags||{}

const placeLat=el.lat ?? el.center?.lat
const placeLng=el.lon ?? el.center?.lon

if(!tags.name) return null
if(!placeLat||!placeLng) return null

return{
name:tags.name,
type:classifyVenue(tags),
lat:placeLat,
lng:placeLng,
address:
[
tags["addr:housenumber"],
tags["addr:street"],
tags["addr:city"]
].filter(Boolean).join(" ")
}

})
.filter(Boolean)

}

function renderPlaces(center,area,places){

const sorted=places
.map(p=>({...p,distance:milesBetween(center.lat,center.lng,p.lat,p.lng)}))
.sort((a,b)=>a.distance-b.distance)
.slice(0,20)

if(!sorted.length){
els.results.innerHTML=`<div class="card">No venues found.</div>`
return
}

els.results.innerHTML=sorted.map(p=>{

const mapLink=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+" "+area.town)}`

return`
<div class="card">

<h3>${escapeHtml(p.name)}</h3>

<p><b>Type:</b> ${p.type}</p>
<p><b>Town:</b> ${area.town}</p>
<p><b>Distance:</b> ${p.distance.toFixed(1)} miles</p>

${p.address?`<p><b>Address:</b> ${p.address}</p>`:""}

<div class="result-links">

<a href="${mapLink}" target="_blank">Directions</a>

</div>

</div>
`

}).join("")

}

async function soloSearch(){

const q=els.soloQuery.value.trim()

if(!q){
alert("Enter a town")
return
}

els.results.innerHTML="Searching..."

try{

const center=await geocodeAddress(q)

const area=await reverseGeocode(center.lat,center.lng)

const places=await searchNearbyPlaces(center.lat,center.lng)

renderPlaces(center,area,places)

}catch(err){

els.results.innerHTML=`<div class="card error-card">${err.message}</div>`

}

}

async function meetInMiddle(){

const a=els.locA.value.trim()
const b=els.locB.value.trim()

if(!a||!b){
alert("Enter both locations")
return
}

els.results.innerHTML="Calculating..."

try{

const geoA=await geocodeAddress(a)
const geoB=await geocodeAddress(b)

const mid=midpoint(geoA,geoB)

const area=await reverseGeocode(mid.lat,mid.lng)

const places=await searchNearbyPlaces(mid.lat,mid.lng)

renderPlaces(mid,area,places)

}catch(err){

els.results.innerHTML=`<div class="card error-card">${err.message}</div>`

}

}

async function groupCenter(){

const raw=els.groupList.value

const lines=raw.split("\n").map(x=>x.trim()).filter(Boolean)

if(lines.length<2){
alert("Enter at least 2 locations")
return
}

els.results.innerHTML="Calculating group midpoint..."

try{

const points=[]

for(const line of lines){
points.push(await geocodeAddress(line))
}

const mid=centroid(points)

const area=await reverseGeocode(mid.lat,mid.lng)

const places=await searchNearbyPlaces(mid.lat,mid.lng)

renderPlaces(mid,area,places)

}catch(err){

els.results.innerHTML=`<div class="card error-card">${err.message}</div>`

}

}

function generateNightPlan(){

const q=els.aiPrompt.value.trim()

if(!q){
alert("Enter prompt")
return
}

els.results.innerHTML=`
<div class="card">
<b>Prompt:</b> ${escapeHtml(q)}
<br><br>
Try searching Hoboken, NJ
</div>
`

}

function wireTabs(){

document.querySelectorAll(".tab-btn").forEach(btn=>{

btn.addEventListener("click",()=>{

document.querySelectorAll(".tab-btn")
.forEach(b=>b.classList.remove("active-tab"))

btn.classList.add("active-tab")

const tab=btn.dataset.tab

document.querySelectorAll(".tab-panel")
.forEach(p=>p.classList.remove("active-panel"))

document.getElementById("panel-"+tab)
.classList.add("active-panel")

})

})

}

function loadStarterTowns(){

STARTER_TOWNS.forEach(town=>{

const btn=document.createElement("button")

btn.className="starter-chip"

btn.textContent=town.replace(", NJ","")

btn.onclick=()=>{
els.soloQuery.value=town
soloSearch()
}

els.starterTowns.appendChild(btn)

})

}

els.searchBtn.onclick=soloSearch
els.middleBtn.onclick=meetInMiddle
els.groupBtn.onclick=groupCenter
els.aiBtn.onclick=generateNightPlan

wireTabs()
loadStarterTowns()

})
  
