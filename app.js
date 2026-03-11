document.addEventListener("DOMContentLoaded", () => {

const $ = (id) => document.getElementById(id)

const els = {
soloQuery: $("soloQuery"),
locA: $("locA"),
locB: $("locB"),
groupList: $("groupList"),
results: $("results"),
searchBtn: $("searchBtn"),
middleBtn: $("middleBtn"),
groupBtn: $("groupBtn")
}

function milesBetween(a,b,c,d){
const R=3958.8
const toRad=(x)=>x*Math.PI/180
const dLat=toRad(c-a)
const dLon=toRad(d-b)
const x=Math.sin(dLat/2)**2+
Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2
return 2*R*Math.asin(Math.sqrt(x))
}

function midpoint(a,b){
return{
lat:(a.lat+b.lat)/2,
lng:(a.lng+b.lng)/2
}
}

function centroid(points){
return{
lat:points.reduce((s,p)=>s+p.lat,0)/points.length,
lng:points.reduce((s,p)=>s+p.lng,0)/points.length
}
}

async function geocode(q){

q=q.trim()

if(!q.toLowerCase().includes("nj"))
q=q+", New Jersey"

const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`

const r=await fetch(url)
const d=await r.json()

if(!d.length) throw Error("Location not found")

return{
lat:parseFloat(d[0].lat),
lng:parseFloat(d[0].lon),
display:d[0].display_name
}
}

async function reverse(lat,lng){

const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`

const r=await fetch(url)
const d=await r.json()

return{
town:d.address.city||d.address.town||d.address.village||"",
zip:d.address.postcode||"",
address:d.display_name||""
}
}

function classify(tags){

const name=(tags.name||"").toLowerCase()

if(tags.amenity==="bar") return "Bar"
if(tags.amenity==="pub") return "Pub"
if(tags.amenity==="nightclub") return "Club"

if(name.includes("sports")) return "Sports Bar"
if(name.includes("bar & grill")) return "Bar & Grill"
if(name.includes("pub & grill")) return "Pub & Grill"

if(tags.amenity==="restaurant") return "Restaurant"

return "Venue"
}

function isNightlife(tags){

const a=(tags.amenity||"").toLowerCase()

return(
a==="bar"||
a==="pub"||
a==="nightclub"||
(tags.name||"").toLowerCase().includes("bar")||
(tags.name||"").toLowerCase().includes("tavern")||
(tags.name||"").toLowerCase().includes("lounge")||
(tags.name||"").toLowerCase().includes("club")
)
}

function isRestaurant(tags){

return tags.amenity==="restaurant"
}

async function searchPlaces(lat,lng,mode){

const query=`
[out:json][timeout:25];
(
node["amenity"](around:3500,${lat},${lng});
way["amenity"](around:3500,${lat},${lng});
);
out center tags;
`

const r=await fetch("https://overpass-api.de/api/interpreter",{
method:"POST",
body:query
})

const d=await r.json()

const places=[]

for(const e of d.elements){

const tags=e.tags||{}

if(!tags.name) continue

const plat=e.lat??e.center?.lat
const plng=e.lon??e.center?.lon

if(!plat||!plng) continue

if(mode==="nightlife" && !isNightlife(tags)) continue
if(mode==="restaurants" && !isRestaurant(tags)) continue

const address=
[
tags["addr:housenumber"],
tags["addr:street"],
tags["addr:city"],
tags["addr:postcode"]
].filter(Boolean).join(" ")

if(!address) continue

places.push({
name:tags.name,
type:classify(tags),
lat:plat,
lng:plng,
address,
phone:tags.phone||"",
website:tags.website||"",
hours:tags.opening_hours||""
})
}

return places
}

function placeCard(p,center){

const dist=milesBetween(center.lat,center.lng,p.lat,p.lng)

const maps=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+" "+p.address)}`

const photos=`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.name+" "+p.address)}`

const menu=`https://www.google.com/search?q=${encodeURIComponent(p.name+" menu")}`

return`

<div class="card">

<h3>${p.name}</h3>

<p><b>Type:</b> ${p.type}</p>

<p><b>Distance:</b> ${dist.toFixed(1)} miles</p>

<p><b>Address:</b> ${p.address}</p>

<p><b>Hours:</b> ${p.hours||"Not listed"}</p>

<div class="result-links">

<a href="${maps}" target="_blank">Directions</a>

${p.phone?`<a href="tel:${p.phone}">Call</a>`:""}

<a href="${photos}" target="_blank">Photos</a>

<a href="${menu}" target="_blank">Menu</a>

</div>

</div>
`
}

function renderPlaces(center,places){

places.sort((a,b)=>milesBetween(center.lat,center.lng,a.lat,a.lng)-
milesBetween(center.lat,center.lng,b.lat,b.lng))

const top=places.slice(0,20)

els.results.innerHTML=
top.map(p=>placeCard(p,center)).join("")
}

async function solo(){

const q=els.soloQuery.value

if(!q) return alert("Enter location")

els.results.innerHTML="Searching..."

try{

const center=await geocode(q)

const places=await searchPlaces(center.lat,center.lng,"everything")

renderPlaces(center,places)

}catch(e){

els.results.innerHTML=e.message

}

}

async function meetMiddle(){

const a=els.locA.value
const b=els.locB.value

if(!a||!b) return alert("Enter both locations")

els.results.innerHTML="Calculating..."

try{

const g1=await geocode(a)
const g2=await geocode(b)

const mid=midpoint(g1,g2)

const places=await searchPlaces(mid.lat,mid.lng,"nightlife")

renderPlaces(mid,places)

}catch(e){

els.results.innerHTML=e.message

}

}

async function group(){

const lines=els.groupList.value.split("\n").filter(x=>x.trim())

if(lines.length<2) return alert("Enter 2+ locations")

els.results.innerHTML="Calculating..."

try{

const geos=[]

for(const l of lines){

geos.push(await geocode(l))

}

const mid=centroid(geos)

const places=await searchPlaces(mid.lat,mid.lng,"nightlife")

renderPlaces(mid,places)

}catch(e){

els.results.innerHTML=e.message

}

}

els.searchBtn?.addEventListener("click",solo)
els.middleBtn?.addEventListener("click",meetMiddle)
els.groupBtn?.addEventListener("click",group)

})setupStarterTowns();
});
