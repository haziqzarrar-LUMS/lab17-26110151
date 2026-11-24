/* =========================================================
   BurgerKhan Fight Night — shared script (every page)
   Bag, bell sound, round cards, Bhook meter, header,
   living background, glove cursor, comic bursts.
   ========================================================= */
(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const isPhone = window.matchMedia("(max-width: 760px)");

  /* ---------- Safe sessionStorage ---------- */
  const store = {
    get(key) {
      try { return window.sessionStorage.getItem(key); } catch (error) { return null; }
    },
    set(key, value) {
      try { window.sessionStorage.setItem(key, value); } catch (error) { /* ignore */ }
    }
  };

  /* ---------- Prices (rule 9: "Rs 1,099") ---------- */
  const formatPrice = (value) => `Rs ${Math.round(value).toLocaleString("en-US")}`;

  const catalog = new Map([
    ["Pehelwan Stack", 1099],
    ["Khan Classic", 749],
    ["Mirchi Mania", 799],
    ["Akhaara Fries", 299],
    ["Loaded Knockout", 449],
    ["Onion Uppercut", 349],
    ["Cola Corner", 199],
    ["Nimbu Slam", 249],
    ["Mango Muscle", 399],
    ["Yaari Box", 2199],
    ["Raat ka Dangal", 1299],
    ["Hostel Survival Pack", 3799]
  ]);

  /* ---------- Screen-reader announcements ---------- */
  function announce(message) {
    const announcer = document.getElementById("announcer");
    if (!announcer) return;
    announcer.textContent = "";
    window.setTimeout(() => { announcer.textContent = message; }, 40);
  }

  /* =========================================================
     Your Corner bag (shared across pages for this visit)
     ========================================================= */
  const bag = (() => {
    const listeners = new Set();
    let lines = [];

    try {
      const saved = JSON.parse(store.get("bk-bag") || "[]");
      if (Array.isArray(saved)) {
        lines = saved.filter((line) => line && typeof line.name === "string" && Number.isFinite(line.price) && Number.isInteger(line.qty) && line.qty > 0);
      }
    } catch (error) {
      lines = [];
    }

    function emit(change) {
      store.set("bk-bag", JSON.stringify(lines));
      listeners.forEach((listener) => listener(change));
    }

    return {
      lines: () => lines.slice(),
      find: (key) => lines.find((line) => line.key === key),
      findByName: (name) => {
        for (let index = lines.length - 1; index >= 0; index -= 1) {
          if (lines[index].name === name) return lines[index];
        }
        return undefined;
      },
      add({ name, price, details = "", key = name }) {
        let line = lines.find((entry) => entry.key === key);
        if (line) {
          line.qty += 1;
        } else {
          line = { key, name, price, details, qty: 1 };
          lines.push(line);
        }
        emit({ type: "add", line });
        return line;
      },
      setQty(key, qty) {
        const line = lines.find((entry) => entry.key === key);
        if (!line) return;
        if (qty <= 0) {
          lines = lines.filter((entry) => entry !== line);
          emit({ type: "remove", line });
        } else {
          line.qty = qty;
          emit({ type: "qty", line });
        }
      },
      clear() {
        lines = [];
        emit({ type: "clear" });
      },
      count: () => lines.reduce((sum, line) => sum + line.qty, 0),
      total: () => lines.reduce((sum, line) => sum + line.price * line.qty, 0),
      onChange: (listener) => listeners.add(listener)
    };
  })();

  /* =========================================================
     Bell sound with the Web Audio API (off by default)
     ========================================================= */
  let audioContext = null;
  let soundOn = store.get("bk-sound") === "on";

  function strike(context, when, pitch, volume) {
    const partials = [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]];
    partials.forEach(([ratio, weight]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = pitch * ratio;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(volume * weight, when + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 1.4 / Math.sqrt(ratio));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(when);
      oscillator.stop(when + 1.5);
    });
  }

  function ring(strikes = 1, pitch = 760) {
    if (!soundOn) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const start = audioContext.currentTime + 0.02;
      for (let index = 0; index < strikes; index += 1) {
        strike(audioContext, start + index * 0.2, pitch, 0.22);
      }
    } catch (error) {
      /* no audio available: stay silent */
    }
  }

  function renderSoundToggles() {
    document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(soundOn));
      button.innerHTML = `<span aria-hidden="true">${soundOn ? "🔔" : "🔕"}</span> <span class="sound-text">${soundOn ? "Turn sound off" : "Turn sound on"}</span>`;
    });
  }

  document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      soundOn = !soundOn;
      store.set("bk-sound", soundOn ? "on" : "off");
      renderSoundToggles();
      if (soundOn) ring(1);
    });
  });
  renderSoundToggles();

  /* =========================================================
     Comic bursts (rule 7): DHISHOOM! and burger confetti
     ========================================================= */
  function dhishoom(element, word = "DHISHOOM!") {
    if (reducedMotion.matches || !element) return;
    const bounds = element.getBoundingClientRect();
    const burst = document.createElement("span");
    burst.className = "dhishoom";
    burst.textContent = word;
    burst.setAttribute("aria-hidden", "true");
    burst.style.left = `${Math.min(Math.max(bounds.left + bounds.width / 2, 90), window.innerWidth - 90)}px`;
    burst.style.top = `${Math.max(bounds.top, 80)}px`;
    document.body.append(burst);
    window.setTimeout(() => burst.remove(), 760);
  }

  function confetti(count = 42) {
    if (reducedMotion.matches) return;
    const layer = document.createElement("div");
    const emoji = ["🍔", "🍔", "🍔", "🧀", "🍟", "🌶️"];
    layer.className = "confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.textContent = emoji[index % emoji.length];
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
      piece.style.setProperty("--spin", `${(Math.random() - 0.5) * 900}deg`);
      piece.style.setProperty("--s", `${1.3 + Math.random() * 1.4}rem`);
      piece.style.setProperty("--t", `${1500 + Math.random() * 1300}ms`);
      piece.style.setProperty("--d", `${Math.random() * 500}ms`);
      layer.append(piece);
    }
    document.body.append(layer);
    window.setTimeout(() => layer.remove(), 3400);
  }

  /* Any button with data-add-item joins the order */
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-item]");
    if (!button || button.disabled) return;
    const name = button.dataset.addItem;
    const price = catalog.get(name);
    if (price === undefined) return;
    bag.add({ name, price });
    dhishoom(button);
    ring(1, 980);
    announce(`${name} added to Your Corner. ${bag.count()} in your order.`);
  });

  /* Corner counters + floating Your Corner button */
  function renderCornerCount() {
    document.querySelectorAll("[data-corner-count]").forEach((element) => {
      element.textContent = String(bag.count());
    });
  }

  bag.onChange((change) => {
    renderCornerCount();
    const fab = document.getElementById("corner-fab");
    if (fab && change.type === "add" && !reducedMotion.matches) {
      fab.classList.remove("bump");
      void fab.offsetWidth;
      fab.classList.add("bump");
    }
  });
  renderCornerCount();

  const orderSection = document.getElementById("order");
  const cornerFab = document.getElementById("corner-fab");
  if (orderSection && cornerFab && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      cornerFab.classList.toggle("is-tucked", entry.isIntersecting);
    }, { threshold: 0.05 }).observe(orderSection);
  }

  /* =========================================================
     Header hides on scroll down, Bhook meter fills
     ========================================================= */
  const header = document.getElementById("site-header");
  const meter = document.getElementById("bhook-meter");
  const meterFill = document.getElementById("bhook-fill");
  const meterPct = document.getElementById("bhook-pct");
  const frameCallbacks = [];
  let lastScrollY = window.scrollY;
  let scrollQueued = false;
  let lastPct = -1;

  function scrollFrame() {
    scrollQueued = false;
    const y = window.scrollY;

    if (header) {
      if (y < 80 || y < lastScrollY - 4) {
        header.classList.remove("header-hidden");
      } else if (y > lastScrollY + 4 && !header.contains(document.activeElement)) {
        header.classList.add("header-hidden");
      }
    }
    lastScrollY = y;

    if (meterFill) {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(y / max, 0), 1);
      meterFill.style.transform = `scaleX(${progress})`;
      const pct = Math.round(progress * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        meterPct.textContent = pct >= 99 ? "K.O.!" : `${pct}%`;
        meter.setAttribute("aria-valuenow", String(pct));
        meter.classList.toggle("is-full", pct >= 99);
      }
    }

    frameCallbacks.forEach((callback) => callback(y));
  }

  window.addEventListener("scroll", () => {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(scrollFrame);
    }
  }, { passive: true });
  window.addEventListener("resize", () => window.requestAnimationFrame(scrollFrame));
  header?.addEventListener("focusin", () => header.classList.remove("header-hidden"));
  scrollFrame();

  /* =========================================================
     Round cards with a bell (rule 14)
     ========================================================= */
  const state = { introActive: false };
  const roundFlash = document.getElementById("round-flash");
  const roundTitle = document.getElementById("round-flash-title");
  const roundSub = document.getElementById("round-flash-sub");
  let currentRound = null;
  let roundTimer;

  function flashRound(section) {
    if (!roundFlash || state.introActive) return;
    roundTitle.textContent = section.dataset.round;
    roundSub.textContent = section.dataset.roundSub || "";
    roundFlash.classList.remove("is-active");
    void roundFlash.offsetWidth;
    roundFlash.classList.add("is-active");
    window.clearTimeout(roundTimer);
    roundTimer = window.setTimeout(() => roundFlash.classList.remove("is-active"), reducedMotion.matches ? 1100 : 1450);
    ring(2);
  }

  if ("IntersectionObserver" in window) {
    const roundObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target === currentRound) return;
        currentRound = entry.target;
        flashRound(entry.target);
      });
    }, { rootMargin: "-38% 0px -58% 0px" });
    document.querySelectorAll("[data-round]").forEach((section) => roundObserver.observe(section));

    /* Pause CSS effects that are off screen */
    const fxObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-offscreen", !entry.isIntersecting));
    }, { rootMargin: "120px 0px" });
    document.querySelectorAll("[data-fx]").forEach((element) => fxObserver.observe(element));
  }

  /* =========================================================
     Living background: emoji float up with scroll parallax
     ========================================================= */
  const bgStage = document.getElementById("bg-stage");
  const floaties = [];

  function buildFloaties() {
    if (!bgStage) return;
    const emoji = ["🍔", "🌶️", "💪", "🧀"];
    const depths = [
      { size: 1.3, opacity: 0.1, speed: 14, parallax: 0.08 },
      { size: 2.1, opacity: 0.15, speed: 24, parallax: 0.2 },
      { size: 3, opacity: 0.2, speed: 36, parallax: 0.38 }
    ];
    const total = isPhone.matches ? 9 : 16;
    for (let index = 0; index < total; index += 1) {
      const depth = depths[index % depths.length];
      const element = document.createElement("span");
      element.className = "floaty";
      element.textContent = emoji[index % emoji.length];
      element.style.setProperty("--size", `${depth.size}rem`);
      element.style.setProperty("--o", String(depth.opacity));
      bgStage.append(element);
      floaties.push({
        element,
        x: ((index * 61) % 100) / 100,
        offset: Math.random(),
        sway: 10 + Math.random() * 24,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 40,
        ...depth
      });
    }
  }

  let floatFrame = 0;
  function placeFloaties(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const travel = height + 160;
    const seconds = time / 1000;
    const scrollY = window.scrollY;
    floaties.forEach((item) => {
      const distance = (item.offset * travel + seconds * item.speed + scrollY * item.parallax) % travel;
      const y = height + 80 - distance;
      const x = item.x * width + Math.sin(seconds * 0.4 + item.phase) * item.sway;
      const angle = Math.sin(seconds * 0.3 + item.phase) * item.spin;
      item.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`;
    });
  }

  function floatLoop(time) {
    placeFloaties(time);
    floatFrame = window.requestAnimationFrame(floatLoop);
  }

  function startFloat() {
    if (floatFrame || reducedMotion.matches || document.hidden) return;
    floatFrame = window.requestAnimationFrame(floatLoop);
  }

  function stopFloat() {
    window.cancelAnimationFrame(floatFrame);
    floatFrame = 0;
  }

  buildFloaties();
  if (reducedMotion.matches) {
    placeFloaties(0);
  } else {
    startFloat();
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? stopFloat() : startFloat()));
  reducedMotion.addEventListener?.("change", () => (reducedMotion.matches ? stopFloat() : startFloat()));

  /* =========================================================
     🥊 glove cursor (desktop with a mouse only)
     ========================================================= */
  function applyCursor() {
    if (!finePointer.matches) {
      root.classList.remove("glove-cursor");
      return;
    }
    const glove = (angle) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><text x='18' y='28' font-size='26' text-anchor='middle' transform='rotate(${angle} 18 18)'>🥊</text></svg>`)}") 10 8`;
    root.style.setProperty("--glove", glove(-20));
    root.style.setProperty("--glove-hit", glove(25));
    root.classList.add("glove-cursor");
  }
  applyCursor();
  finePointer.addEventListener?.("change", applyCursor);

  /* =========================================================
     Public API for page scripts
     ========================================================= */
  window.BK = {
    reducedMotion,
    finePointer,
    isPhone,
    store,
    state,
    catalog,
    bag,
    formatPrice,
    announce,
    ring,
    dhishoom,
    confetti,
    onScrollFrame: (callback) => frameCallbacks.push(callback)
  };
})();
