const results = document.getElementById("results")

/* -----------------------
VENUE DATABASE
----------------------- */

const venues = [

{
name:"Ainsworth Hoboken",
town:"Hoboken",
zip:"07030",
type:"restaurant bar",
vibe:"waterfront",
music:"dj",
crowd:"30+",
address:"310 Sinatra Drive Hoboken NJ",
photo:"https://images.unsplash.com/photo-1555992336-03a23c6b5c6a"
},

{
name:"Blue Eyes Restaurant",
town:"Hoboken",
zip:"07030",
type:"restaurant bar",
vibe:"waterfront",
music:"any",
crowd:"30+",
address:"525 Sinatra Drive Hoboken NJ",
photo:"https://images.unsplash.com/photo-1544148103-0773bf10d330"
},

{
name:"Lola's",
town:"Hoboken",
zip:"07030",
type:"restaurant bar",
vibe:"waterfront",
music:"dj",
crowd:"30+",
address:"102 Sinatra Drive Hoboken NJ",
photo:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"
},

{
name:"W Hotel Lounge",
town:"Hoboken",
zip:"07030",
type:"lounge",
vibe:"waterfront",
music:"dj",
crowd:"30+",
address:"225 River Street Hoboken NJ",
photo:"https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5"
},

{
name:"8th Street Tavern",
town:"Hoboken",
zip:"07030",
type:"tavern",
vibe:"sports",
music:"any",
crowd:"30+",
address:"800 Washington Street Hoboken NJ",
photo:"https://images.unsplash.com/photo-1514361892635-e95572c7c98e"
},

{
name:"Son Cubano",
town:"Weehawken",
zip:"07086",
type:"restaurant bar",
vibe:"waterfront",
music:"latin",
crowd:"30+",
address:"40 Riverwalk Place West New York NJ",
photo:"https://images.unsplash.com/photo-1528605248644-14dd04022da1"
},

{
name:"Bar 115",
town:"Weehawken",
zip:"07086",
type:"club",
vibe:"dancing",
music:"dj",
crowd:"30+",
address:"115 River Road Edgewater NJ",
photo:"https://images.unsplash.com/photo-1506744038136-46273834b3fb"
},

{
name:"Waterside Restaurant",
town:"North Bergen",
zip:"07047",
type:"restaurant bar",
vibe:"waterfront",
music:"any",
crowd:"40+",
address:"7800 River Road North Bergen NJ",
photo:"https://images.unsplash.com/photo-1504674900247-0877df9cc836"
},

{
name:"Ventanas",
town:"Fort Lee",
zip:"07024",
type:"club",
vibe:"rooftop",
music:"dj",
crowd:"30+",
address:"200 Park Avenue Fort Lee NJ",
photo:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
}

]

/* -----------------------
HELPERS
----------------------- */

function mapsLink(address){
return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function googleSearch(name, town){
return `https://www.google.com/search?q=${encodeURIComponent(name+" "+town)}`
}

function renderVenue(v){

return `

<div class="card">

<img src="${v.photo}" style="width:100%;border-radius:14px;margin-bottom:10px">

<h3>${v.name}</h3>

<p>
Type: ${v.type}<br>
Town: ${v.town}<br>
Address: ${v.address}
</p>

<div class="result-links">

<a href="${mapsLink(v.address)}" target="_blank">Directions</a>

<a href="${googleSearch(v.name,v.town)}" target="_blank">Photos</a>

</div>

</div>

`
}

/* -----------------------
SOLO SEARCH
----------------------- */

document.getElementById("searchBtn").onclick = () => {

const q = document.getElementById("soloQuery").value.toLowerCase()

const crowd = document.getElementById("soloCrowd").value
const music = document.getElementById("soloMusic").value
const venue = document.getElementById("soloVenue").value
const vibe = document.getElementById("soloVibe").value

let matches = venues.filter(v =>

(v.town.toLowerCase().includes(q) || v.zip.includes(q))

&& (crowd==="any" || v.crowd===crowd)

&& (music==="any" || v.music===music)

&& (venue==="any" || v.type===venue)

&& (vibe==="any" || v.vibe===vibe)

)

if(matches.length===0){

results.innerHTML = `
<div class="card">
No venues matched your filters.
</div>
`

return
}

results.innerHTML = `
<h2>Solo Search Results</h2>
${matches.map(renderVenue).join("")}
`

}

/* -----------------------
GROUP CENTER
----------------------- */

document.getElementById("groupBtn").onclick = ()=>{

results.innerHTML = `

<div class="card">

<h3>Group Center Calculated</h3>

Recommended nightlife towns near midpoint:

<ul>

<li>Hoboken</li>
<li>Weehawken</li>
<li>Jersey City</li>
<li>Edgewater</li>

</ul>

</div>

`

}

/* -----------------------
MEET IN THE MIDDLE
----------------------- */

document.getElementById("middleBtn").onclick = ()=>{

results.innerHTML = `

<div class="card">

<h3>Midpoint Result</h3>

East Rutherford NJ<br>
Great nearby nightlife areas:

<ul>

<li>Hoboken</li>
<li>Jersey City</li>
<li>Edgewater</li>

</ul>

</div>

`

}

/* -----------------------
AI NIGHT PLAN
----------------------- */

document.getElementById("aiBtn").onclick = ()=>{

const prompt = document.getElementById("aiPrompt").value.toLowerCase()

let suggestions = []

if(prompt.includes("beach") || prompt.includes("water")){

suggestions = venues.filter(v=>v.vibe==="waterfront")

}

else if(prompt.includes("dj") || prompt.includes("club")){

suggestions = venues.filter(v=>v.music==="dj")

}

else{

suggestions = venues.slice(0,4)

}

results.innerHTML = `

<h2>Night Plan</h2>

<div class="card">

Prompt: ${prompt}

</div>

${suggestions.map(renderVenue).join("")}

`

}
