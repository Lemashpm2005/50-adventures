// ============================================================
// THE 50 ADVENTURES
// Only Date #1 (Karura) ships with a real photo. Every other
// date, and the gallery wall, start empty and only show a photo
// once you or her upload one — that's saved in the browser via
// localStorage (see main.js).
// ============================================================

const DATES = [
  {
    id: 1, emoji: "🌳", title: "Karura Picnic", short: "Karura",
    status: "completed",
    memory: "The one that started all this.",
    time: "Saturday morning",
    photo: "assets/images/chat.png"
  },
  { id: 2, emoji: "🦒", title: "Giraffe Centre", time: "Weekend morning" },
  { id: 3, emoji: "🎳", title: "Village Market Bowling", time: "Friday evening" },
  { id: 4, emoji: "🎡", title: "Two Rivers Ferris Wheel", time: "Weekend afternoon" },
  { id: 5, emoji: "⛰️", title: "Ngong Hills Hike", time: "Saturday, early" },
  { id: 6, emoji: "🚴", title: "Karura Bike Ride", time: "Sunday morning" },
  { id: 7, emoji: "🛍️", title: "Thrift Shopping in Toi", time: "Saturday afternoon" },
  { id: 8, emoji: "🍦", title: "Ice Cream Walk", time: "Any evening" },
  { id: 9, emoji: "🍵", title: "Tea Farm Tour", time: "Saturday morning", memory: "Instead of berry picking." },
  { id: 10, emoji: "🌆", title: "Rooftop Dinner", time: "Saturday night" },
  { id: 11, emoji: "🌇", title: "Sunset at KICC Helipad", time: "Golden hour (if open)" },
  { id: 12, emoji: "🎨", title: "Paint & Sip", time: "Weekend evening" },
  { id: 13, emoji: "🎬", title: "Movie Night", time: "Any night" },
  { id: 14, emoji: "♟️", title: "Board Game Café", time: "Rainy afternoon" },
  { id: 15, emoji: "🔐", title: "Escape Room", time: "Weekend afternoon" },
  { id: 16, emoji: "🏎️", title: "Go Karting", time: "Saturday afternoon" },
  { id: 17, emoji: "☕", title: "Coffee Tasting", time: "Weekend morning" },
  { id: 18, emoji: "🚗", title: "Road Trip to Naivasha", time: "Full weekend day" },
  { id: 19, emoji: "⛺", title: "Camping", time: "Overnight" },
  { id: 20, emoji: "🕹️", title: "Arcade Games", time: "Any evening" },
  { id: 21, emoji: "🐾", title: "Animal Orphanage", time: "Weekend morning" },
  { id: 22, emoji: "🦁", title: "Nairobi National Park Drive", time: "Early morning" },
  { id: 23, emoji: "🚵", title: "Hell's Gate Cycling", time: "Full day" },
  { id: 24, emoji: "🚣", title: "Lake Naivasha Boat Ride", time: "Afternoon" },
  { id: 25, emoji: "🍖", title: "Nyama Choma Night", time: "Any evening" },
  { id: 26, emoji: "🎤", title: "Karaoke Night", time: "Friday night" },
  { id: 27, emoji: "🧗", title: "Rock Climbing", time: "Saturday" },
  { id: 28, emoji: "🏊", title: "Pool Day", time: "Sunny afternoon" },
  { id: 29, emoji: "🛶", title: "Kayaking", time: "Weekend morning" },
  { id: 30, emoji: "🌸", title: "Botanical Garden Walk", time: "Any afternoon" },
  { id: 31, emoji: "🌭", title: "Street Food Crawl", time: "Evening" },
  { id: 32, emoji: "🎪", title: "Agricultural Show / Carnival", time: "Seasonal weekend" },
  { id: 33, emoji: "📚", title: "Bookshop & Café Date", time: "Lazy afternoon" },
  { id: 34, emoji: "🖼️", title: "Art Gallery Visit", time: "Weekend afternoon" },
  { id: 35, emoji: "🏛️", title: "National Museum", time: "Weekend afternoon" },
  { id: 36, emoji: "🐘", title: "Elephant Orphanage", time: "Morning" },
  { id: 37, emoji: "🌌", title: "Stargazing Night", time: "Clear night" },
  { id: 38, emoji: "🍰", title: "Baking Together", time: "Sunday afternoon" },
  { id: 39, emoji: "🚲", title: "Uhuru Park Cycling", time: "Weekend morning" },
  { id: 40, emoji: "🎣", title: "Fishing at a Dam", time: "Early morning" },
  { id: 41, emoji: "🏋️", title: "Try a Fitness Class", time: "Any day" },
  { id: 42, emoji: "🧘", title: "Sunrise Yoga", time: "Sunrise" },
  { id: 43, emoji: "🏖️", title: "Diani Beach Weekend", time: "Long weekend" },
  { id: 44, emoji: "🚂", title: "SGR to Mombasa", time: "Weekend trip" },
  { id: 45, emoji: "🦓", title: "Maasai Mara Weekend", time: "Long weekend" },
  { id: 46, emoji: "⛳", title: "Mini Golf", time: "Any afternoon" },
  { id: 47, emoji: "🎆", title: "Festival / Fireworks Night", time: "Seasonal" },
  { id: 48, emoji: "🍫", title: "Chocolate & Dessert Tasting", time: "Evening" },
  { id: 49, emoji: "🧩", title: "Puzzle & Trivia Night In", time: "Any night" },
  { id: 50, emoji: "💌", title: "Surprise Date, Her Pick", time: "Whenever she wants" },
];

// Fill in defaults so every entry has the same shape.
// NOTE: we deliberately do NOT assign a default `photo` here —
// every date besides #1 stays photo-less until someone uploads
// one from the card itself (stored in localStorage, see main.js).
DATES.forEach(d => {
  if (!d.status) d.status = "planned";
  if (!d.memory) d.memory = "Not written yet — this one's still ahead of us.";
});

// The wall starts completely empty. Photos only appear once
// uploaded from the gallery screen — nothing is seeded here.
let GALLERY = [];