/* =====================================================
   ASTORE · script.js
   Outils partagés par toutes les pages : en-tête, pied de page,
   barre mobile, panier, langue FR/EN, préchargement, images.
   ===================================================== */
(function () {
  "use strict";

  var CFG = window.ASTORE_CONFIG || {};
  var IMG = window.ASTORE_IMAGES || {
    logo: "logo.png",
    placeholder: "placeholder.svg",
    product: function () { return "placeholder.svg"; }
  };
  var root = document.documentElement;

  /* ---------- 1. Outils ---------- */
  var ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ENT[c]; });
  }
  function formatFCFA(n) {
    return Number(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00a0") + "\u00a0FCFA";
  }
  function waLink(number, text) {
    var n = String(number || "").replace(/\D/g, "");
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(text || "") : null;
  }
  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
  function svg(inner, size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart: '<path d="M3 4h2l2.2 11h10.6L20 8H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    track: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    wa: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5z"/><path d="M9.2 9.2c.3 2 2.4 4.1 4.9 4.9l1.1-1.1-1.8-.9-.8.7c-.9-.4-1.6-1.2-2-2l.7-.8-.9-1.8z"/>'
  };

  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._h);
    el._h = setTimeout(function () { el.classList.remove("show"); }, 2400);
  }

  /* ---------- 2. Langue FR / EN ---------- */
  var LANG_KEY = "astore_lang";
  var lang = "fr";
  try { lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "fr"; } catch (e) { /* ignoré */ }
  var dict = null;                       // dictionnaire anglais (i18n.js), chargé à la demande
  var origText = new WeakMap();          // texte français d'origine des nœuds traduits
  var langListeners = [];
  var frTitle = document.title;
  var ATTRS = ["placeholder", "aria-label", "title", "alt"];
  var ATTR_SELECTOR = "[placeholder],[aria-label],[title],[alt]";

  // Traduction d'un texte produit par le JavaScript. {nom} = valeur à insérer.
  function t(fr, vars) {
    var s = (lang === "en" && dict && dict[fr]) || fr;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; });
    return s;
  }

  function textNodes(scope) {
    var out = [];
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode;
      if (p && /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.nodeName)) continue;
      if (n.nodeValue.trim()) out.push(n);
    }
    return out;
  }
  function nodeToEn(node) {
    var fr = origText.has(node) ? origText.get(node) : node.nodeValue;
    var key = fr.trim();
    var en = dict && dict[key];
    if (en) {
      if (!origText.has(node)) origText.set(node, node.nodeValue);
      node.nodeValue = fr.replace(key, function () { return en; });
    }
  }
  function attrsToEn(el) {
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var store = "data-fr-" + a;
      var fr = el.hasAttribute(store) ? el.getAttribute(store) : el.getAttribute(a);
      var en = dict && dict[fr.trim()];
      if (en) { el.setAttribute(store, fr); el.setAttribute(a, en); }
    });
  }
  function attrsToFr(el) {
    ATTRS.forEach(function (a) {
      var store = "data-fr-" + a;
      if (el.hasAttribute(store)) { el.setAttribute(a, el.getAttribute(store)); el.removeAttribute(store); }
    });
  }
  function translateTree(scope) {
    if (lang !== "en" || !dict) return;
    if (scope.nodeType === 3) { nodeToEn(scope); return; }
    textNodes(scope).forEach(nodeToEn);
    attrsToEn(scope);
    $$(ATTR_SELECTOR, scope).forEach(attrsToEn);
  }
  function restoreAll() {
    textNodes(document.body).forEach(function (n) {
      if (origText.has(n)) { n.nodeValue = origText.get(n); origText.delete(n); }
    });
    $$("[data-fr-placeholder],[data-fr-aria-label],[data-fr-title],[data-fr-alt]").forEach(attrsToFr);
  }
  function applyTitle() {
    if (lang === "en" && dict) {
      document.title = frTitle.split(" – ").map(function (p) { return dict[p] || p; }).join(" – ");
    } else {
      document.title = frTitle;
    }
  }
  function setTitle(fr) { frTitle = fr; applyTitle(); }

  var observer;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function (muts) {
      if (lang !== "en" || !dict) return;
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes[i];
          if (n.nodeType === 1 || n.nodeType === 3) translateTree(n);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function loadDict(done) {
    if (dict) { done(); return; }
    if (window.ASTORE_EN) { dict = window.ASTORE_EN; done(); return; }
    var s = document.createElement("script");
    s.src = "i18n.js";
    s.onload = function () { dict = window.ASTORE_EN || {}; done(); };
    s.onerror = function () { dict = {}; done(); };
    document.head.appendChild(s);
  }
  function emitLang() {
    langListeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent("astore:lang", { detail: lang }));
  }
  function onLang(fn) { langListeners.push(fn); }
  function setLang(next) {
    lang = next === "en" ? "en" : "fr";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignoré */ }
    root.lang = lang;
    $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang)); });
    if (lang === "en") {
      loadDict(function () {
        translateTree(document.body);
        applyTitle();
        startObserver();
        emitLang();
      });
    } else {
      restoreAll();
      applyTitle();
      emitLang();
    }
  }

  /* ---------- 3. Base de données (Supabase) ---------- */
  var db = null;
  try {
    if (window.supabase && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY) {
      db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    }
  } catch (e) { console.error("Supabase :", e); }

  var settingsPromise;
  function loadSettings() {
    if (!settingsPromise) {
      settingsPromise = (db
        ? Promise.resolve(db.from("site_settings").select("key,value"))
        : Promise.resolve({ data: null }))
        .then(function (r) {
          var o = {};
          (r.data || []).forEach(function (x) { o[x.key] = x.value; });
          return o;
        })
        .catch(function () { return {}; });
    }
    return settingsPromise;
  }

  /* ---------- 4. Panier (conservé dans le navigateur) ---------- */
  var CART_KEY = "astore_cart";
  var cart = {
    get: function () {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
    },
    save: function (items) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* ignoré */ }
      window.dispatchEvent(new Event("astore:cart"));
    },
    count: function () {
      return this.get().reduce(function (n, i) { return n + i.qty; }, 0);
    },
    // Les prix du panier sont indicatifs : le serveur les revérifie à la commande.
    add: function (p, qty) {
      qty = qty || 1;
      var max = typeof p.stock === "number" ? p.stock : 99;
      if (max <= 0) return false;
      var items = this.get();
      var found = items.filter(function (i) { return i.id === p.id; })[0];
      if (found) found.qty = Math.min(found.qty + qty, max);
      else items.push({ id: p.id, slug: p.slug, name: p.name, price: p.promo_price != null ? p.promo_price : p.price, qty: Math.min(qty, max) });
      this.save(items);
      return true;
    },
    setQty: function (id, qty) {
      var items = this.get().map(function (i) { if (i.id === id) i.qty = Math.max(1, qty); return i; });
      this.save(items);
    },
    remove: function (id) {
      this.save(this.get().filter(function (i) { return i.id !== id; }));
    },
    clear: function () { this.save([]); }
  };

  function updateBadges() {
    var n = cart.count();
    $$("[data-cart-badge]").forEach(function (b) { b.textContent = n; b.hidden = n === 0; });
  }
  window.addEventListener("astore:cart", updateBadges);
  window.addEventListener("storage", updateBadges);
  window.addEventListener("pageshow", updateBadges);

  /* ---------- 5. Cartes produits ---------- */
  var products = {};
  function registerProducts(list) { (list || []).forEach(function (p) { products[p.id] = p; }); }

  function productCard(p) {
    var price = p.promo_price != null ? p.promo_price : p.price;
    var out = p.stock <= 0;
    var low = !out && p.stock <= 5;
    var stockLabel = out ? t("Rupture de stock") : low ? t("Plus que {n} en stock", { n: p.stock }) : t("En stock");
    var brand = p.brand && !/compl[eè]ter/i.test(p.brand) ? p.brand : (p.categories && p.categories.name) || "";
    var href = "produit.html?slug=" + encodeURIComponent(p.slug);
    return '<article class="pcard">' +
      '<a class="pcard-media" href="' + href + '"><img src="' + esc(IMG.product(p.slug)) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" width="300" height="300"></a>' +
      '<div class="pcard-body">' +
        '<p class="pcard-brand">' + esc(brand) + "</p>" +
        '<h3 class="pcard-title"><a href="' + href + '">' + esc(p.name) + "</a></h3>" +
        '<p class="pcard-price">' + (p.promo_price != null ? "<s>" + formatFCFA(p.price) + "</s>" : "") + formatFCFA(price) + "</p>" +
        '<p class="pcard-stock ' + (out ? "is-out" : low ? "is-low" : "is-ok") + '">' + esc(stockLabel) + "</p>" +
        '<div class="pcard-actions">' +
          '<a class="btn btn-ghost btn-sm" href="' + href + '">' + esc(t("Voir")) + "</a>" +
          '<button class="btn btn-primary btn-sm" type="button" data-add="' + esc(p.id) + '"' + (out ? " disabled" : "") + ">" + esc(t("Ajouter")) + "</button>" +
        "</div></div></article>";
  }

  // Tout bouton portant data-add="<id produit>" ajoute le produit au panier
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-add]");
    if (!btn) return;
    var p = products[btn.getAttribute("data-add")];
    if (!p) return;
    if (!cart.add(p)) { toast(t("Ce produit est indisponible.")); return; }
    toast(t("{name} ajouté au panier", { name: p.name }));
    $$("[data-cart-badge]").forEach(function (b) {
      b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    });
  });

  /* ---------- 6. En-tête ---------- */
  var PAGE = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";

  function navLink(key, href, label) {
    return '<a href="' + href + '"' + (PAGE === key ? ' aria-current="page"' : "") + ">" + label + "</a>";
  }

  var idxPromise;
  function loadIndex() {
    if (!idxPromise) {
      idxPromise = (db
        ? Promise.resolve(db.from("products").select("name,slug,brand,categories(name)").eq("is_active", true))
        : Promise.resolve({ data: [] }))
        .then(function (r) { return r.data || []; })
        .catch(function () { return []; });
    }
    return idxPromise;
  }

  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var tpl = document.createElement("template");
    tpl.innerHTML =
      '<header class="site-header">' +
        '<div class="wrap header-inner">' +
          '<a class="brand" href="index.html" aria-label="ASTORE"><img src="' + esc(IMG.logo) + '" alt="ASTORE" height="28" data-hide-on-error><span class="brand-text" data-fallback-text hidden>ASTORE</span></a>' +
          '<nav class="nav" id="nav" aria-label="Navigation principale">' +
            navLink("index", "index.html", "Accueil") +
            navLink("catalogue", "catalogue.html", "Catalogue") +
            navLink("actualites", "index.html#actualites", "Actualités") +
            navLink("contact", "contact.html", "Contact") +
          "</nav>" +
          '<div class="header-actions">' +
            '<div class="lang" role="group" aria-label="Langue">' +
              '<button type="button" data-lang="fr" aria-pressed="' + (lang === "fr") + '">FR</button>' +
              '<button type="button" data-lang="en" aria-pressed="' + (lang === "en") + '">EN</button>' +
            "</div>" +
            '<button class="icon-btn" id="search-toggle" type="button" aria-label="Rechercher" aria-expanded="false">' + svg(ICONS.search, 22) + "</button>" +
            '<a class="icon-btn header-cart" href="panier.html" aria-label="Panier">' + svg(ICONS.cart, 22) + '<span class="cart-badge" data-cart-badge hidden>0</span></a>' +
            '<button class="icon-btn menu-btn" id="menu-toggle" type="button" aria-label="Menu" aria-expanded="false">' + svg(ICONS.menu, 22) + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="search-panel" id="search-panel" hidden>' +
          '<div class="wrap">' +
            '<form class="search-form" role="search" action="catalogue.html">' +
              '<input class="input" type="search" name="q" id="search-input" placeholder="Rechercher un produit, une marque, une catégorie" autocomplete="off" aria-label="Rechercher">' +
              '<button class="btn btn-primary" type="submit">Rechercher</button>' +
            "</form>" +
            '<ul class="suggest" id="suggest" aria-live="polite"></ul>' +
          "</div>" +
        "</div>" +
      "</header>";
    host.replaceWith(tpl.content);

    var header = $(".site-header");
    var nav = $("#nav");
    var menuBtn = $("#menu-toggle");
    var panel = $("#search-panel");
    var input = $("#search-input");
    var list = $("#suggest");
    var searchBtn = $("#search-toggle");

    function onScroll() { header.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function closeMenu() {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.innerHTML = svg(ICONS.menu, 22);
    }
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.innerHTML = svg(open ? ICONS.close : ICONS.menu, 22);
      if (open) panel.hidden = true;
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });

    searchBtn.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      searchBtn.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) { closeMenu(); input.focus(); loadIndex(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      panel.hidden = true;
      searchBtn.setAttribute("aria-expanded", "false");
      closeMenu();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".site-header")) { closeMenu(); }
    });

    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = input.value.trim().toLowerCase();
        if (q.length < 2) { list.innerHTML = ""; return; }
        loadIndex().then(function (idx) {
          var hits = idx.filter(function (p) {
            return [p.name, p.brand, p.categories && p.categories.name].some(function (v) { return (v || "").toLowerCase().indexOf(q) !== -1; });
          }).slice(0, 6);
          list.innerHTML = hits.length
            ? hits.map(function (p) {
                return '<li><a href="produit.html?slug=' + encodeURIComponent(p.slug) + '"><span>' + esc(p.name) + "</span><small>" + esc((p.categories && p.categories.name) || "") + "</small></a></li>";
              }).join("")
            : '<li class="suggest-empty">' + esc(t("Aucun produit ne correspond à « {q} ». Essayez un autre mot.", { q: input.value.trim() })) + "</li>";
        });
      }, 120);
    });

    $$(".lang button", header).forEach(function (b) {
      b.addEventListener("click", function () {
        var next = b.getAttribute("data-lang");
        if (next !== lang) setLang(next);
      });
    });
  }

  /* ---------- 7. Pied de page ---------- */
  function renderFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    var tpl = document.createElement("template");
    tpl.innerHTML =
      '<footer class="site-footer">' +
        '<div class="wrap footer-inner">' +
          "<div>" +
            '<a class="brand" href="index.html" aria-label="ASTORE"><img src="' + esc(IMG.logo) + '" alt="ASTORE" height="28" data-hide-on-error><span class="brand-text" data-fallback-text hidden>ASTORE</span></a>' +
            '<p class="footer-tag">Appareils électroniques et accessoires, livrés à Douala.</p>' +
          "</div>" +
          "<div><h4>Boutique</h4><ul>" +
            '<li><a href="catalogue.html">Catalogue</a></li>' +
            '<li><a href="panier.html">Panier</a></li>' +
            '<li><a href="suivi.html">Suivre ma commande</a></li>' +
          "</ul></div>" +
          "<div><h4>Informations</h4><ul>" +
            '<li><a href="mentions-legales.html">Mentions légales</a></li>' +
            '<li><a href="cgv.html">Conditions générales de vente</a></li>' +
            '<li><a href="confidentialite.html">Politique de confidentialité</a></li>' +
          "</ul></div>" +
          '<div><h4>Contact</h4><ul id="footer-contact"><li>Chargement…</li></ul></div>' +
        "</div>" +
        '<div class="wrap footer-base"><small id="footer-copy"></small></div>' +
      "</footer>";
    host.replaceWith(tpl.content);
    renderCopyright();
  }
  function renderCopyright() {
    var el = $("#footer-copy");
    if (el) el.textContent = t("© {year} ASTORE. Tous droits réservés.", { year: new Date().getFullYear() });
  }

  /* ---------- 8. Barre de navigation mobile ---------- */
  function renderBottomNav() {
    var nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Navigation mobile");
    function item(key, href, icon, label, badge) {
      return '<a href="' + href + '"' + (PAGE === key ? ' aria-current="page"' : "") + ">" +
        svg(icon, 22) + (badge ? '<span class="cart-badge" data-cart-badge hidden>0</span>' : "") + "<span>" + label + "</span></a>";
    }
    nav.innerHTML =
      item("index", "index.html", ICONS.home, "Accueil") +
      item("catalogue", "catalogue.html", ICONS.grid, "Catalogue") +
      item("panier", "panier.html", ICONS.cart, "Panier", true) +
      item("suivi", "suivi.html", ICONS.track, "Suivi");
    document.body.appendChild(nav);
  }

  /* ---------- 9. Éléments dépendant des paramètres du site ---------- */
  function applySettings() {
    loadSettings().then(function (s) {
      if (s.payment_mode === "simulated") {
        var bar = document.createElement("div");
        bar.className = "demo-bar";
        bar.textContent = "Boutique de démonstration : les paiements sont simulés.";
        var header = $(".site-header");
        if (header) header.parentNode.insertBefore(bar, header);
      }

      var fc = $("#footer-contact");
      if (fc) {
        var rows = [];
        var place = [s.address, s.city].filter(Boolean).join(", ");
        if (place) rows.push(esc(place));
        if (s.phone) rows.push('<a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '">' + esc(s.phone) + "</a>");
        if (s.email) rows.push('<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a>");
        fc.innerHTML = rows.length
          ? rows.map(function (r) { return "<li>" + r + "</li>"; }).join("")
          : "<li>Coordonnées à renseigner dans l’administration.</li>";
      }

      var href = waLink(s.whatsapp, t("Bonjour ASTORE, j’aimerais avoir des informations."));
      var a = document.createElement("a");
      a.className = "wa-float";
      a.setAttribute("aria-label", "WhatsApp");
      a.innerHTML = svg(ICONS.wa, 26);
      if (href) { a.href = href; a.target = "_blank"; a.rel = "noopener"; }
      else {
        a.href = "#";
        a.addEventListener("click", function (e) { e.preventDefault(); toast(t("Numéro WhatsApp à renseigner dans l’administration.")); });
      }
      document.body.appendChild(a);
    });
  }

  /* ---------- 10. Préchargement (une seule fois par session) ---------- */
  var readyResolve;
  var readyPromise = new Promise(function (r) { readyResolve = r; });
  function markReady() { readyResolve(); }

  function initPreloader() {
    if (!root.classList.contains("has-preloader")) { root.classList.add("loaded"); return; }
    var el = document.createElement("div");
    el.className = "preloader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", "Chargement d’ASTORE");
    el.innerHTML =
      '<div class="pl-in">' +
        '<img class="pl-logo" src="' + esc(IMG.logo) + '" alt="ASTORE" data-hide-on-error><span class="pl-wordmark" data-fallback-text hidden>ASTORE</span>' +
        '<div class="pl-frame" hidden><video muted loop playsinline autoplay><source src="' + esc(IMG.loaderVideo || "loader.mp4") + '" type="video/mp4"></video></div>' +
        '<p class="pl-tag">ASTORE — Votre technologie, notre priorité</p>' +
        '<div class="pl-bar"><i></i></div>' +
      "</div>";
    document.body.insertBefore(el, document.body.firstChild);

    // La petite vidéo du préchargement est facultative (loader.mp4)
    var video = $("video", el);
    var frame = $(".pl-frame", el);
    video.addEventListener("loadeddata", function () { frame.hidden = false; });
    $("source", video).addEventListener("error", function () { video.remove(); });

    var loaded = new Promise(function (r) {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", r, { once: true });
    });
    var minimum = new Promise(function (r) { setTimeout(r, 700); });
    var safety = new Promise(function (r) { setTimeout(r, CFG.PRELOADER_MAX_MS || 6000); });
    Promise.race([Promise.all([loaded, readyPromise, minimum]), safety]).then(function () {
      el.classList.add("hide");
      root.classList.remove("has-preloader");
      root.classList.add("loaded");
      try { sessionStorage.setItem("astore_loader_seen", "1"); } catch (e) { /* ignoré */ }
      setTimeout(function () { el.remove(); }, 800);
    });
  }

  /* ---------- 11. Images manquantes : image de remplacement ---------- */
  function fixImage(img) {
    if (img.hasAttribute("data-hide-on-error")) {
      img.hidden = true;
      var next = img.nextElementSibling;
      if (next && next.hasAttribute("data-fallback-text")) next.hidden = false;
      return;
    }
    if (!img.dataset.fb) { img.dataset.fb = "1"; img.src = IMG.placeholder; }
  }
  document.addEventListener("error", function (e) {
    if (e.target && e.target.tagName === "IMG") fixImage(e.target);
  }, true);
  function scanImages() {
    $$("img").forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fixImage(img);
    });
  }

  /* ---------- 12. Apparition au défilement ---------- */
  var io;
  function observeReveals() {
    var pending = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { pending.forEach(function (el) { el.classList.add("in"); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -6% 0px" });
    }
    pending.forEach(function (el) { io.observe(el); });
  }
  function initReveal() {
    $$(".section-head, .cats, .tabs, .steps, .reassure-list, .contact-band-inner").forEach(function (el) { el.classList.add("reveal"); });
    observeReveals();
  }

  /* ---------- 13. Démarrage ---------- */
  root.lang = lang;
  renderHeader();
  renderFooter();
  renderBottomNav();
  initReveal();
  initPreloader();
  scanImages();
  window.addEventListener("load", scanImages);
  updateBadges();
  applySettings();
  onLang(renderCopyright);
  if (lang === "en") setLang("en");
  if (!document.body.hasAttribute("data-wait-data")) markReady();

  window.ASTORE = {
    db: db, t: t, esc: esc, formatFCFA: formatFCFA, waLink: waLink, toast: toast,
    cart: cart, products: products, registerProducts: registerProducts, productCard: productCard,
    loadSettings: loadSettings, markReady: markReady, onLang: onLang, setTitle: setTitle,
    getLang: function () { return lang; }, observeReveals: observeReveals,
    images: IMG, config: CFG, $: $, $$: $$
  };
})();