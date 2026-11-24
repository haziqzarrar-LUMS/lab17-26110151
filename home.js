/* =========================================================
   BurgerKhan Fight Night — home page
   Intro, hero burger + steam + dodging letters, picker,
   roster, builder, comic strip, Bhook Dangal, map, order.
   ========================================================= */
(() => {
  "use strict";

  const BK = window.BK;
  const root = document.documentElement;
  const { reducedMotion, finePointer, formatPrice, bag } = BK;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function restartClass(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  /* Shared pointer position (client coordinates) */
  const pointer = { x: -9999, y: -9999, active: false };
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.active = false; });

  /* Is the hero on screen? Drives steam, letters, sunburst */
  const hero = $(".hero");
  let heroVisible = true;
  const heroListeners = [];
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    heroListeners.forEach((listener) => listener(heroVisible));
  }).observe(hero);

  /* =========================================================
     1. ENTRANCE
     ========================================================= */
  const intro = $("#intro");
  const main = $("#main");
  const outside = [main, $("#site-header"), $(".site-footer"), $("#corner-fab")];

  function heroEntrance() {
    document.body.classList.add("page-ready");
    window.setTimeout(measureLetters, 900);
  }

  function runIntro() {
    const stage = $("#intro-stage");
    const line1 = $("#intro-line-1");
    const line2 = $("#intro-line-2");
    const left = $("#intro-left");
    const right = $("#intro-right");
    const versus = $("#intro-vs");
    const flash = $("#intro-flash");
    const skip = $("#intro-skip");
    const timers = [];
    let finished = false;

    BK.state.introActive = true;
    BK.store.set("bk-intro-seen", "1");
    document.body.classList.add("intro-on");
    outside.forEach((element) => element && (element.inert = true));
    skip.focus({ preventScroll: true });

    const wait = (ms) => new Promise((resolve) => timers.push(window.setTimeout(resolve, ms)));

    async function type(element, text, speed) {
      const caret = document.createElement("span");
      caret.className = "caret";
      element.append(caret);
      for (const character of text) {
        if (finished) return;
        caret.before(character);
        await wait(speed);
      }
      caret.remove();
    }

    function puffs(target) {
      const box = target.getBoundingClientRect();
      for (let index = 0; index < 7; index += 1) {
        const puff = document.createElement("span");
        const angle = (Math.PI * 2 * index) / 7;
        puff.className = "puff";
        puff.style.left = `${box.left + box.width * (0.15 + 0.7 * (index / 6))}px`;
        puff.style.top = `${box.bottom - 6}px`;
        puff.style.setProperty("--s", `${2.5 + (index % 3)}rem`);
        puff.style.setProperty("--dx", `${Math.cos(angle) * 60}px`);
        puff.style.setProperty("--dy", `${Math.abs(Math.sin(angle)) * 30 + 10}px`);
        stage.append(puff);
        timers.push(window.setTimeout(() => puff.remove(), 760));
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      const hadFocus = intro.contains(document.activeElement);
      intro.classList.add("out");
      outside.forEach((element) => element && (element.inert = false));
      document.body.classList.remove("intro-on");
      if (hadFocus) main.focus({ preventScroll: true });
      heroEntrance();
      window.setTimeout(() => {
        root.classList.remove("play-intro");
        intro.hidden = true;
        BK.state.introActive = false;
      }, 700);
    }

    skip.addEventListener("click", finish);
    intro.addEventListener("keydown", (event) => {
      if (event.key === "Escape") finish();
      if (event.key === "Tab") {
        event.preventDefault();
        skip.focus();
      }
    });

    (async () => {
      await wait(250);
      intro.classList.add("lit");
      await wait(550);
      await type(line1, "Ladies and gentlemen…", 48);
      await wait(380);
      await type(line2, "Lahore ki bhook ke khilaf…", 44);
      await wait(450);
      if (finished) return;
      left.classList.add("in");
      timers.push(window.setTimeout(() => { restartClass(stage, "shake"); puffs(left); }, 330));
      await wait(560);
      if (finished) return;
      versus.classList.add("in");
      await wait(220);
      right.classList.add("in");
      timers.push(window.setTimeout(() => { restartClass(stage, "shake"); puffs(right); }, 330));
      await wait(620);
      if (finished) return;
      flash.classList.add("ring");
      BK.ring(3);
      await wait(1100);
      finish();
    })();
  }

  if (root.classList.contains("play-intro") && !reducedMotion.matches) {
    runIntro();
  } else {
    if (intro) intro.hidden = true;
    root.classList.remove("play-intro");
    if (!reducedMotion.matches) heroEntrance();
  }

  /* =========================================================
     2. HERO — letters dodge the glove
     ========================================================= */
  const heroTitle = $("#hero-title");
  $$(".h-word", heroTitle).forEach((word) => {
    const text = word.textContent;
    word.textContent = "";
    for (const character of text) {
      const letter = document.createElement("span");
      letter.className = "ltr";
      letter.textContent = character;
      word.append(letter);
    }
  });
  const letters = $$(".ltr", heroTitle).map((element) => ({ element, cx: 0, cy: 0, ox: 0, oy: 0 }));

  function measureLetters() {
    letters.forEach((letter) => {
      const box = letter.element.getBoundingClientRect();
      letter.cx = box.left + box.width / 2 + window.scrollX - letter.ox;
      letter.cy = box.top + box.height / 2 + window.scrollY - letter.oy;
    });
  }

  function pushLetters(px, py, radius, strength) {
    letters.forEach((letter) => {
      const dx = letter.cx - px;
      const dy = letter.cy - py;
      const distance = Math.hypot(dx, dy) || 1;
      let ox = 0;
      let oy = 0;
      if (distance < radius) {
        const force = (1 - distance / radius) ** 2 * strength;
        ox = (dx / distance) * force;
        oy = (dy / distance) * force;
      }
      if (Math.abs(ox - letter.ox) > 0.5 || Math.abs(oy - letter.oy) > 0.5) {
        letter.ox = ox;
        letter.oy = oy;
        letter.element.style.transform = ox || oy ? `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${(ox * 0.5).toFixed(1)}deg)` : "";
      }
    });
  }

  let letterFrame = 0;
  function letterLoop() {
    letterFrame = 0;
    if (!heroVisible) return;
    if (pointer.active) {
      pushLetters(pointer.x + window.scrollX, pointer.y + window.scrollY, 150, 46);
    } else {
      pushLetters(-9999, -9999, 1, 0);
    }
  }

  if (!reducedMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "mouse" && heroVisible && !letterFrame) {
        letterFrame = window.requestAnimationFrame(letterLoop);
      }
    }, { passive: true });
    document.addEventListener("pointerleave", () => pushLetters(-9999, -9999, 1, 0));
    /* Touch: a tap punches the letters away, then they come back */
    hero.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      pushLetters(event.clientX + window.scrollX, event.clientY + window.scrollY, 170, 54);
      window.setTimeout(() => pushLetters(-9999, -9999, 1, 0), 420);
    }, { passive: true });
    window.addEventListener("resize", measureLetters);
    document.fonts?.ready.then(measureLetters);
    measureLetters();
  }

  /* =========================================================
     2b. HERO — mega burger pulls apart and slams back
     ========================================================= */
  const burger = $("#mega-burger");
  const burgerHint = $("#burger-hint");
  let burgerOpen = false;
  let burgerTimer;
  let lastPointerType = "keyboard";

  burgerHint.textContent = finePointer.matches ? "Hover the burger" : "Tap the burger";

  function setBurger(open) {
    if (open === burgerOpen) return;
    burgerOpen = open;
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    if (!open && !reducedMotion.matches) {
      window.setTimeout(() => !burgerOpen && restartClass(burger, "slam"), 150);
    }
  }

  burger.addEventListener("pointerdown", (event) => { lastPointerType = event.pointerType; });
  burger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") setBurger(true);
  });
  burger.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") setBurger(false);
  });
  burger.addEventListener("click", (event) => {
    window.clearTimeout(burgerTimer);
    const viaKeyboard = event.detail === 0;
    if (!viaKeyboard && lastPointerType === "mouse") {
      setBurger(!burgerOpen);
      return;
    }
    setBurger(!burgerOpen);
    if (burgerOpen && !viaKeyboard) {
      burgerTimer = window.setTimeout(() => setBurger(false), 2400);
    }
    lastPointerType = "keyboard";
  });

  /* =========================================================
     2c. HERO — steam rises and bends away from the cursor
     ========================================================= */
  const steamCanvas = $("#steam");
  const steamContext = steamCanvas.getContext("2d");
  const wisps = [];
  const steamState = { width: 0, height: 0, emitLeft: 0, emitRight: 0, emitY: 0, running: false, frame: 0, last: 0 };
  const wispCount = () => (window.innerWidth < 760 ? 6 : 13);

  function sizeSteam() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const box = steamCanvas.getBoundingClientRect();
    const bun = $(".l-bun-top", burger).getBoundingClientRect();
    steamState.width = box.width;
    steamState.height = box.height;
    steamCanvas.width = Math.round(box.width * ratio);
    steamCanvas.height = Math.round(box.height * ratio);
    steamContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    steamState.emitLeft = bun.left - box.left + bun.width * 0.22;
    steamState.emitRight = bun.left - box.left + bun.width * 0.78;
    steamState.emitY = bun.top - box.top + bun.height * 0.25;
  }

  function newWisp(stagger) {
    const life = 150 + Math.random() * 90;
    return {
      x: steamState.emitLeft + Math.random() * (steamState.emitRight - steamState.emitLeft),
      y: steamState.emitY,
      vx: 0,
      rise: 0.75 + Math.random() * 0.5,
      age: stagger ? Math.random() * life : 0,
      life,
      phase: Math.random() * Math.PI * 2,
      trail: []
    };
  }

  function stepSteam(time) {
    const dt = clamp((time - (steamState.last || time)) / 16.7, 0.2, 3);
    steamState.last = time;
    const canvasBox = steamCanvas.getBoundingClientRect();
    const px = pointer.active ? pointer.x - canvasBox.left : -9999;
    const py = pointer.active ? pointer.y - canvasBox.top : -9999;

    while (wisps.length < wispCount()) wisps.push(newWisp(true));
    steamContext.clearRect(0, 0, steamState.width, steamState.height);
    steamContext.lineCap = "round";
    steamContext.lineJoin = "round";

    for (let index = wisps.length - 1; index >= 0; index -= 1) {
      const wisp = wisps[index];
      wisp.age += dt;
      if (wisp.age > wisp.life) {
        wisps.splice(index, 1);
        continue;
      }
      const dx = wisp.x - px;
      const dy = wisp.y - py;
      const distance = Math.hypot(dx, dy);
      if (distance < 120 && distance > 0) {
        const push = (1 - distance / 120) * 1.3;
        wisp.vx += (dx / distance) * push * dt;
      }
      wisp.vx *= 0.93;
      wisp.x += (wisp.vx + Math.sin(wisp.age * 0.05 + wisp.phase) * 0.45) * dt;
      wisp.y -= wisp.rise * dt;
      wisp.trail.push(wisp.x, wisp.y);
      if (wisp.trail.length > 36) wisp.trail.splice(0, 2);

      const progress = wisp.age / wisp.life;
      const alpha = Math.sin(Math.PI * progress) * 0.6;
      if (wisp.trail.length < 6) continue;
      steamContext.strokeStyle = `rgba(255, 244, 224, ${alpha.toFixed(3)})`;
      steamContext.lineWidth = 3 + progress * 7;
      steamContext.beginPath();
      steamContext.moveTo(wisp.trail[0], wisp.trail[1]);
      for (let point = 2; point < wisp.trail.length - 2; point += 2) {
        const midX = (wisp.trail[point] + wisp.trail[point + 2]) / 2;
        const midY = (wisp.trail[point + 1] + wisp.trail[point + 3]) / 2;
        steamContext.quadraticCurveTo(wisp.trail[point], wisp.trail[point + 1], midX, midY);
      }
      steamContext.stroke();
    }
    steamState.frame = window.requestAnimationFrame(stepSteam);
  }

  function toggleSteam() {
    const shouldRun = heroVisible && !document.hidden && !reducedMotion.matches;
    if (shouldRun && !steamState.running) {
      steamState.running = true;
      steamState.last = 0;
      sizeSteam();
      steamState.frame = window.requestAnimationFrame(stepSteam);
    } else if (!shouldRun && steamState.running) {
      steamState.running = false;
      window.cancelAnimationFrame(steamState.frame);
    }
  }

  if (reducedMotion.matches) {
    steamCanvas.hidden = true;
  } else {
    heroListeners.push(toggleSteam);
    document.addEventListener("visibilitychange", toggleSteam);
    window.addEventListener("resize", () => steamState.running && sizeSteam());
    toggleSteam();
  }

  /* =========================================================
     5. ROUND 1 — Kitni bhook hai? + character select
     ========================================================= */
  const cards = $$(".fighter-card");
  const roster = $("#roster");
  const preview = {
    emoji: $("#fp-emoji"),
    name: $("#fp-name"),
    type: $("#fp-type"),
    desc: $("#fp-desc"),
    price: $("#fp-price"),
    badge: $("#fp-badge"),
    add: $("#fighter-add")
  };
  const statKeys = ["weight", "spice", "cheese"];

  const fighters = cards.map((card) => ({
    card,
    name: card.dataset.name,
    emoji: card.dataset.emoji,
    type: card.dataset.type,
    desc: card.dataset.desc,
    price: Number(card.dataset.price),
    weight: Number(card.dataset.weight),
    spice: Number(card.dataset.spice),
    cheese: Number(card.dataset.cheese),
    hunger: card.dataset.hunger.split(" "),
    share: card.hasAttribute("data-share"),
    champion: card.hasAttribute("data-champion")
  }));

  /* Card backs: mini stat bars */
  fighters.forEach((fighter) => {
    const back = $(".fc-back", fighter.card);
    back.innerHTML = `<span class="fc-name"></span>${statKeys.map((key) => `<span class="mini-stat"><span>${key[0].toUpperCase()}${key.slice(1)}</span><span class="mini-bar"><i style="--v: ${fighter[key] / 100}"></i></span></span>`).join("")}<span class="fc-price"></span>`;
    $(".fc-name", back).textContent = fighter.name;
    $(".fc-price", back).textContent = formatPrice(fighter.price);
  });

  function selectFighter(fighter, { announce = true } = {}) {
    cards.forEach((card) => card.setAttribute("aria-pressed", String(card === fighter.card)));
    preview.emoji.textContent = fighter.emoji;
    preview.name.textContent = fighter.name;
    preview.type.textContent = fighter.type;
    preview.desc.textContent = fighter.desc;
    preview.price.textContent = formatPrice(fighter.price);
    preview.badge.hidden = !fighter.champion;
    preview.add.dataset.addItem = fighter.name;
    statKeys.forEach((key) => {
      $(`#stat-${key}`).style.setProperty("--v", String(fighter[key] / 100));
      $(`#num-${key}`).textContent = String(fighter[key]);
    });
    if (!reducedMotion.matches) restartClass(preview.emoji, "enter");
    if (announce) BK.announce(`${fighter.name} selected, ${formatPrice(fighter.price)}.`);
  }

  fighters.forEach((fighter) => {
    fighter.card.addEventListener("click", () => {
      selectFighter(fighter);
      /* on phones, make sure the preview is in view */
      const previewBox = $("#fighter-preview").getBoundingClientRect();
      if (previewBox.top > window.innerHeight - 140 || previewBox.bottom < 80) {
        $("#fighter-preview").scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
      }
    });
  });

  function scrollRoster(card) {
    roster.scrollTo({ left: card.parentElement.offsetLeft - roster.offsetLeft - 12, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }

  $("#roster-prev").addEventListener("click", () => roster.scrollBy({ left: -roster.clientWidth * 0.8, behavior: reducedMotion.matches ? "auto" : "smooth" }));
  $("#roster-next").addEventListener("click", () => roster.scrollBy({ left: roster.clientWidth * 0.8, behavior: reducedMotion.matches ? "auto" : "smooth" }));

  /* Picker */
  const picker = $("#picker");
  const matchCount = $("#match-count");
  const matchN = $("#match-n");
  const matchText = $("#match-text");
  const matchHint = $("#match-hint");
  const defaultHint = matchHint.textContent;

  function updateMatches() {
    const data = new FormData(picker);
    const hunger = data.get("hunger");
    const budget = data.get("budget");
    const crew = data.get("crew");
    const anyPick = Boolean(hunger || budget || crew);
    const ceiling = budget && budget !== "any" ? Number(budget) : Infinity;
    const sharing = crew === "yaar" || crew === "squad";

    const matches = fighters.filter((fighter) => {
      const fitsBudget = fighter.price <= ceiling;
      const fitsHunger = !hunger || fighter.hunger.includes(hunger) || (sharing && fighter.share);
      return fitsBudget && fitsHunger;
    });

    fighters.forEach((fighter) => {
      const isMatch = matches.includes(fighter);
      fighter.card.classList.toggle("is-match", anyPick && isMatch);
      fighter.card.classList.toggle("is-dim", anyPick && !isMatch);
    });

    const count = matches.length;
    matchN.textContent = String(count);
    if (!anyPick) {
      matchText.textContent = "contenders ready. Pick your bhook!";
    } else if (count === 0) {
      matchText.textContent = "contenders match your bhook. Thoda budget barhao, pehelwan!";
    } else {
      matchText.textContent = count === 1 ? "contender matches your bhook" : "contenders match your bhook";
    }

    if (crew === "squad") {
      matchHint.innerHTML = 'Whole squad? The <a href="deals.html">Fight Night Deals</a> have a Yaari Box and a Hostel Survival Pack.';
    } else {
      matchHint.textContent = defaultHint;
    }

    if (!reducedMotion.matches) restartClass(matchCount, "bump");

    if (anyPick && count > 0) {
      const selected = fighters.find((fighter) => fighter.card.getAttribute("aria-pressed") === "true");
      const target = matches.includes(selected) ? selected : matches[0];
      if (target !== selected) selectFighter(target, { announce: false });
      scrollRoster(target.card);
    }
  }

  picker.addEventListener("change", updateMatches);
  picker.addEventListener("submit", (event) => event.preventDefault());
  picker.addEventListener("reset", () => window.setTimeout(updateMatches, 0));

  /* =========================================================
     6. ROUND 2 — Dangal builder
     ========================================================= */
  const builderStack = $("#builder-stack");
  const builderEmpty = $("#builder-empty");
  const pattyCounter = $("#patty-counter");
  const pattyCount = $("#patty-count");
  const builderPrice = $("#builder-price");
  const builderAdd = $("#builder-add");
  const builderReset = $("#builder-reset");
  const builderLimit = $("#builder-limit");
  const ingredientButtons = $$(".builder-ingredient");
  const pattyButton = $('.builder-ingredient[data-layer="patty"]');
  const MAX_LAYERS = 12;
  let layers = [];
  let builderTotal = 0;
  let shownTotal = 0;
  let priceFrame = 0;

  function countUp(element, from, to, onFrame) {
    if (reducedMotion.matches || from === to) {
      element.textContent = formatPrice(to);
      onFrame?.(to);
      return 0;
    }
    const began = performance.now();
    const duration = 420;
    let lastShown = from;
    const tick = (now) => {
      const progress = Math.min((now - began) / duration, 1);
      const value = Math.round(from + (to - from) * (1 - (1 - progress) ** 3));
      if (value !== lastShown) {
        element.textContent = formatPrice(value);
        lastShown = value;
      }
      onFrame?.(value);
      if (progress < 1) {
        priceFrame = window.requestAnimationFrame(tick);
      }
    };
    restartClass(element, "tick");
    return window.requestAnimationFrame(tick);
  }

  function renderBuilderState() {
    const patties = layers.filter((layer) => layer.type === "patty").length;
    const full = layers.length >= MAX_LAYERS;
    pattyCount.textContent = String(patties);
    const cracked = patties >= 3;
    if (cracked && !pattyCounter.classList.contains("cracked")) {
      pattyCounter.classList.add("cracked");
      const stamp = document.createElement("span");
      stamp.className = "max-stamp";
      stamp.textContent = "MAX!";
      stamp.setAttribute("aria-hidden", "true");
      pattyCounter.append(stamp);
      BK.dhishoom(pattyCounter, "CRACK!");
    } else if (!cracked) {
      pattyCounter.classList.remove("cracked");
      $(".max-stamp", pattyCounter)?.remove();
    }
    ingredientButtons.forEach((button) => { button.disabled = full; });
    pattyButton.disabled = full || cracked;
    pattyButton.innerHTML = cracked ? "Patty limit reached" : 'Add patty · <span class="price-tag">Rs 250</span>';
    builderLimit.hidden = !full;
    builderAdd.disabled = layers.length === 0;
    builderReset.disabled = layers.length === 0;
    builderEmpty.hidden = layers.length > 0;
    window.cancelAnimationFrame(priceFrame);
    priceFrame = countUp(builderPrice, shownTotal, builderTotal, (value) => { shownTotal = value; });
  }

  ingredientButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.layer;
      const patties = layers.filter((layer) => layer.type === "patty").length;
      if ((type === "patty" && patties >= 3) || layers.length >= MAX_LAYERS) return;

      const layer = { type, label: button.dataset.label, price: Number(button.dataset.price) };
      layers.push(layer);
      builderTotal += layer.price;

      const element = document.createElement("span");
      const shape = type === "bun" ? (layers.length === 1 ? "bun-bottom" : "bun-top") : type;
      element.className = `b-layer ${shape}`;
      element.textContent = type === "patty" || type === "chilli" ? layer.label : "";
      element.setAttribute("aria-hidden", "true");
      builderStack.append(element);
      if (!reducedMotion.matches) {
        window.setTimeout(() => restartClass(builderStack, "squash"), 260);
      }
      BK.announce(`${layer.label} added. Burger total ${formatPrice(builderTotal)}.`);
      renderBuilderState();
    });
  });

  builderReset.addEventListener("click", () => {
    layers = [];
    builderTotal = 0;
    $$(".b-layer", builderStack).forEach((element) => element.remove());
    renderBuilderState();
    BK.announce("Builder cleared. Start a new burger.");
  });

  builderAdd.addEventListener("click", () => {
    if (!layers.length) return;
    const recipe = layers.map((layer) => layer.label).join(", ");
    bag.add({ key: `Custom Pehelwan|${recipe}`, name: "Custom Pehelwan", price: builderTotal, details: recipe });
    BK.dhishoom(builderAdd);
    BK.ring(1, 980);
    BK.announce(`Custom Pehelwan added to Your Corner for ${formatPrice(builderTotal)}.`);
  });

  /* =========================================================
     7. ROUND 3 — Mitti comic strip
     ========================================================= */
  const storySection = $("#story");
  const track = $(".story-track", storySection);
  const panels = $$(".comic-panel", storySection);
  const pinnedQuery = window.matchMedia("(min-width: 900px) and (min-height: 700px)");
  let comicObserver = null;

  function updatePinned() {
    const box = track.getBoundingClientRect();
    if (box.bottom < -50 || box.top > window.innerHeight + 50) return;
    const progress = clamp(-box.top / Math.max(box.height - window.innerHeight, 1), 0, 1);
    const steps = panels.length + 0.5;
    panels.forEach((panel, index) => {
      const local = clamp(progress * steps - index * 0.95, 0, 1);
      const eased = 1 - (1 - local) ** 3;
      const direction = index % 2 ? 1 : -1;
      const tilt = [-2.5, 2, -1.5, 2.5][index];
      const x = (1 - eased) * direction * window.innerWidth * 0.55;
      const y = (1 - eased) * 80;
      const angle = tilt + (1 - eased) * direction * 16;
      panel.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(2)}deg)`;
      panel.style.opacity = String(clamp(local * 3, 0, 1));
      const landed = local >= 1;
      if (landed && !panel.classList.contains("landed")) panel.classList.add("landed");
      if (!landed) panel.classList.remove("landed");
    });
  }

  function setupComic() {
    comicObserver?.disconnect();
    panels.forEach((panel) => {
      panel.style.transform = "";
      panel.style.opacity = "";
      panel.classList.remove("pre", "in", "landed");
    });
    storySection.classList.remove("pinned");
    if (reducedMotion.matches) return;

    if (pinnedQuery.matches) {
      storySection.classList.add("pinned");
      updatePinned();
    } else {
      panels.forEach((panel) => panel.classList.add("pre"));
      comicObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in", "landed");
            comicObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      panels.forEach((panel) => comicObserver.observe(panel));
    }
  }

  BK.onScrollFrame(() => {
    if (storySection.classList.contains("pinned")) updatePinned();
  });
  pinnedQuery.addEventListener?.("change", setupComic);
  setupComic();

  /* =========================================================
     7b. Easter egg: Bhook Dangal arm-wrestle
     ========================================================= */
  const game = $("#game");
  const pushButton = $("#push-button");
  const armBar = $("#arm-bar");
  const tugMarker = $("#tug-marker");
  const gameTimer = $("#game-timer");
  const gameResult = $("#game-result");
  const DURATION = 10000;
  const gameState = { playing: false, position: 0, started: 0, frame: 0, last: 0 };

  function drawGame() {
    armBar.style.setProperty("--angle", `${(gameState.position * 0.42).toFixed(1)}deg`);
    tugMarker.style.setProperty("--pos", (gameState.position * 0.46).toFixed(1));
  }

  function endGame(won) {
    gameState.playing = false;
    window.cancelAnimationFrame(gameState.frame);
    pushButton.textContent = "Play again";
    gameResult.hidden = false;
    gameResult.classList.toggle("lose", !won);
    if (won) {
      gameResult.innerHTML = 'Shabash! You beat the burger. Your code: <span class="prize-code">PEHELWAN10</span>';
      BK.confetti(30);
      BK.ring(3);
    } else {
      gameResult.textContent = "Burger ne haath mor diya! Catch your breath and try again.";
    }
  }

  function gameLoop(now) {
    const elapsed = now - gameState.started;
    const dt = Math.min((now - gameState.last) / 1000, 0.1);
    gameState.last = now;
    const burgerPower = 12 + (elapsed / DURATION) * 14;
    gameState.position = clamp(gameState.position - burgerPower * dt, -100, 100);
    gameTimer.textContent = `${Math.max((DURATION - elapsed) / 1000, 0).toFixed(1)}s`;
    drawGame();
    if (gameState.position >= 100) return endGame(true);
    if (gameState.position <= -100) return endGame(false);
    if (elapsed >= DURATION) return endGame(gameState.position > 0);
    gameState.frame = window.requestAnimationFrame(gameLoop);
  }

  function startGame() {
    gameState.playing = true;
    gameState.position = 0;
    gameState.started = performance.now();
    gameState.last = gameState.started;
    gameResult.hidden = true;
    pushButton.textContent = "Push!";
    drawGame();
    gameState.frame = window.requestAnimationFrame(gameLoop);
  }

  function resetGame() {
    window.cancelAnimationFrame(gameState.frame);
    gameState.playing = false;
    gameState.position = 0;
    drawGame();
    gameTimer.textContent = "10.0s";
    gameResult.hidden = true;
    pushButton.textContent = "Start the dangal";
  }

  pushButton.addEventListener("keydown", (event) => {
    if (event.repeat) event.preventDefault();
  });
  pushButton.addEventListener("click", () => {
    if (!gameState.playing) {
      startGame();
      return;
    }
    gameState.position = clamp(gameState.position + 6.5, -100, 100);
    if (!reducedMotion.matches) restartClass(pushButton, "hit");
    drawGame();
  });

  $("#flex-egg").addEventListener("click", () => {
    resetGame();
    if (typeof game.showModal === "function") {
      game.showModal();
    } else {
      game.setAttribute("open", "");
    }
    pushButton.focus();
  });
  $("#game-close").addEventListener("click", () => game.close());
  game.addEventListener("close", resetGame);
  game.addEventListener("click", (event) => {
    if (event.target === game) game.close();
  });

  /* =========================================================
     8. DELIVERY — Lahore map
     ========================================================= */
  const areas = {
    gulberg: { name: "Gulberg", time: "20–30 min", x: 326, y: 112 },
    dha: { name: "DHA", time: "30–40 min", x: 522, y: 216 },
    "model-town": { name: "Model Town", time: "25–35 min", x: 358, y: 272 },
    "johar-town": { name: "Johar Town", time: "30–40 min", x: 186, y: 242 },
    "bahria-town": { name: "Bahria Town", time: "45–60 min", x: 114, y: 400 }
  };
  const mapPin = $("#map-pin");

  function selectArea(id) {
    const area = areas[id];
    if (!area) return;
    $$(".area").forEach((group) => group.classList.toggle("is-active", group.dataset.area === id));
    $$(".area-button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.area === id)));
    $("#area-name").textContent = area.name;
    $("#area-time").textContent = area.time;
    mapPin.setAttribute("x", String(area.x));
    mapPin.setAttribute("y", String(area.y));
    mapPin.classList.add("drop");
    if (!reducedMotion.matches) restartClass(mapPin, "drop");
  }

  $$(".area").forEach((group) => {
    group.addEventListener("click", () => selectArea(group.dataset.area));
  });
  $$(".area-button").forEach((button) => {
    button.addEventListener("click", () => selectArea(button.dataset.area));
  });

  /* =========================================================
     9. FINAL ROUND — Your Corner + order form
     ========================================================= */
  const bagList = $("#bag-list");
  const bagEmpty = $("#bag-empty");
  const bagTotal = $("#bag-total");
  const form = $("#order-form");
  const nameInput = $("#customer-name");
  const phoneInput = $("#customer-phone");
  const itemSelect = $("#order-item");
  const quantityInput = $("#quantity");
  const victory = $("#victory");
  let shownBagTotal = 0;
  let bagFrame = 0;

  function renderBag() {
    const lines = bag.lines();
    bagEmpty.hidden = lines.length > 0;
    bagList.hidden = lines.length === 0;
    bagList.replaceChildren(...lines.map((line) => {
      const item = document.createElement("li");
      item.className = "bag-line";
      item.innerHTML = `
        <span class="bag-name"></span>
        <span class="bag-qty">
          <button class="qty-button" type="button" data-step="-1">−</button>
          <span class="qty-value"></span>
          <button class="qty-button" type="button" data-step="1">+</button>
        </span>
        <span class="bag-price"></span>`;
      const name = $(".bag-name", item);
      name.textContent = line.name;
      if (line.details) {
        const details = document.createElement("small");
        details.textContent = line.details;
        name.append(details);
      }
      $(".qty-value", item).textContent = `× ${line.qty}`;
      $(".bag-price", item).textContent = formatPrice(line.price * line.qty);
      const [minus, plus] = $$(".qty-button", item);
      minus.setAttribute("aria-label", line.qty === 1 ? `Remove ${line.name} from order` : `Remove one ${line.name}`);
      plus.setAttribute("aria-label", `Add one more ${line.name}`);
      minus.addEventListener("click", () => bag.setQty(line.key, line.qty - 1));
      plus.addEventListener("click", () => bag.setQty(line.key, line.qty + 1));
      return item;
    }));
    window.cancelAnimationFrame(bagFrame);
    bagFrame = countUp(bagTotal, shownBagTotal, bag.total(), (value) => { shownBagTotal = value; });
  }

  bag.onChange((change) => {
    const focusedStep = document.activeElement?.closest?.(".bag-line") ? document.activeElement.dataset.step : null;
    const focusedIndex = focusedStep ? $$(".bag-line", bagList).indexOf(document.activeElement.closest(".bag-line")) : -1;
    renderBag();
    /* keep keyboard focus on the same control after re-render */
    if (focusedStep) {
      const lines = $$(".bag-line", bagList);
      const target = lines[Math.min(focusedIndex, lines.length - 1)];
      (target ? $(`[data-step="${focusedStep}"]`, target) : $("#bag-title"))?.focus?.();
    }
    if (change.line && (change.type === "add" || change.type === "qty")) {
      const option = Array.from(itemSelect.options).find((entry) => entry.value === change.line.name);
      if (option) {
        itemSelect.value = change.line.name;
        quantityInput.value = String(change.line.qty);
        clearError("item");
        clearError("qty");
      }
    }
    if (change.type === "add") victory.hidden = true;
  });
  renderBag();

  /* keep the select + quantity and the bag in step */
  itemSelect.addEventListener("change", () => {
    const line = bag.findByName(itemSelect.value);
    quantityInput.value = String(line ? line.qty : 1);
    clearError("item");
  });

  quantityInput.addEventListener("change", () => {
    const quantity = Number(quantityInput.value);
    const line = bag.findByName(itemSelect.value);
    if (line && Number.isInteger(quantity) && quantity > 0) bag.setQty(line.key, quantity);
  });

  /* Phone: 11 digits starting with 03, shown as 0300-1234567 */
  const isValidPhone = (value) => /^03\d{2}[-\s]?\d{7}$/.test(value.trim());

  phoneInput.addEventListener("blur", () => {
    const digits = phoneInput.value.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("03")) {
      phoneInput.value = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
  });

  const fields = {
    name: { input: nameInput, error: $("#name-error"), wrap: $("#field-name") },
    phone: { input: phoneInput, error: $("#phone-error"), wrap: $("#field-phone") },
    item: { input: itemSelect, error: $("#item-error"), wrap: $("#field-item") },
    qty: { input: quantityInput, error: $("#qty-error"), wrap: $("#field-qty") }
  };
  const defaultItemError = fields.item.error.textContent;

  function showError(key, message) {
    const field = fields[key];
    if (message) field.error.textContent = message;
    field.error.hidden = false;
    field.input.setAttribute("aria-invalid", "true");
  }

  function clearError(key) {
    const field = fields[key];
    field.error.hidden = true;
    field.input.removeAttribute("aria-invalid");
    if (key === "item") field.error.textContent = defaultItemError;
  }

  Object.keys(fields).forEach((key) => {
    fields[key].input.addEventListener("input", () => clearError(key));
  });

  function shake(key) {
    const field = fields[key];
    if (!reducedMotion.matches) {
      field.wrap.classList.remove("shake");
      void field.wrap.offsetWidth;
      field.wrap.classList.add("shake");
      field.wrap.addEventListener("animationend", () => field.wrap.classList.remove("shake"), { once: true });
    }
    field.input.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.keys(fields).forEach(clearError);
    const invalid = [];
    const quantity = Number(quantityInput.value);

    if (!nameInput.value.trim()) invalid.push(["name"]);
    if (!isValidPhone(phoneInput.value)) invalid.push(["phone"]);
    if (!itemSelect.value) {
      invalid.push(["item"]);
    } else if (itemSelect.value === "Custom Pehelwan" && !bag.findByName("Custom Pehelwan")) {
      invalid.push(["item", "Build your Custom Pehelwan in Round 2 first, or choose another contender."]);
    }
    if (!Number.isInteger(quantity) || quantity < 1) invalid.push(["qty"]);

    if (invalid.length) {
      invalid.forEach(([key, message]) => showError(key, message));
      shake(invalid[0][0]);
      return;
    }

    /* merge the form's item into the bag */
    const existing = bag.findByName(itemSelect.value);
    if (existing) {
      bag.setQty(existing.key, quantity);
    } else {
      const line = bag.add({ name: itemSelect.value, price: BK.catalog.get(itemSelect.value) });
      bag.setQty(line.key, quantity);
    }

    const lines = bag.lines();
    const summary = lines.map((line) => `${line.name} × ${line.qty}`).join(", ");
    const total = bag.total();
    const beltName = $("#belt-name");
    beltName.textContent = nameInput.value.trim();
    beltName.style.fontSize = `${clamp(20 / Math.max(nameInput.value.trim().length, 1), 0.95, 2)}rem`;
    $("#victory-summary").textContent = `${summary}. Total ${formatPrice(total)}. We’ll call ${phoneInput.value.trim()} to confirm.`;
    victory.hidden = false;
    victory.classList.remove("drop");
    if (!reducedMotion.matches) {
      void victory.offsetWidth;
      victory.classList.add("drop");
    }
    victory.focus({ preventScroll: true });
    victory.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "auto" : "smooth" });
    BK.confetti();
    BK.ring(3, 700);

    bag.clear();
    itemSelect.value = "";
    quantityInput.value = "1";
    victory.hidden = false;
  });
})();
