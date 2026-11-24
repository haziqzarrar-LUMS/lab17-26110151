/* =========================================================
   BurgerKhan — Fight Night Deals page
   ========================================================= */
(() => {
  "use strict";

  const BK = window.BK;

  /* The poster slams in on load (no intro on this page) */
  if (!BK.reducedMotion.matches) {
    window.requestAnimationFrame(() => document.body.classList.add("page-ready"));
  }

  /* Raat ka Dangal only unlocks from 12 am to 3 am, local time */
  const raatButton = document.getElementById("raat-button");
  const raatStatus = document.getElementById("raat-status");

  function updateRaat() {
    const hour = new Date().getHours();
    const open = hour >= 0 && hour < 3;
    raatButton.disabled = !open;
    raatButton.textContent = open ? "Add to order" : "Unlocks at 12 am";
    raatStatus.textContent = open ? "Raat ka dangal is live. Order now!" : "";
    raatStatus.hidden = !open;
  }

  updateRaat();
  window.setInterval(updateRaat, 60000);
})();
