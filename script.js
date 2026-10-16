/* ==================================================
   VOID CASE — НАСТРОЙКИ
   ================================================== */
const CONFIG = {
  // Положи картинку рядом с index.html.
  image: "characters.png",
  casePrice: 100,
  startingBalance: 1000,
  // Автоматическое разделение картинки на равные части.
  // Для 7 персонажей в одну линию: columns: 7, rows: 1.
  grid: {
    columns: 7,
    rows: 1
  },
  // Если персонажи расположены неравномерно,
  // укажи индивидуальные координаты crop для каждого.
  //
  // x = координата слева
  // y = координата сверху
  // w = ширина области
  // h = высота области
  //
  // Все значения в пикселях исходной картинки.
  // null означает автоматическое разделение по сетке.
  
characters: [
  {
    id: "david",
    name: "Давид",
    description: "Кролик, лидер трёхсотых и носитель трёх божественных реликвий",
    rarity: "MYTHIC",
    chance: 2,
    color: "#ff3d5a",
    crop: { x: 18, y: 35, w: 282, h: 265 }
  },
  {
    id: "pasha",
    name: "Паша",
    description: "Противник трёхсотых, переживший разгром",
    rarity: "RARE",
    chance: 20,
    color: "#63a5ff",
    crop: { x: 325, y: 30, w: 285, h: 270 }
  },
  {
    id: "misha",
    name: "Миша",
    description: "Тактик, участник спасения и предатель",
    rarity: "LEGENDARY",
    chance: 8,
    color: "#ffb347",
    crop: { x: 640, y: 30, w: 285, h: 270 }
  },
  {
    id: "kirill",
    name: "Кирилл",
    description: "Пукадо / Калифа — главный враг Давида",
    rarity: "LEGENDARY",
    chance: 10,
    color: "#ffb347",
    crop: { x: 950, y: 30, w: 285, h: 270 }
  },
  {
    id: "samson-cat",
    name: "Самсон Кот",
    description: "Смторит в стенку. Выходит только к Мише",
    rarity: "EPIC",
    chance: 15,
    color: "#bd82ff",
    crop: { x: 325, y: 655, w: 285, h: 275 }
  },
  {
    id: "syoma-cat",
    name: "Сёма Кот",
    description: "Бежит к маме",
    rarity: "EPIC",
    chance: 15,
    color: "#bd82ff",
    crop: { x: 640, y: 655, w: 285, h: 275 }
  },
  {
    id: "andrey",
    name: "Андрей",
    description: "Участник спасения трёхсотых и создатель чуда",
    rarity: "LEGENDARY",
    chance: 30,
    color: "#ffb347",
    crop: { x: 18, y: 655, w: 282, h: 275 }
  }
]
};
/* ==================================================
   ОСНОВНОЙ КОД
   ================================================== */
const $ = selector => document.querySelector(selector);
const track = $("#rouletteTrack");
const viewport = $("#rouletteWindow");
const openButton = $("#openCase");
const openButtonText = $("#openButtonText");
let balance = CONFIG.startingBalance;
let busy = false;
let imageReady = false;
let sourceImage = new Image();
let cropRects = [];
let history = [];
let animationTimer = null;
let toastTimer = null;
const money = value =>
  Math.round(value).toLocaleString("ru-RU");
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function rarityColor(index) {
  return CONFIG.characters[index].color || "#9296a5";
}
function updateBalance() {
  $("#balance").textContent = `${money(balance)} ₽`;
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2600);
}
/* ==================================================
   КАДРИРОВАНИЕ ОБЩЕЙ КАРТИНКИ
   ================================================== */
