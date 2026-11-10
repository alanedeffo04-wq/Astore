/* =====================================================
   ASTORE · home.js : page d'accueil
   (vidéo du hero, onglets « Actualités et tendances », bloc contact)
   ===================================================== */
(function () {
  "use strict";
  var A = window.ASTORE;
  if (!A) return;
  var $ = A.$, esc = A.esc, t = A.t;

  var state = { tab: "featured", products: [] };
  var FILTERS = {
    featured: function (p) { return p.is_featured; },
    "new": function (p) { return p.is_new; },
    best: function (p) { return p.is_bestseller; }
  };

  /* ----- Vidéo du hero ----- */
  function heroVideo() {
    var v = $(".hero-video");
    if (!v) return;
    var src = v.querySelector("source");
    if (src) src.addEventListener("error", function () { v.remove(); });   // fichier absent : fond dégradé
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) { v.pause(); v.removeAttribute("autoplay"); return; }
    var p = v.play && v.play();
    if (p && p.catch) p.catch(function () { /* lecture bloquée : poster/fond affiché */ });
    // La vidéo se met en pause quand elle n'est plus visible (économie de batterie et de données)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause();
        });
      }, { threshold: 0.05 }).observe(v);
    }
    setTimeout(function () { if (v.isConnected && v.readyState === 0 && v.networkState === 3) v.remove(); }, 2500);
  }

  /* ----- Onglets Populaires / Nouveautés / Meilleures ventes ----- */
  function skeletons() {
    $("#news-track").innerHTML = '<div class="skel" aria-hidden="true"></div>'.repeat(4);
  }
  function fail() {
    $("#news-track").innerHTML = '<p class="notice" role="alert">' +
      esc(t("Impossible de charger les produits pour le moment. Vérifiez la configuration (config.js), puis actualisez la page.")) + "</p>";
  }
  function renderTrack(animate) {
    var track = $("#news-track");
    var list = state.products.filter(FILTERS[state.tab]).slice(0, 8);
    function paint() {
      track.innerHTML = list.length
        ? list.map(A.productCard).join("")
        : '<p class="note">' + esc(t("Aucun produit dans cette sélection pour le moment.")) + "</p>";
      track.scrollLeft = 0;
      track.classList.remove("is-switching");
    }
    if (animate) { track.classList.add("is-switching"); setTimeout(paint, 180); } else paint();
  }
  function selectTab(name, focus) {
    state.tab = name;
    var tabs = A.$$(".tab");
    tabs.forEach(function (b) {
      var on = b.getAttribute("data-tab") === name;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) { $("#news-track").setAttribute("aria-labelledby", b.id); if (focus) b.focus(); }
    });
    renderTrack(true);
  }
  function bindTabs() {
    var tabs = A.$$(".tab");
    tabs.forEach(function (b, i) {
      b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
      b.addEventListener("click", function () { selectTab(b.getAttribute("data-tab"), false); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        selectTab(tabs[(i + d + tabs.length) % tabs.length].getAttribute("data-tab"), true);
      });
    });
  }

  function loadProducts() {
    if (!A.db) { fail(); A.markReady(); return; }
    Promise.resolve(
      A.db.from("products")
        .select("id,name,slug,brand,price,promo_price,stock,is_featured,is_new,is_bestseller,categories(name,slug)")
        .eq("is_active", true)
        .order("created_at")
    )
      .then(function (r) {
        if (r.error) throw r.error;
        state.products = r.data || [];
        A.registerProducts(state.products);
        renderTrack(false);
      })
      .catch(function (e) { console.error(e); fail(); })
      .then(function () { A.markReady(); });
  }

  /* ----- Bloc assistance ----- */
  function contactBlock() {
    A.loadSettings().then(function (s) {
      var btn = $("#contact-wa");
      var href = A.waLink(s.whatsapp, t("Bonjour ASTORE, j’ai une question avant de commander."));
      if (href) { btn.href = href; btn.target = "_blank"; btn.rel = "noopener"; }
      else btn.addEventListener("click", function (e) { e.preventDefault(); A.toast(t("Numéro WhatsApp à renseigner dans l’administration.")); });

      var rows = [];
      if (s.phone) rows.push('<li><a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '">' + esc(s.phone) + "</a></li>");
      if (s.email) rows.push('<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a></li>");
      var place = [s.address, s.city].filter(Boolean).join(", ");
      if (place) rows.push("<li>" + esc(place) + "</li>");
      $("#contact-list").innerHTML = rows.join("");
    });
  }

  heroVideo();
  bindTabs();
  skeletons();
  contactBlock();
  loadProducts();
  A.onLang(function () { if (state.products.length) renderTrack(false); });
})();