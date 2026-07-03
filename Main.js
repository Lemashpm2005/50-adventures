// ============================================================
// APP STATE
// ============================================================
const state = {
  noClicks: 0,
  currentGalleryIndex: 0,
  currentCardDateId: null,
};

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

function playAudio(el, options = {}) {
  const { startAt = 0, stopAfter = null, silenceOthers = false } = options;

  if (silenceOthers) {
    [$("birdAudio"), $("celebrationAudio"), $("drumrollAudio")].forEach((other) => {
      if (other !== el) {
        other.pause();
        other.currentTime = 0;
      }
    });
  }

  el.currentTime = startAt;
  el.play().catch(() => {
    /* autoplay blocked until a user gesture happens somewhere — that's fine */
  });

  clearTimeout(el._stopTimer);
  if (stopAfter) {
    el._stopTimer = setTimeout(() => {
      el.pause();
      el.currentTime = 0;
    }, stopAfter * 1000);
  }
}

// ============================================================
// STORAGE — IndexedDB for photos (localStorage is too small,
// ~5-10MB total, photos eat that up fast). localStorage is still
// used for tiny stuff like "liked" dates.
// ============================================================
const DB_NAME = "adventuresDB";
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("datePhotos")) {
        db.createObjectStore("datePhotos", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("gallery")) {
        db.createObjectStore("gallery", { keyPath: "key", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function idbGet(storeName, key) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

function idbPut(storeName, value) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function idbGetAll(storeName) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Couldn't save to localStorage", e);
  }
}
async function fileToDataURL(file) {
  let workingFile = file;

  const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
                 /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);

  if (isHeic) {
    if (!window.heic2any) {
      throw new Error("HEIC converter didn't load — check your internet connection and try again.");
    }
    try {
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
      workingFile = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error("HEIC conversion failed:", err);
      throw new Error("Couldn't convert that HEIC photo. Try re-saving it as JPG first.");
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(workingFile);
  });
}
// One-time migration: if photos were saved under the old
// localStorage keys during earlier testing, move them into
// IndexedDB so nothing gets lost, then clean up.
async function migrateOldLocalStoragePhotos() {
  const oldDatePhotos = readJSON("datePhotos", null);
  if (oldDatePhotos) {
    for (const id of Object.keys(oldDatePhotos)) {
      await idbPut("datePhotos", { id: Number(id), dataURL: oldDatePhotos[id] });
    }
    localStorage.removeItem("datePhotos");
  }
  const oldGallery = readJSON("galleryPhotos", null);
  if (oldGallery) {
    for (const item of oldGallery) {
      await idbPut("gallery", item);
    }
    localStorage.removeItem("galleryPhotos");
  }
}

async function getDatePhoto(id) {
  const record = await idbGet("datePhotos", id);
  return record ? record.dataURL : null;
}
async function saveDatePhoto(id, dataURL) {
  await idbPut("datePhotos", { id, dataURL });
}

async function loadGalleryFromDB() {
  const all = await idbGetAll("gallery");
  GALLERY.length = 0;
  all.forEach((item) => GALLERY.push(item));
}
async function addGalleryPhoto(photo, caption) {
  await idbPut("gallery", { photo, caption });
}

// ============================================================
// SCREEN 1 — TYPEWRITER OPENING
// ============================================================
function typeLine(el, text, speed) {
  return new Promise((resolve) => {
    el.classList.add("typing");
    let i = 0;
    const interval = setInterval(() => {
      el.textContent = text.slice(0, i + 1);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

async function runOpeningSequence() {
  const line1 = $("typewriterLine1");
  const line2 = $("typewriterLine2");
  await typeLine(line1, "Remember that day we accidentally survived Karura together?", 42);
  await new Promise((r) => setTimeout(r, 500));
  await typeLine(line2, "I had an idea...", 55);
  line2.classList.remove("typing");
}

// ============================================================
// SCREEN 3 — YES / NO CHASE
// ============================================================
const NO_TEXTS = ["❌ No", "Are you sure? 🥺", "You missed 😂", "Nice try", "I'm getting tired 😭", "Okay but really 👀", "Last chance to be silly"];

function moveNoButton() {
  const arena = $("yesnoArena");
  const btnNo = $("btnNo");
  const arenaRect = arena.getBoundingClientRect();
  const btnRect = btnNo.getBoundingClientRect();
  const maxLeft = Math.max(arenaRect.width - btnRect.width - 10, 10);
  const maxTop = Math.max(arenaRect.height - btnRect.height - 10, 10);
  btnNo.style.left = Math.random() * maxLeft + "px";
  btnNo.style.top = Math.random() * maxTop + "px";
  btnNo.style.right = "auto";
}

function handleNoClick() {
  state.noClicks++;
  const btnNo = $("btnNo");
  const btnYes = $("btnYes");

  btnNo.textContent = NO_TEXTS[Math.min(state.noClicks, NO_TEXTS.length - 1)];

  const shrink = Math.max(1 - state.noClicks * 0.08, 0.45);
  btnNo.style.transform = `scale(${shrink})`;
  btnNo.classList.remove("wobble");
  void btnNo.offsetWidth;
  btnNo.classList.add("wobble");

  moveNoButton();

  const grow = Math.min(1 + state.noClicks * 0.12, 2.2);
  btnYes.style.transform = `scale(${grow})`;
  btnYes.classList.remove("growing");
  void btnYes.offsetWidth;
  btnYes.classList.add("growing");

  if (state.noClicks >= 2) window.burstConfetti(30);
  if (state.noClicks >= 3 && !window._noRainStarted) {
    window._noRainStarted = true;
    window.startConfettiRain();
  }
}

function handleYesClick() {
  window.stopConfettiRain();
  window.burstConfetti(220);
  playAudio($("celebrationAudio"), { silenceOthers: true });
  $("sticker2").style.animation = "bob 0.3s ease-in-out infinite";
  setTimeout(() => {
    buildMap();
    buildGridDashboard();
    showScreen("screen-welcome");
  }, 900);
}

// ============================================================
// SCREEN 4 — TREASURE MAP & GRID VIEW
// ============================================================
function buildMap() {
  const pinsContainer = $("mapPins");
  const svg = $("mapPath");
  if (pinsContainer.dataset.built) return;
  pinsContainer.dataset.built = "1";

  const MAP_W = 3200;
  const MAP_H = 1400;
  svg.setAttribute("viewBox", `0 0 ${MAP_W} ${MAP_H}`);

  const points = [];
  const n = DATES.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 120 + t * (MAP_W - 240);
    const y = MAP_H / 2 + Math.sin(t * Math.PI * 4.5) * (MAP_H * 0.32) + (i % 2 === 0 ? 20 : -20);
    points.push({ x, y });
  }

  let pathD = `M ${points[0].x} ${points[0].y} `;
  for (let i = 1; i < points.length; i++) pathD += `L ${points[i].x} ${points[i].y} `;
  const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathEl.setAttribute("d", pathD);
  pathEl.setAttribute("fill", "none");
  pathEl.setAttribute("stroke", "#8A6D3B");
  pathEl.setAttribute("stroke-width", "5");
  pathEl.setAttribute("stroke-dasharray", "2 22");
  pathEl.setAttribute("stroke-linecap", "round");
  pathEl.setAttribute("opacity", "0.55");
  svg.appendChild(pathEl);

  DATES.forEach((date, i) => {
    const pin = document.createElement("div");
    pin.className = "map-pin" + (date.status === "completed" ? " completed" : "");
    pin.style.left = points[i].x + "px";
    pin.style.top = points[i].y + "px";
    pin.innerHTML = `
      <div class="pin-emoji">${date.emoji}<span class="pin-number">${date.id}</span></div>
      <div class="pin-label">${date.title}</div>
    `;
    pin.addEventListener("click", () => openCard(date.id));
    pinsContainer.appendChild(pin);
  });

  $("mapScroll").scrollLeft = 0;
}

function buildGridDashboard() {
  const gridContainer = $("gridEntries");
  gridContainer.innerHTML = "";
  DATES.forEach((date) => {
    const item = document.createElement("div");
    item.className = "grid-adventure-card" + (date.status === "completed" ? " completed" : "");
    item.innerHTML = `
      <span class="grid-card-emoji">${date.emoji}</span>
      <div class="grid-card-info">
        <h4>#${date.id}: ${date.title}</h4>
        <p>🕐 ${date.time}</p>
      </div>
    `;
    item.addEventListener("click", () => openCard(date.id));
    gridContainer.appendChild(item);
  });
}

function toggleAdventureLayout() {
  const mapScroll = $("mapScroll");
  const gridView = $("adventuresGridView");
  const toggleBtn = $("btnToggleLayout");

  if (gridView.classList.contains("hidden")) {
    mapScroll.classList.add("hidden");
    gridView.classList.remove("hidden");
    toggleBtn.textContent = "🗺️ View Map Trail";
  } else {
    gridView.classList.add("hidden");
    mapScroll.classList.remove("hidden");
    toggleBtn.textContent = "📋 View All List";
  }
}

// ============================================================
// DATE CARD MODAL
// ============================================================
function getLikedSet() {
  return new Set(readJSON("likedDates", []));
}
function saveLikedSet(set) {
  writeJSON("likedDates", [...set]);
}

async function openCard(id) {
  const date = DATES.find((d) => d.id === id);
  if (!date) return;
  state.currentCardDateId = id;

  $("cardFrontEmoji").textContent = date.emoji;
  $("cardFrontLabel").textContent = `Date #${date.id}`;

  $("cardBackEmoji").textContent = date.emoji;
  $("cardBackTitle").textContent = date.title;
  $("cardBackStatus").textContent = date.status === "completed" ? "✅ Completed" : "🗺️ Planned";
  $("cardBackMemory").textContent = date.memory;
  $("cardBackTime").textContent = "🕐 " + date.time;

  // Photo priority: preset photo (only Karura has one) → uploaded photo → empty fallback
  const photoWrap = $("cardBackPhoto").parentElement;
  const img = $("cardBackPhoto");
  photoWrap.classList.remove("img-fallback");

  const photoSrc = date.photo || (await getDatePhoto(id));
  if (photoSrc) {
    img.onerror = () => photoWrap.classList.add("img-fallback");
    img.src = photoSrc;
  } else {
    img.removeAttribute("src");
    photoWrap.classList.add("img-fallback");
  }

  const likeBtn = $("cardLikeBtn");
  const liked = getLikedSet();
  likeBtn.textContent = liked.has(id) ? "💚 Liked" : "I like this idea";
  likeBtn.onclick = () => {
    const set = getLikedSet();
    if (set.has(id)) {
      set.delete(id);
      likeBtn.textContent = "I like this idea";
    } else {
      set.add(id);
      likeBtn.textContent = "💚 Liked";
      window.burstConfetti(40);
    }
    saveLikedSet(set);
  };

  $("flipCard").classList.remove("flipped");
  $("cardModal").classList.add("active");
}

function closeCardModal() {
  $("cardModal").classList.remove("active");
}

async function handleCardPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file || state.currentCardDateId === null) return;

  const label = document.querySelector('label[for="cardPhotoInput"]');
  const originalLabelText = label.textContent;

  try {
    label.textContent = "Converting...";
    const dataURL = await fileToDataURL(file);
    await saveDatePhoto(state.currentCardDateId, dataURL);

    const photoWrap = $("cardBackPhoto").parentElement;
    const img = $("cardBackPhoto");
    photoWrap.classList.remove("img-fallback");
    img.src = dataURL;
    window.burstConfetti(50);
  } catch (err) {
    console.error("Card photo upload failed:", err);
    alert(err.message);
  } finally {
    label.textContent = originalLabelText;
    e.target.value = "";
  }
}

// ============================================================
// SCREEN 5 — GALLERY WALL
// ============================================================
async function buildGallery() {
  await loadGalleryFromDB();
  const wall = $("galleryWall");
  wall.innerHTML = "";

  if (GALLERY.length === 0) {
    wall.innerHTML = `<p class="gallery-empty">The wall is empty... pin a photo below to start the collection 📸</p>`;
    return;
  }

  GALLERY.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "wall-polaroid";
    card.style.transform = `rotate(${(i % 2 === 0 ? -1 : 1) * (4 + (i % 3) * 2)}deg)`;
    card.innerHTML = `
      <div class="tape"></div>
      <img src="${item.photo}" alt="memory" onerror="this.parentElement.classList.add('img-fallback')">
      <span class="fallback-emoji">💛</span>
      <p class="wall-caption">${item.caption}</p>
    `;
    card.addEventListener("click", () => openPhotoViewer(i));
    wall.appendChild(card);
  });
}
async function handlePhonePhotoUpload() {
  const fileInput = $("phonePhotoUpload");
  const captionInput = $("uploadCaption");
  const uploadBtn = $("btnSubmitUpload");
  const file = fileInput.files[0];

  if (!file) {
    alert("Pick a photo first!");
    return;
  }

  try {
    uploadBtn.textContent = "Converting...";
    uploadBtn.disabled = true;

    const dataURL = await fileToDataURL(file);
    await addGalleryPhoto(dataURL, captionInput.value.trim() || "A new memory!");

    fileInput.value = "";
    captionInput.value = "";
    window.burstConfetti(60);
    await buildGallery();
  } catch (err) {
    console.error("Gallery upload failed:", err);
    alert(err.message);
  } finally {
    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
  }
}

function openPhotoViewer(index) {
  if (!GALLERY.length) return;
  state.currentGalleryIndex = index;
  renderPhotoViewer();
  $("photoViewer").classList.add("active");
}
function renderPhotoViewer() {
  if (!GALLERY.length) return;
  const item = GALLERY[state.currentGalleryIndex];
  const img = $("photoViewerImg");
  img.onerror = () => { img.style.display = "none"; };
  img.style.display = "block";
  img.src = item.photo;
  $("photoViewerCaption").textContent = item.caption;
}
function closePhotoViewer() {
  $("photoViewer").classList.remove("active");
}
function shiftPhoto(delta) {
  if (!GALLERY.length) return;
  state.currentGalleryIndex = (state.currentGalleryIndex + delta + GALLERY.length) % GALLERY.length;
  renderPhotoViewer();
}

// ============================================================
// LOCKED SECRET CARD
// ============================================================
function openLockModal() {
  $("lockPromptView").classList.remove("hidden");
  $("lockNoteView").classList.add("hidden");
  $("lockInput").value = "";
  $("lockError").textContent = "";
  $("lockModal").classList.add("active");
  setTimeout(() => $("lockInput").focus(), 100);
}
function closeLockModal() {
  $("lockModal").classList.remove("active");
}
function tryUnlock() {
  const val = $("lockInput").value.trim().toLowerCase();
  if (val.includes("karura")) {
    $("lockPromptView").classList.add("hidden");
    $("lockNoteView").classList.remove("hidden");
    window.burstConfetti(80);
  } else {
    $("lockError").textContent = "Not quite — try again 🌿";
  }
}

// ============================================================
// SCREEN 6 — FINAL SLOT PICKER
// ============================================================
function openFinalScreen() {
  $("slotResult").textContent = "";
  $("slotReel").textContent = "?";
  $("slotReel").classList.remove("spinning");
  showScreen("screen-final");
}

function spinSlot() {
  const remaining = DATES.filter((d) => d.status !== "completed");
  if (remaining.length === 0) return;

  const reel = $("slotReel");
  reel.classList.add("spinning");
  $("slotResult").textContent = "";
   playAudio($("drumrollAudio"), { silenceOthers: true });

  let ticks = 0;
  const maxTicks = 22;
  const spinInterval = setInterval(() => {
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    reel.textContent = `${random.emoji} ${random.title}`;
    ticks++;
    if (ticks >= maxTicks) {
      clearInterval(spinInterval);
      reel.classList.remove("spinning");
      const winner = remaining[Math.floor(Math.random() * remaining.length)];
      reel.textContent = `${winner.emoji} ${winner.title}`;
      $("slotResult").textContent = `Adventure #${winner.id} it is. Let's go.`;
      window.burstConfetti(160);
    }
  }, 90);
}

// ============================================================
// WIRE UP EVENTS
// ============================================================
window.addEventListener("DOMContentLoaded", async () => {
  await migrateOldLocalStoragePhotos();
  runOpeningSequence();

  $("btnTellMeMore").addEventListener("click", () => {
    playAudio($("birdAudio"), { startAt: 10, stopAfter: 4 });
    showScreen("screen-second");
  });

  $("btnExperiment").addEventListener("click", () => showScreen("screen-yesno"));

  $("btnNo").addEventListener("click", handleNoClick);
  $("btnYes").addEventListener("click", handleYesClick);

  $("btnToggleLayout").addEventListener("click", toggleAdventureLayout);

  $("btnOpenGallery").addEventListener("click", () => {
    buildGallery();
    showScreen("screen-gallery");
  });
  $("btnCloseGallery").addEventListener("click", () => showScreen("screen-welcome"));
  $("btnSubmitUpload").addEventListener("click", handlePhonePhotoUpload);

  $("btnOpenFinal").addEventListener("click", openFinalScreen);
  $("btnCloseFinal").addEventListener("click", () => showScreen("screen-welcome"));
  $("btnSpin").addEventListener("click", spinSlot);

  // Flip card modal
  $("flipCard").querySelector(".flip-card-front").addEventListener("click", () => {
    $("flipCard").classList.add("flipped");
  });
  $("cardCloseBtn").addEventListener("click", closeCardModal);
  $("cardModal").querySelector(".modal-backdrop").addEventListener("click", closeCardModal);
  $("cardPhotoInput").addEventListener("change", handleCardPhotoUpload);

  // Locked card
  $("lockedCard").addEventListener("click", openLockModal);
  $("lockCloseBtn").addEventListener("click", closeLockModal);
  $("lockModal").querySelector(".modal-backdrop").addEventListener("click", closeLockModal);
  $("lockSubmitBtn").addEventListener("click", tryUnlock);
  $("lockInput").addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });

  // Photo viewer
  $("photoCloseBtn").addEventListener("click", closePhotoViewer);
  $("photoViewer").querySelector(".modal-backdrop").addEventListener("click", closePhotoViewer);
  $("photoPrevBtn").addEventListener("click", () => shiftPhoto(-1));
  $("photoNextBtn").addEventListener("click", () => shiftPhoto(1));
});