function calculateCropRects() {
  const width = sourceImage.naturalWidth;
  const height = sourceImage.naturalHeight;
  const columns = Math.max(1, CONFIG.grid.columns);
  const rows = Math.max(1, CONFIG.grid.rows);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  return CONFIG.characters.map((character, index) => {
    const crop = character.crop;
    if (
      crop &&
      Number.isFinite(crop.x) &&
      Number.isFinite(crop.y) &&
      Number.isFinite(crop.w) &&
      Number.isFinite(crop.h)
    ) {
      const x = clamp(crop.x, 0, width - 1);
      const y = clamp(crop.y, 0, height - 1);
      return {
        x,
        y,
        w: clamp(crop.w, 1, width - x),
        h: clamp(crop.h, 1, height - y)
      };
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: column * cellWidth,
      y: row * cellHeight,
      w: Math.min(cellWidth, width - column * cellWidth),
      h: Math.min(cellHeight, height - row * cellHeight)
    };
  });
}
/*
  Создаёт отдельный портрет из общей картинки.
  Исходный файл изображения не изменяется.
*/
function createPortrait(index) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 380;
  canvas.className = "portrait";
  const ctx = canvas.getContext("2d");
  if (imageReady && cropRects[index]) {
    const crop = cropRects[index];
    // Сохраняем пропорции кадра и обрезаем по центру.
    // Чтобы показать полный силуэт, можно задать более
    // высокую область crop в настройках CONFIG.
    const sourceRatio = crop.w / crop.h;
    const targetRatio = canvas.width / canvas.height;
    let sx = crop.x;
    let sy = crop.y;
    let sw = crop.w;
    let sh = crop.h;
    if (sourceRatio > targetRatio) {
      sw = crop.h * targetRatio;
      sx += (crop.w - sw) / 2;
    } else {
      sh = crop.w / targetRatio;
      sy += (crop.h - sh) / 2;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      sourceImage,
      sx, sy, sw, sh,
      0, 0, canvas.width, canvas.height
    );
  } else {
    drawPlaceholder(ctx, index);
  }
  return canvas;
}
function drawPlaceholder(ctx, index) {
  const width = 300;
  const height = 380;
  const colors = [
    ["#292b40", "#11121b"],
    ["#33263f", "#11111a"],
    ["#21384a", "#11111a"],
    ["#253149", "#11111a"],
    ["#40274d", "#11111a"],
    ["#352746", "#11111a"],
    ["#49402b", "#11111a"]
  ];
  const pair = colors[index % colors.length];
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, pair[0]);
  gradient.addColorStop(1, pair[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#ffffff22";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(width / 2, height * 0.4, 65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(65, 320);
  ctx.lineTo(105, 220);
  ctx.lineTo(195, 220);
  ctx.lineTo(235, 320);
  ctx.stroke();
  ctx.fillStyle = "#ffffff88";
  ctx.textAlign = "center";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(
    `CHARACTER ${String(index + 1).padStart(2, "0")}`,
    width / 2,
    355
  );
}
/* ==================================================
   СОЗДАНИЕ КАРТОЧЕК
   ================================================== */
function buildCard(index, mode = "grid") {
  const character = CONFIG.characters[index];
  const card = document.createElement("article");
  card.className = mode === "roulette"
    ? "roulette-card"
    : "character-card";
  card.style.setProperty("--rarity-color", rarityColor(index));
  const portrait = createPortrait(index);
  if (mode === "roulette") {
    const art = document.createElement("div");
    art.className = "portrait-container";
    // CSS размещает изображение на всю карточку.
    portrait.classList.remove("portrait");
    portrait.style.width = "100%";
    portrait.style.height = "100%";
    portrait.style.objectFit = "cover";
    art.style.position = "absolute";
    art.style.inset = "0";
    art.appendChild(portrait);
    const shade = document.createElement("div");
    shade.className = "card-shade";
    const rarity = document.createElement("span");
    rarity.className = "roulette-rarity";
    rarity.style.color = rarityColor(index);
    rarity.textContent = character.rarity;
    const name = document.createElement("span");
    name.className = "roulette-name";
    name.textContent = character.name;
    card.append(art, shade, rarity, name);
    return card;
  }
  const art = document.createElement("div");
  art.className = "character-art";
  portrait.classList.remove("portrait");
  art.appendChild(portrait);
  const info = document.createElement("div");
  info.className = "character-info";
  const number = document.createElement("span");
  number.className = "character-number";
  number.textContent =
    `ITEM / ${String(index + 1).padStart(2, "0")}`;
  const name = document.createElement("strong");
  name.className = "character-name";
  name.textContent = character.name;
  const rarity = document.createElement("span");
  rarity.className = "character-rarity";
  rarity.textContent = character.rarity;
  const chance = document.createElement("span");
  chance.className = "character-chance";
  chance.textContent = `${getChance(index).toFixed(1)}%`;
  info.append(number, name, rarity, chance);
  card.append(art, info);
  return card;
}
function getChance(index) {
  const weights = CONFIG.characters.map(character =>
    Math.max(0, Number(character.chance) || 0)
  );
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return 100 / CONFIG.characters.length;
  }
  return weights[index] / total * 100;
}
function buildContents() {
  const grid = $("#characterGrid");
  grid.replaceChildren();
  CONFIG.characters.forEach((character, index) => {
    grid.appendChild(buildCard(index, "grid"));
  });
}
/* ==================================================
   РУЛЕТКА
   ================================================== */
