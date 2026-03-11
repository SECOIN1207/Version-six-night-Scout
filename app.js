document.addEventListener("DOMContentLoaded", () => {

const $ = (id)=>document.getElementById(id)

const els={
soloQuery:$("soloQuery"),
soloCrowd:$("soloCrowd"),
soloMusic:$("soloMusic"),
soloVenue:$("soloVenue"),
soloVibe:$("soloVibe"),
locA:$("locA"),
locB:$("locB"),
groupList:$("groupList"),
aiPrompt:$("aiPrompt"),
results:$("results"),
searchBtn:$("searchBtn"),
loadNJ:$("loadNJ"),
middleBtn:$("middleBtn"),
groupBtn:$("groupBtn"),
aiBtn:$("aiBtn")
}

/* ---------- helpers ---------- */

function escapeHtml(str){
return String(str||"")
.replaceAll("&","&amp;")
.replaceAll("<","&lt;")
.replaceAll(">","&gt;")
.replaceAll('"',"&quot;")
}

function normalize(t){
return String(t||"").toLowerCase().trim()
}

function milesBetween(lat1,lon1,lat2,lon2){
const R=3958.8
const dLat=(lat2-lat1)*Math.PI/180
const dLon=(lon2-lon1)*Math.PI/180

const a=
Math.sin(dLat/2)**2+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)**2

return 2*R*Math.asin(Math.sqrt(a))
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

/* ---------- town coordinates ---------- */

const towns={
"hoboken":{lat:40.7433,lng:-74.0288,zip:"07030"},
"weehawken":{lat:40.7695,lng:-74.0204,zip:"07086"},
"jersey city":{lat:40.7178,lng:-74.0431,zip:"07302"},
"newark":{lat:40.7357,lng:-74.1724,zip:"07105"},
"fairview":{lat:40.8126,lng:-73.9990,zip:"07022"},
"saddle brook":{lat:40.8995,lng:-74.0921,zip:"07663"},
"fort lee":{lat:40.8509,lng:-73.9701,zip:"07024"},
"asbury park":{lat:40.2204,lng:-74.0121,zip:"07712"},
"point pleasant":{lat:40.0912,lng:-74.0479,zip:"08742"},
"atlantic city":{lat:39.3643,lng:-74.4229,zip:"08401"}
}

/* ---------- venue database ---------- */

const venues=[

{name:"Ainsworth Hoboken",town:"Hoboken",lat:40.7397,lng:-74.0267,type:"restaurant bar",music:"dj",vibe:"waterfront",crowd:"30+",address:"310 Sinatra Dr Hoboken NJ"},
{name:"Blue Eyes Restaurant",town:"Hoboken",lat:40.7445,lng:-74.0257,type:"restaurant",music:"any",vibe:"waterfront",crowd:"30+",address:"525 Sinatra Dr Hoboken NJ"},
{name:"Halifax",town:"Hoboken",lat:40.7391,lng:-74.0283,type:"restaurant bar",music:"dj",vibe:"waterfront",crowd:"30+",address:"225 River St Hoboken NJ"},
{name:"Grand Vin",town:"Hoboken",lat:40.7486,lng:-74.0324,type:"lounge",music:"live music",vibe:"cheap drinks",crowd:"30+",address:"500 Grand St Hoboken NJ"},
{name:"Texas Arizona",town:"Hoboken",lat:40.7379,lng:-74.0295,type:"bar",music:"dj",vibe:"dancing",crowd:"20s",address:"76 River St Hoboken NJ"},

{name:"Son Cubano",town:"Weehawken",lat:40.7785,lng:-74.0078,type:"restaurant bar",music:"latin",vibe:"waterfront",crowd:"30+",address:"40 Riverwalk Pl Weehawken NJ"},
{name:"Blu on the Hudson",town:"Weehawken",lat:40.7718,lng:-74.0153,type:"restaurant bar",music:"dj",vibe:"waterfront",crowd:"30+",address:"1200 Harbor Blvd Weehawken NJ"},

{name:"Hudson & Co",town:"Jersey City",lat:40.7174,lng:-74.0353,type:"restaurant bar",music:"dj",vibe:"waterfront",crowd:"30+",address:"3 2nd St Jersey City NJ"},
{name:"Cellar 335",town:"Jersey City",lat:40.7219,lng:-74.0464,type:"lounge",music:"dj",vibe:"dancing",crowd:"30+",address:"335 Newark Ave Jersey City NJ"},

{name:"McGovern's Tavern",town:"Newark",lat:40.7369,lng:-74.1706,type:"tavern",music:"live music",vibe:"cheap drinks",crowd:"30+",address:"58 New St Newark NJ"},
{name:"Adega Grill",town:"Newark",lat:40.7282,lng:-74.1528,type:"restaurant bar",music:"latin",vibe:"dancing",crowd:"30+",address:"130 Ferry St Newark NJ"},

{name:"Ventanas",town:"Fort Lee",lat:40.8516,lng:-73.9735,type:"club",music:"dj",vibe:"rooftop",crowd:"30+",address:"200 Park Ave Fort Lee NJ"},

{name:"Stone Pony",town:"Asbury Park",lat:40.2208,lng:-73.9989,type:"club",music:"live music",vibe:"waterfront",crowd:"20s",address:"913 Ocean Ave Asbury Park NJ"},
{name:"Watermark",town:"Asbury Park",lat:40.2197,lng:-73.9982,type:"lounge",music:"dj",vibe:"waterfront",crowd:"30+",address:"800 Ocean Ave Asbury Park NJ"},

{name:"Jenkinsons",town:"Point Pleasant",lat:40.0942,lng:-74.0362,type:"club",music:"dj",vibe:"waterfront",crowd:"20s",address:"300 Ocean Ave Point Pleasant NJ"},
{name:"Martells Tiki Bar",town:"Point Pleasant",lat:40.0947,lng:-74.0358,type:"bar",music:"live music",vibe:"waterfront",crowd:"30+",address:"308 Boardwalk Point Pleasant NJ"},

{name:"HQ2 Nightclub",town:"Atlantic City",lat:39.3567,lng:-74.4283,type:"club",music:"dj",vibe:"rooftop",crowd:"20s",address:"500 Boardwalk Atlantic City NJ"}

]

/* ---------- render venue ---------- */

function venueCard(v,distance){

const map=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`
const photos=`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(v.name)}`
const search=`https://www.google.com/search?q=${encodeURIComponent(v.name+" "+v.town)}`

return `
<div class="card">
<h3>${escapeHtml(v.name)}</h3>
<p>
<b>Type:</b> ${v.type}<br>
<b>Town:</b> ${v.town}<br>
<b>Distance:</b> ${distance.toFixed(1)} miles
</p>

<div class="result-links">
<a href="${map}" target="_blank">Directions</a>
<a href="${photos}" target="_blank">Photos</a>
<a href="${search}" target="_blank">Search</a>
</div>
</div>
`
}

/* ---------- geocode town ---------- */

function geocode(text){

const t=normalize(text)

for(const k in towns){

if(t.includes(k)){
return{
lat:towns[k].lat,
lng:towns[k].lng,
display:k
}
}

}

throw new Error("Town not found")
}

/* ---------- solo search ---------- */

function soloSearch(){

const q=els.soloQuery.value

if(!q){
alert("Enter town or ZIP")
return
}

let geo

try{
geo=geocode(q)
}catch(e){
els.results.innerHTML=`<div class="card">Location not found</div>`
return
}

const results=venues
.map(v=>{
return{
...v,
distance:milesBetween(geo.lat,geo.lng,v.lat,v.lng)
}
})
.filter(v=>v.distance<15)
.sort((a,b)=>a.distance-b.distance)
.slice(0,15)

els.results.innerHTML=`
<h2>Results near ${geo.display}</h2>
${results.map(v=>venueCard(v,v.distance)).join("")}
`

}

/* ---------- midpoint ---------- */

function meetMiddle(){

const a=els.locA.value
const b=els.locB.value

if(!a||!b){
alert("Enter both towns")
return
}

try{

const geoA=geocode(a)
const geoB=geocode(b)

const mid=midpoint(geoA,geoB)

const results=venues
.map(v=>{
return{
...v,
distance:milesBetween(mid.lat,mid.lng,v.lat,v.lng)
}
})
.sort((a,b)=>a.distance-b.distance)
.slice(0,12)

els.results.innerHTML=`
<h2>Meet in the Middle</h2>
${results.map(v=>venueCard(v,v.distance)).join("")}
`

}catch(e){

els.results.innerHTML=`<div class="card">Could not calculate midpoint</div>`

}

}

/* ---------- group ---------- */

function groupCenter(){

const lines=els.groupList.value.split("\n").map(l=>l.trim()).filter(Boolean)

if(lines.length<2){
alert("Enter at least 2 towns")
return
}

try{

const geos=lines.map(geocode)

const mid=centroid(geos)

const results=venues
.map(v=>{
return{
...v,
distance:milesBetween(mid.lat,mid.lng,v.lat,v.lng)
}
})
.sort((a,b)=>a.distance-b.distance)
.slice(0,12)

els.results.innerHTML=`
<h2>Group Center</h2>
${results.map(v=>venueCard(v,v.distance)).join("")}
`

}catch(e){

els.results.innerHTML=`<div class="card">Group calculation failed</div>`

}

}

/* ---------- AI night plan ---------- */

function aiPlan(){

const prompt=normalize(els.aiPrompt.value)

let filtered=[...venues]

if(prompt.includes("water"))
filtered=filtered.filter(v=>v.vibe==="waterfront")

if(prompt.includes("dj"))
filtered=filtered.filter(v=>v.music==="dj")

if(prompt.includes("latin"))
filtered=filtered.filter(v=>v.music==="latin")

if(prompt.includes("cheap"))
filtered=filtered.filter(v=>v.vibe==="cheap drinks")

if(prompt.includes("rooftop"))
filtered=filtered.filter(v=>v.vibe==="rooftop")

filtered=filtered.slice(0,10)

els.results.innerHTML=`
<h2>Night Plan</h2>
${filtered.map(v=>venueCard(v,0)).join("")}
`

}

/* ---------- load ---------- */

function loadNJ(){

els.results.innerHTML=`
<div class="card">
<b>NightScout</b><br>
Use Solo, Middle, Group or AI to find nightlife.
</div>
`

}

/* ---------- events ---------- */

els.searchBtn.addEventListener("click",soloSearch)
els.middleBtn.addEventListener("click",meetMiddle)
els.groupBtn.addEventListener("click",groupCenter)
els.aiBtn.addEventListener("click",aiPlan)
els.loadNJ.addEventListener("click",loadNJ)

loadNJ()

})
