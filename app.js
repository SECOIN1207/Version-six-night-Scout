document.addEventListener("DOMContentLoaded",()=>{

const $=(id)=>document.getElementById(id)

let map
let searchRunning=false

let venues=[]

const NJ_CITIES=[
"Newark NJ",
"Hoboken NJ",
"Jersey City NJ",
"Asbury Park NJ",
"Point Pleasant Beach NJ",
"Seaside Heights NJ",
"Wildwood NJ",
"Atlantic City NJ",
"Red Bank NJ",
"Morristown NJ",
"Montclair NJ"
]


function initMap(lat,lng){

const center={lat,lng}

map=new google.maps.Map(
$("mapPreview"),
{zoom:12,center}
)

new google.maps.Marker({
position:center,
map,
title:"Meet point"
})

}


function midpoint(coords){

const lat=coords.reduce((s,c)=>s+c.lat,0)/coords.length
const lng=coords.reduce((s,c)=>s+c.lng,0)/coords.length

return{lat,lng}

}


async function geocode(address){

return new Promise((resolve,reject)=>{

const geocoder=new google.maps.Geocoder()

geocoder.geocode({address},(res,status)=>{

if(status!=="OK")return reject(status)

const loc=res[0].geometry.location

resolve({
lat:loc.lat(),
lng:loc.lng(),
address:res[0].formatted_address
})

})

})

}


function distance(a,b){

return google.maps.geometry.spherical.computeDistanceBetween(
new google.maps.LatLng(a.lat,a.lng),
new google.maps.LatLng(b.lat,b.lng)
)/1609

}



function renderVenues(list,mid){

const container=$("venueList")

container.innerHTML=""

list.forEach(v=>{

const dist=mid?distance(mid,v).toFixed(1):""

const card=document.createElement("div")

card.className="venue-card"

card.innerHTML=`

<h3>${v.name}</h3>

<div>${v.city}</div>

<div>${dist?dist+" miles from midpoint":""}</div>

<button onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(v.name+" "+v.city)}')">Directions</button>

<button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(v.name+" dj events")}')">DJ events</button>

`

container.appendChild(card)

})

}


async function searchNightlife(lat,lng){

const service=new google.maps.places.PlacesService(map)

const queries=[
"bar",
"nightclub",
"lounge",
"beach bar",
"dj club",
"casino club"
]

let results=[]

for(const q of queries){

const r=await new Promise(res=>{

service.textSearch({
location:{lat,lng},
radius:15000,
query:q
},(r)=>res(r||[]))

})

results=results.concat(r)

}

venues=results.map(v=>({

name:v.name,
city:v.formatted_address,
lat:v.geometry.location.lat(),
lng:v.geometry.location.lng()

}))

return venues

}


async function runSolo(){

if(searchRunning)return
searchRunning=true

const q=$("soloQuery").value

const g=await geocode(q)

initMap(g.lat,g.lng)

const list=await searchNightlife(g.lat,g.lng)

renderVenues(list)

searchRunning=false

}



async function runMiddle(){

if(searchRunning)return
searchRunning=true

const a=await geocode($("midA").value)
const b=await geocode($("midB").value)

const mid=midpoint([a,b])

initMap(mid.lat,mid.lng)

const list=await searchNightlife(mid.lat,mid.lng)

renderVenues(list,mid)

searchRunning=false

}



async function runGroup(){

if(searchRunning)return
searchRunning=true

const lines=$("groupList").value.split("\n").filter(x=>x.trim())

const geo=await Promise.all(lines.map(geocode))

const mid=midpoint(geo)

initMap(mid.lat,mid.lng)

const list=await searchNightlife(mid.lat,mid.lng)

renderVenues(list,mid)

searchRunning=false

}



$("runSolo").onclick=runSolo
$("runMiddle").onclick=runMiddle
$("runGroup").onclick=runGroup

})