const CARD_COUNT = 55;
const WINNER_SLOT = 43;
function buildRoulette(winnerIndex = null) {
  track.replaceChildren();
  for (let i = 0; i < CARD_COUNT; i++) {
    let characterIndex;
    if (i === WINNER_SLOT && winnerIndex !== null) {
      characterIndex = winnerIndex;
    } else {
      characterIndex = Math.floor(
        Math.random() * CONFIG.characters.length
      );
    }
    track.appendChild(buildCard(characterIndex, "roulette"));
  }
  track.style.transition = "none";
  track.style.transform = "translateX(0px)";
}
function chooseCharacter() {
  const weights = CONFIG.characters.map(character =>
    Math.max(0, Number(character.chance) || 0)
  );
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Math.floor(Math.random() * CONFIG.characters.length);
  }
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      return i;
    }
  }
  return weights.length - 1;
}
function startRoulette(winnerIndex) {
  buildRoulette(winnerIndex);
  // Сбрасываем положение перед новой прокруткой.
  track.style.transition = "none";
  track.style.transform = "translateX(0px)";
  const cards = track.querySelectorAll(".roulette-card");
  const targetCard = cards[WINNER_SLOT];
  if (!targetCard) {
    finishRoulette(winnerIndex);
    return;
  }
  const cardCenter =
    targetCard.offsetLeft + targetCard.offsetWidth / 2;
  const viewportCenter = viewport.clientWidth / 2;
  const targetX = Math.max(0, cardCenter - viewportCenter);
  openButton.disabled = true;
  openButtonText.textContent = "ОТКРЫВАЕМ...";
  busy = true;
  $("#result").hidden = true;
  // Два кадра нужны, чтобы браузер зафиксировал начальное положение.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.style.transition =
        "transform 5.5s cubic-bezier(.08,.72,.12,1)";
      track.style.transform = `translateX(${-targetX}px)`;
    });
  });
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    track.removeEventListener("transitionend", onTransitionEnd);
    clearTimeout(animationTimer);
    finishRoulette(winnerIndex);
  }
  function onTransitionEnd(event) {
    if (
      event.target === track &&
      event.propertyName === "transform"
    ) {
      finish();
    }
  }
  track.addEventListener("transitionend", onTransitionEnd);
  // Запасной вариант для браузеров, не отправивших событие.
  animationTimer = setTimeout(finish, 6500);
}
function finishRoulette(winnerIndex) {
  const character = CONFIG.characters[winnerIndex];
  showResult(winnerIndex);
  addHistory(winnerIndex);
  busy = false;
  openButton.disabled = false;
  openButtonText.textContent = "ОТКРЫТЬ ЕЩЁ";
  showToast(`Выпал персонаж: ${character.name}`);
}
/* ==================================================
   РЕЗУЛЬТАТ
   ================================================== */
function showResult(index) {
  const character = CONFIG.characters[index];
  const resultImage = $("#resultImage");
  resultImage.replaceChildren(createPortrait(index));
  resultImage.style.setProperty(
    "--rarity-color",
    rarityColor(index)
  );
  $("#resultName").textContent = character.name;
  const rarity = $("#resultRarity");
  rarity.textContent = character.rarity;
  rarity.style.color = rarityColor(index);
  rarity.style.setProperty("--rarity-color", rarityColor(index));
  $("#result").hidden = false;
}
/* ==================================================
   ИСТОРИЯ
   ================================================== */
function addHistory(index) {
  history.unshift({
    index,
    time: new Date()
  });
  history = history.slice(0, 10);
  renderHistory();
}
function renderHistory() {
  const list = $("#historyList");
  list.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent =
      "Здесь будут отображаться результаты открытия кейсов.";
    list.appendChild(empty);
    return;
  }
  history.forEach(item => {
    const character = CONFIG.characters[item.index];
    const row = document.createElement("div");
    row.className = "history-item";
    row.style.setProperty(
      "--rarity-color",
      rarityColor(item.index)
    );
    const thumb = document.createElement("div");
    thumb.className = "history-thumb";
    thumb.appendChild(createPortrait(item.index));
    const name = document.createElement("strong");
    name.className = "history-name";
    name.textContent = character.name;
    const rarity = document.createElement("span");
    rarity.className = "history-rarity";
    rarity.textContent = character.rarity;
    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = item.time.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });
    row.append(thumb, name, rarity, time);
    list.appendChild(row);
  });
}
/* ==================================================
   ЗАГРУЗКА ИЗОБРАЖЕНИЯ
   ================================================== */
function loadImage() {
  sourceImage.onload = () => {
    imageReady = true;
    cropRects = calculateCropRects();
    buildContents();
    buildRoulette();
    showToast("Изображение персонажей загружено.");
  };
  sourceImage.onerror = () => {
    imageReady = false;
    cropRects = [];
    buildContents();
    buildRoulette();
    showToast(
      "Картинка не найдена. Проверь имя characters.png."
    );
  };
  sourceImage.src = CONFIG.image;
}
/* ==================================================
   ИНИЦИАЛИЗАЦИЯ
   ================================================== */
function init() {
  $("#casePrice").textContent = `${money(CONFIG.casePrice)} ₽`;
  updateBalance();
  buildContents();
  buildRoulette();
  loadImage();
  openButton.addEventListener("click", () => {
    if (busy) return;
    if (balance < CONFIG.casePrice) {
      showToast("Недостаточно виртуального баланса.");
      return;
    }
    if (CONFIG.characters.length === 0) {
      showToast("В кейсе нет персонажей.");
      return;
    }
    balance -= CONFIG.casePrice;
    updateBalance();
    const winnerIndex = chooseCharacter();
    startRoulette(winnerIndex);
  });
  $("#openAgain").addEventListener("click", () => {
    $("#case").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    openButton.click();
  });
  $("#addBalance").addEventListener("click", () => {
    balance += 500;
    updateBalance();
    showToast("Добавлено 500 ₽ виртуального баланса.");
  });
  $("#clearHistory").addEventListener("click", () => {
    history = [];
    renderHistory();
    showToast("История очищена.");
  });
  window.addEventListener("resize", () => {
    if (!busy) {
      track.style.transition = "none";
      track.style.transform = "translateX(0px)";
    }
  });
}
init();
