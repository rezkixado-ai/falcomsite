(() => {
  'use strict';

  const state = { settings: {}, waNumber: '', failLimit: 3, sessionId: null, unresolved: 0, escalated: false };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  async function getJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }
  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  /* ---------- Settings / nav opacity ---------- */
  async function loadSettings() {
    try {
      state.settings = await getJSON('/api/settings');
      const opacity = Math.min(1, Math.max(0, parseFloat(state.settings.nav_opacity ?? '0')));
      document.documentElement.style.setProperty('--nav-bg-opacity', opacity);
      state.waNumber = state.settings.wa_admin_number || '';
      state.failLimit = parseInt(state.settings.chat_fail_limit || '3', 10);
      renderContactInfo();
      applyNavStyle(state.settings.nav_style || 'default');
      applyStatsFont(state.settings.stats_font || '');
    } catch (e) { console.warn('settings failed', e); }
  }

  // Lets the admin type any Google Font family name into Settings (e.g.
  // "Orbitron", "Bebas Neue") and have it apply to the hit-counter numbers
  // without a code change. Falls back to --font-mono if left blank.
  function applyStatsFont(fontName) {
    const name = (fontName || '').trim();
    if (!name) return;
    const linkId = 'stats-font-link';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty('--font-stats', `'${name}', var(--font-mono)`);
  }

  // Alternate navbar template: swaps the "Hubungi Kami" button for an ID/EN
  // toggle switch. The switch itself only flips its own visual state and
  // remembers the choice locally — it does not translate page content yet
  // (that needs bilingual content fields, a separate feature).
  function applyNavStyle(style) {
    const contactBtn = $('#navContactBtn');
    const langToggle = $('#langToggle');
    const searchBtn = $('#navSearchBtn');
    if (!contactBtn || !langToggle) return; // sub-pages use a simpler nav without these
    if (style === 'lang_toggle') {
      contactBtn.classList.add('hidden');
      langToggle.classList.remove('hidden');
      if (searchBtn) searchBtn.classList.remove('hidden');
      const saved = localStorage.getItem('falcom_lang') || 'id';
      applyLang(saved);
      const toggle = () => {
        const next = langToggle.getAttribute('aria-checked') === 'true' ? 'id' : 'en';
        applyLang(next);
      };
      langToggle.addEventListener('click', toggle);
      langToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    } else {
      contactBtn.classList.remove('hidden');
      langToggle.classList.add('hidden');
      if (searchBtn) searchBtn.classList.add('hidden');
    }
  }

  /* ---------- Static-UI translation (nav, buttons, labels hardcoded in HTML).
     Does NOT translate CMS-managed content (hero text, articles, products,
     network, chatbot) — that needs bilingual fields in the database, a
     separate, larger feature. ---------- */
  const I18N = {
    id: {
      'nav.tentang':'Tentang','nav.jaringan':'Jaringan','nav.produk':'Produk','nav.klien':'Klien','nav.artikel':'Artikel','nav.kontak':'Kontak',
      'hero.contactSales':'Hubungi Sales',
      'about.eyebrow':'Tentang Falcom',
      'network.eyebrow':'Jaringan Distribusi',
      'products.eyebrow':'Lini Produk','products.viewAll':'Lihat Semua Produk',
      'clients.eyebrow':'Dipercaya Oleh',
      'articles.eyebrow':'Wawasan',
      'videos.eyebrow':'Video Tutorial','videos.channel':'YouTube Channel',
      'contact.eyebrow':'Hubungi Kami','contact.formName':'Nama lengkap','contact.formCompany':'Perusahaan / ISP','contact.formEmail':'Email','contact.formMessage':'Ceritakan kebutuhan Anda...','contact.submit':'Kirim Pesan',
      'chat.title':'Falcom Assistant','chat.status':'Online','chat.placeholder':'Tulis pesan...',
      'search.placeholder':'Cari artikel atau produk...','search.hint':'Ketik untuk mencari produk atau artikel...',
      'footer.tagline':'Elevate Connectivity Across Indonesia',
    },
    en: {
      'nav.tentang':'About','nav.jaringan':'Network','nav.produk':'Products','nav.klien':'Clients','nav.artikel':'Articles','nav.kontak':'Contact',
      'hero.contactSales':'Contact Sales',
      'about.eyebrow':'About Falcom',
      'network.eyebrow':'Distribution Network',
      'products.eyebrow':'Product Line','products.viewAll':'View All Products',
      'clients.eyebrow':'Trusted By',
      'articles.eyebrow':'Insights',
      'videos.eyebrow':'Video Tutorials','videos.channel':'YouTube Channel',
      'contact.eyebrow':'Contact','contact.formName':'Full name','contact.formCompany':'Company / ISP','contact.formEmail':'Email','contact.formMessage':'Tell us what you need...','contact.submit':'Send Message',
      'chat.title':'Falcom Assistant','chat.status':'Online','chat.placeholder':'Type a message...',
      'search.placeholder':'Search articles or products...','search.hint':'Start typing to search products or articles...',
      'footer.tagline':'Elevate Connectivity Across Indonesia',
    },
  };
  function applyLang(lang) {
    lang = lang === 'en' ? 'en' : 'id';
    localStorage.setItem('falcom_lang', lang);
    const dict = I18N[lang];
    $$('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v) el.textContent = v; });
    $$('[data-i18n-placeholder]').forEach(el => { const v = dict[el.dataset.i18nPlaceholder]; if (v) el.placeholder = v; });
    const langToggle = $('#langToggle');
    if (langToggle) langToggle.setAttribute('aria-checked', String(lang === 'en'));
    document.documentElement.lang = lang;
  }

  /* ---------- Search (client-side, across cached articles + products) ---------- */
  /* ---------- Why Falcom cards — click to select (glow), default = 3rd card ---------- */
  function initWhyFalcom() {
    const cards = $$('#whyFalcomGrid .why-card');
    if (!cards.length) return;
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
      });
    });
  }

  /* ---------- System Solution ---------- */
  async function initSolutions() {
    const grid = $('#solutionGrid');
    const tabsEl = $('#solutionTabs');
    if (!grid || !tabsEl) return;
    let categories = [], solutions = [];
    try {
      [categories, solutions] = await Promise.all([
        getJSON('/api/solution-categories'),
        getJSON('/api/solutions'),
      ]);
    } catch (e) { console.warn(e); }
    if (!categories.length) return;

    let active = categories[0].slug;
    tabsEl.innerHTML = categories.map(c =>
      `<button type="button" class="solution-tab${c.slug === active ? ' is-active' : ''}" data-slug="${c.slug}">${c.name}</button>`
    ).join('');

    function renderGrid() {
      const items = solutions.filter(s => s.category_slug === active);
      grid.innerHTML = items.length ? items.map(s => `
        <a class="solution-card" href="${s.link_url || '#solusi'}">
          <img src="${s.image_url || '/img/solution-1.svg'}" alt="${s.name}" loading="lazy">
          <div class="solution-card__overlay">
            <h3>${s.name}</h3>
            <span>Detail solusi &rarr;</span>
          </div>
        </a>`).join('') : '<p style="color:var(--steel)">Solusi untuk kategori ini akan segera hadir.</p>';
    }
    tabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.solution-tab');
      if (!btn) return;
      active = btn.dataset.slug;
      $$('.solution-tab', tabsEl).forEach(b => b.classList.toggle('is-active', b === btn));
      renderGrid();
    });
    renderGrid();
  }

  /* ---------- Testimonials carousel (2 selectable card styles) ---------- */
  async function initTestimonials() {
    const track = $('#testimonialTrack');
    if (!track) return;
    let items = [];
    try { items = await getJSON('/api/testimonials'); } catch (e) { console.warn(e); }
    if (!items.length) { $('#testimonialCarousel')?.closest('.testimonials')?.classList.add('hidden'); return; }

    const style = (state.settings && state.settings.testimonial_style) || 'style1';
    const quoteIcon = `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 6C6 6 3.5 8.7 3.5 12.3c0 3 1.9 5.2 4.5 5.2 2 0 3.5-1.5 3.5-3.4 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.7 1.9-3 3.8-3.2V6zm10 0c-3.5 0-6 2.7-6 6.3 0 3 1.9 5.2 4.5 5.2 2 0 3.5-1.5 3.5-3.4 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.7 1.9-3 3.8-3.2V6z"/></svg>`;

    track.className = 'testimonial-track testimonial-track--' + style;
    track.innerHTML = items.map(t => style === 'style2' ? `
      <div class="testimonial-card testimonial-card--2">
        <div class="testimonial-card__quote-icon">${quoteIcon}</div>
        <p class="testimonial-card__text">${t.quote}</p>
        <div class="testimonial-card__person">
          <img src="${t.photo_url || '/img/avatar-1.svg'}" alt="${t.name}">
          <div><strong>${t.name}</strong><span>${t.role || ''}</span></div>
        </div>
      </div>` : `
      <div class="testimonial-card testimonial-card--1">
        <div class="testimonial-card__top">
          <img class="testimonial-card__avatar" src="${t.photo_url || '/img/avatar-1.svg'}" alt="${t.name}">
          <span class="testimonial-card__quote-icon">${quoteIcon}</span>
        </div>
        <h3>${t.headline || ''}</h3>
        <p class="testimonial-card__text">&ldquo;${t.quote}&rdquo;</p>
        <div class="testimonial-card__footer">
          <strong>${t.name}</strong>
          <span>${t.role || ''}</span>
        </div>
      </div>`).join('');

    const cards = $$('.testimonial-card', track);
    const dotsEl = $('#testimonialDots');
    let index = 0;
    dotsEl.innerHTML = items.map((_, i) => `<button type="button" class="testimonial-dot${i === 0 ? ' is-active' : ''}" data-i="${i}"></button>`).join('');

    function goTo(i) {
      index = (i + cards.length) % cards.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      $$('.testimonial-dot', dotsEl).forEach((d, di) => d.classList.toggle('is-active', di === index));
    }
    $('#testiPrev').addEventListener('click', () => goTo(index - 1));
    $('#testiNext').addEventListener('click', () => goTo(index + 1));
    dotsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.testimonial-dot');
      if (btn) goTo(parseInt(btn.dataset.i, 10));
    });
    goTo(0);
  }

  function initSearch() {
    const btn = $('#navSearchBtn');
    const overlay = $('#searchOverlay');
    const input = $('#searchInput');
    const results = $('#searchResults');
    if (!btn || !overlay) return;
    let cache = null;

    async function ensureCache() {
      if (cache) return cache;
      const [articles, products] = await Promise.all([
        getJSON('/api/articles').catch(() => []),
        getJSON('/api/products').catch(() => []),
      ]);
      cache = { articles, products };
      return cache;
    }
    function open() {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input.focus(), 50);
      ensureCache();
    }
    function close() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    function render(query) {
      const q = query.trim().toLowerCase();
      const lang = localStorage.getItem('falcom_lang') || 'id';
      if (!q) { results.innerHTML = `<p class="search-hint">${I18N[lang]['search.hint']}</p>`; return; }
      if (!cache) { results.innerHTML = '<p class="search-hint">...</p>'; return; }
      const matchedArticles = cache.articles.filter(a => (a.title || '').toLowerCase().includes(q)).slice(0, 6);
      const matchedProducts = cache.products.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 6);
      if (!matchedArticles.length && !matchedProducts.length) {
        results.innerHTML = '<p class="search-hint">Tidak ada hasil ditemukan.</p>';
        return;
      }
      let html = '';
      if (matchedProducts.length) {
        html += '<div class="search-group-label">Produk</div>' + matchedProducts.map(p => `
          <a class="search-result" href="/products/${p.slug}">
            <img src="${p.image_url || '/img/product-1.svg'}" alt="">
            <div><div class="title">${p.name}</div><div class="sub">${p.category || ''}</div></div>
          </a>`).join('');
      }
      if (matchedArticles.length) {
        html += '<div class="search-group-label">Artikel</div>' + matchedArticles.map(a => `
          <a class="search-result" href="/artikel/${a.slug}">
            <img src="${a.cover_image || '/img/article-1.svg'}" alt="">
            <div><div class="title">${a.title}</div><div class="sub">${a.category || ''}</div></div>
          </a>`).join('');
      }
      results.innerHTML = html;
    }
    btn.addEventListener('click', open);
    $('#searchClose').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) close(); });
    input.addEventListener('input', debounce(() => render(input.value), 150));
  }

  function renderContactInfo() {
    const el = $('#contactInfo');
    if (!el) return;
    const s = state.settings;
    el.innerHTML = `
      <div class="row"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 8l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.6"/></svg>
        <div><strong>Email</strong><span>${s.contact_email || '-'}</span></div></div>
      <div class="row"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8 9.9a16 16 0 006 6l1.4-1.4a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.8 2.2z" stroke="currentColor" stroke-width="1.6"/></svg>
        <div><strong>Telepon</strong><span>${s.contact_phone || '-'}</span></div></div>
      <div class="row"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.6"/></svg>
        <div><strong>Kantor Pusat</strong><span>${s.hq_address || '-'}</span></div></div>`;
  }

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = $('#siteNav');
    const toggle = $('#navToggle');
    const links = $('#navLinks');
    const setNavHeight = () => document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    const onScroll = () => { nav.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.7); setNavHeight(); };
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', debounce(setNavHeight, 150));
    onScroll();
    setNavHeight();

    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || '');
  }

  /* ---------- Hero slider ---------- */
  async function initHero() {
    let slides = [];
    try { slides = await getJSON('/api/hero-slides'); } catch (e) { console.warn(e); }
    if (!slides.length) return;
    const wrap = $('#heroSlides');
    const dotsWrap = $('#heroDots');
    const interval = 6000;
    document.documentElement.style.setProperty('--hero-interval', `${interval}ms`);

    wrap.innerHTML = slides.map((s, i) => `
      <div class="hero-slide${i === 0 ? ' is-active' : ''}" data-i="${i}">
        ${isVideoUrl(s.image_url)
          ? `<video class="slide-bg" src="${s.image_url}" autoplay muted loop playsinline></video>`
          : `<img class="slide-bg" src="${s.image_url}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" fetchpriority="${i === 0 ? 'high' : 'low'}">`}
        <div class="hero-content container">
          <div class="hero-text">
            <div class="eyebrow">${s.eyebrow || ''}</div>
            <h1 class="hero-title">${s.title}</h1>
            <p class="hero-sub">${s.subtitle || ''}</p>
            <div class="hero-actions">
              <a href="${s.cta_link || '#'}" class="btn btn-primary">${s.cta_text || 'Selengkapnya'}</a>
              <a href="#kontak" class="btn btn-ghost" data-i18n="hero.contactSales">Hubungi Sales</a>
            </div>
          </div>
        </div>
      </div>`).join('');
    applyLang(localStorage.getItem('falcom_lang') || 'id');

    dotsWrap.innerHTML = slides.map((_, i) => `<button class="hero-dot${i === 0 ? ' is-active' : ''}" data-i="${i}" aria-label="Slide ${i + 1}"><span></span></button>`).join('');

    let current = 0;
    let timer;
    const slideEls = $$('.hero-slide', wrap);
    const dotEls = $$('.hero-dot', dotsWrap);

    function goTo(i) {
      current = (i + slideEls.length) % slideEls.length;
      slideEls.forEach((el, idx) => el.classList.toggle('is-active', idx === current));
      dotEls.forEach((el, idx) => {
        el.classList.toggle('is-active', idx === current);
        if (idx === current) { el.querySelector('span').style.animation = 'none'; void el.offsetWidth; el.querySelector('span').style.animation = ''; }
      });
      restart();
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), interval);
    }
    $('#heroPrev').addEventListener('click', () => goTo(current - 1));
    $('#heroNext').addEventListener('click', () => goTo(current + 1));
    dotEls.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.i, 10))));

    // swipe support
    let touchX = null;
    wrap.addEventListener('touchstart', e => (touchX = e.touches[0].clientX), { passive: true });
    wrap.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });

    restart();
  }

  /* ---------- Counters ---------- */
  async function initStats() {
    let stats = [];
    try { stats = await getJSON('/api/stats'); } catch (e) { console.warn(e); }
    const grid = $('#statsGrid');
    const wrap = $('#statsGrid')?.closest('.stats-grid') || grid;
    if (!grid || !stats.length) return;
    grid.innerHTML = stats.map(s => `
      <div class="stat-card${s.image_url ? ' has-bg' : ''}"${s.image_url ? ` style="--stat-bg:url('${s.image_url}')"` : ''}>
        <div class="stat-value"><span class="count" data-target="${s.value}">0</span>${s.suffix || ''}</div>
        <div class="stat-label">${s.label}</div>
      </div>`).join('');

    const counters = $$('.count', grid);
    let loopTimer = null;

    function playAll() {
      wrap.classList.add('is-counting');
      counters.forEach(c => animateCount(c));
      setTimeout(() => wrap.classList.remove('is-counting'), 700);
    }

    function startLoop() {
      if (loopTimer) return; // already looping
      playAll();
      loopTimer = setInterval(playAll, 5000);
    }
    function stopLoop() {
      if (!loopTimer) return;
      clearInterval(loopTimer);
      loopTimer = null;
    }

    // threshold 0.4 + no unobserve: re-triggers whether the section scrolls
    // into view from above or below, and stops (saving cycles) once it's
    // fully out of view again.
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => (entry.isIntersecting ? startLoop() : stopLoop()));
    }, { threshold: 0.4 });
    io.observe(wrap);
  }

  function animateCount(el) {
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = 1600;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString('id-ID');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Sales network + map ---------- */
  async function initNetwork() {
    let list = [];
    try { list = await getJSON('/api/sales-network'); } catch (e) { console.warn(e); }
    const mapWrap = $('#mapWrap');
    const listEl = $('#networkList');
    if (!list.length || !mapWrap || !listEl) return;

    // #mapPoints already sits inside the static .map-surface / #mapWrap markup
    // (see index.html) — the surface just clips the map image's rounded
    // corners, while pins/popup live outside that clip so popups can overflow.
    const points = $('#mapPoints', mapWrap);

    points.innerHTML = list.map((n, i) => `
      <button type="button" class="map-point${n.is_hq ? ' is-hq' : ''}" data-i="${i}" style="left:${n.map_x}%;top:${n.map_y}%" aria-label="${n.city}">
        <span class="pin-wrap">
          <span class="pulse"></span>
          <span class="pin"><i></i></span>
        </span>
        <span class="label">${n.city}</span>
      </button>`).join('');

    listEl.innerHTML = list.map((n, i) => `
      <div class="network-item" data-i="${i}">
        <div>
          <div class="city">${n.city} ${n.is_hq ? '<span class="badge">Pusat</span>' : ''}</div>
          <div class="region">${n.region || ''}</div>
        </div>
        <address>${n.address || ''}${n.phone ? `<br>${n.phone}` : ''}</address>
      </div>`).join('');

    let popup = $('.map-popup', mapWrap);
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'map-popup';
      mapWrap.appendChild(popup);
    }

    const pins = $$('.map-point', points);
    const items = $$('.network-item', listEl);
    let activeIndex = null;

    const iconPin = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.8"/></svg>`;
    const iconPhone = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8 9.9a16 16 0 006 6l1.4-1.4a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.8 2.2z" stroke="currentColor" stroke-width="1.8"/></svg>`;

    function renderPopup(n) {
      popup.innerHTML = `
        <button type="button" class="close" aria-label="Tutup">&times;</button>
        <span class="badge">${n.is_hq ? 'Kantor Pusat' : 'Titik Distribusi'}</span>
        <div class="city">${n.city}</div>
        <div class="region">${n.region || ''}</div>
        ${n.address ? `<div class="row">${iconPin}<span>${n.address}</span></div>` : ''}
        ${n.phone ? `<div class="row">${iconPhone}<a href="tel:${n.phone.replace(/\s+/g, '')}">${n.phone}</a></div>` : ''}
      `;
      $('.close', popup).addEventListener('click', (e) => { e.stopPropagation(); closePopup(); });
    }

    function openPopup(i) {
      const n = list[i];
      if (!n) return;
      pins.forEach(p => p.classList.remove('is-active'));
      items.forEach(it => it.classList.remove('is-active'));
      pins[i].classList.add('is-active');
      items[i].classList.add('is-active');
      renderPopup(n);
      popup.style.left = `${n.map_x}%`;
      popup.style.top = `${n.map_y}%`;
      popup.style.setProperty('--nudge', '0px');
      popup.classList.remove('is-open');
      // measure after layout so the card can nudge itself back inside the
      // map on narrow screens, then trigger the pop-in animation
      requestAnimationFrame(() => {
        const rect = popup.getBoundingClientRect();
        const wrapRect = mapWrap.getBoundingClientRect();
        let nudge = 0;
        if (wrapRect.left - rect.left > 0) nudge = (wrapRect.left - rect.left) + 10;
        if (rect.right - wrapRect.right > 0) nudge = -((rect.right - wrapRect.right) + 10);
        popup.style.setProperty('--nudge', `${nudge}px`);
        popup.classList.add('is-open');
      });
      activeIndex = i;
    }
    function closePopup() {
      popup.classList.remove('is-open');
      pins.forEach(p => p.classList.remove('is-active'));
      items.forEach(it => it.classList.remove('is-active'));
      activeIndex = null;
    }

    pins.forEach((pin, i) => pin.addEventListener('click', (e) => {
      e.stopPropagation();
      activeIndex === i ? closePopup() : openPopup(i);
    }));
    items.forEach((item, i) => item.addEventListener('click', () => {
      activeIndex === i ? closePopup() : openPopup(i);
    }));
    mapWrap.addEventListener('click', (e) => {
      if (!e.target.closest('.map-point, .map-popup')) closePopup();
    });
  }

  /* ---------- Products (static — edit copy here) ---------- */
  /* ---------- Products (featured, pulled from the shared product catalog) ---------- */
  async function initProducts() {
    let products = [];
    try { products = await getJSON('/api/products?featured=1'); } catch (e) { console.warn(e); }
    const grid = $('#productGrid');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = '<p style="color:var(--steel)">Produk unggulan akan segera hadir.</p>';
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card reveal">
        <div class="thumb"><img src="${p.image_url || '/img/product-1.svg'}" alt="${p.name}" loading="lazy" width="480" height="480"></div>
        <div class="body">
          <h3>${p.name}</h3>
          <p>${p.short_desc || ''}</p>
          <a href="/products/${p.slug}">Pelajari lebih lanjut &rarr;</a>
        </div>
      </div>`).join('');
    observeReveal();
  }

  /* ---------- Video Tutorial ---------- */
  async function initVideos() {
    let videos = [];
    try { videos = await getJSON('/api/videos'); } catch (e) { console.warn(e); }
    const grid = $('#videoGrid');
    if (!grid || !videos.length) return;
    grid.innerHTML = videos.map(v => `
      <a class="video-card reveal" href="${v.youtube_url}" target="_blank" rel="noopener">
        <div class="thumb">
          <img src="${v.thumbnail_url || '/img/video-1.svg'}" alt="" loading="lazy" width="640" height="360">
          <span class="play"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 5l12 7-12 7V5z" fill="white"/></svg></span>
        </div>
        <div class="body">
          <h3>${v.title}</h3>
          <div class="channel">${v.channel_name || 'Falcom Technology Official'}</div>
        </div>
      </a>`).join('');
    observeReveal();
  }

  /* ---------- Client conveyor ---------- */
  async function initClients() {
    let clients = [];
    try { clients = await getJSON('/api/clients'); } catch (e) { console.warn(e); }
    const track = $('#conveyorTrack');
    const conveyor = $('#conveyor');
    if (!clients.length || !track) return;
    const doubled = [...clients, ...clients];
    track.innerHTML = doubled.map((c, i) => `
      <div class="client-card" data-name="${c.name}" data-idx="${i % clients.length}">
        <img src="${c.logo_url}" alt="${c.name}" loading="lazy" width="120" height="38">
      </div>`).join('');

    $$('.client-card', track).forEach(card => {
      card.addEventListener('click', () => {
        const idx = card.dataset.idx;
        const alreadySelected = card.classList.contains('is-selected');
        $$('.client-card', track).forEach(c => c.classList.remove('is-selected'));
        conveyor.classList.remove('has-selection');
        if (!alreadySelected) {
          $$(`.client-card[data-idx="${idx}"]`, track).forEach(c => c.classList.add('is-selected'));
          conveyor.classList.add('has-selection');
        }
      });
    });
  }

  /* ---------- Articles ---------- */
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  async function initArticles() {
    let articles = [];
    try { articles = await getJSON('/api/articles'); } catch (e) { console.warn(e); }
    const grid = $('#articleGrid');
    if (!grid) return;
    if (!articles.length) {
      grid.innerHTML = '<p style="color:var(--steel)">Artikel akan segera hadir.</p>';
      return;
    }
    grid.innerHTML = articles.map(a => `
      <a class="article-card reveal" href="/artikel/${a.slug}">
        <div class="thumb">
          <img src="${a.cover_image || '/img/article-1.svg'}" alt="" loading="lazy" width="480" height="300">
          <span class="article-card__badge">${(a.category || 'Artikel').toUpperCase()}</span>
        </div>
        <div class="body">
          <h3>${a.title}</h3>
          <div class="date"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>${formatDate(a.publish_at || a.created_at)}</div>
        </div>
      </a>`).join('');
    observeReveal();
  }

  /* ---------- Contact form -> WhatsApp ---------- */
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const text = `Halo Falcom Technology, saya ${data.get('name')} dari ${data.get('company') || '-'} (${data.get('email')}).\n\n${data.get('message')}`;
      window.open(`https://wa.me/${state.waNumber}?text=${encodeURIComponent(text)}`, '_blank');
    });
  }

  /* ---------- Reveal on scroll ---------- */
  let revealIO;
  function observeReveal() {
    revealIO = revealIO || new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIO.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$('.reveal:not(.is-visible)').forEach(el => revealIO.observe(el));
  }

  /* ---------- Chat widget ---------- */
  function chatMsg(body, sender = 'bot') {
    const wrap = document.createElement('div');
    wrap.className = `msg msg-${sender}`;
    wrap.textContent = body;
    $('#chatBody').appendChild(wrap);
    $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
  }
  function chatEscalate(waLink) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg-escalate';
    wrap.innerHTML = `Pertanyaan ini sebaiknya dijawab langsung oleh tim kami.<br><a href="${waLink}" target="_blank" rel="noopener" class="chat-wa-btn">Lanjut ke WhatsApp Admin</a>`;
    $('#chatBody').appendChild(wrap);
    $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
  }

  async function ensureSession() {
    if (state.sessionId) return;
    try {
      const data = await getJSON('/api/chat/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      state.sessionId = data.session_id;
      chatMsg(data.greeting, 'bot');
    } catch (e) { console.warn(e); }
  }

  async function sendChat(text) {
    if (!text.trim() || state.escalated) return;
    chatMsg(text, 'user');
    try {
      const data = await getJSON('/api/chat/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: state.sessionId, message: text }),
      });
      chatMsg(data.reply, 'bot');
      if (data.escalate) { state.escalated = true; chatEscalate(data.wa_link); }
    } catch (e) { chatMsg('Koneksi terganggu, silakan coba lagi.', 'bot'); }
  }

  function initChat() {
    const launcher = $('#chatLauncher');
    const win = $('#chatWindow');
    const closeBtn = $('#chatClose');
    const form = $('#chatForm');
    const input = $('#chatInput');

    launcher.addEventListener('click', async () => {
      win.classList.add('is-open');
      launcher.style.display = 'none';
      await ensureSession();
    });
    closeBtn.addEventListener('click', () => { win.classList.remove('is-open'); launcher.style.display = 'flex'; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value;
      input.value = '';
      sendChat(val);
    });
    $$('#chatQuick button').forEach(b => b.addEventListener('click', async () => {
      await ensureSession();
      sendChat(b.dataset.q);
    }));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    $('#year').textContent = new Date().getFullYear();
    initNav();
    await loadSettings();
    initHero();
    initStats();
    initNetwork();
    initProducts();
    initVideos();
    initSolutions();
    initTestimonials();
    initClients();
    initArticles();
    initContactForm();
    initChat();
    initSearch();
    initWhyFalcom();
    observeReveal();
    window.addEventListener('load', observeReveal);
  });
})();
