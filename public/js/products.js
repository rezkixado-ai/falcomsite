(() => {
  'use strict';

  const state = { sessionId: null, escalated: false, categories: [], activeCategory: 'all' };
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  async function getJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  /* ---------- Categories + product grid, synced with ?category= in the URL ---------- */
  async function loadCategories() {
    try { state.categories = await getJSON('/api/categories'); } catch (e) { console.warn(e); state.categories = []; }
    const list = $('#categoryList');
    const items = [{ name: 'ALL', slug: 'all' }, ...state.categories];
    list.innerHTML = items.map(c => `<li><a href="#" data-slug="${c.slug}">${c.name}</a></li>`).join('');
    list.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-slug]');
      if (!link) return;
      e.preventDefault();
      setCategory(link.dataset.slug);
    });
  }

  function renderActiveCategory() {
    $$('#categoryList a').forEach(a => a.classList.toggle('is-active', a.dataset.slug === state.activeCategory));
    const current = state.categories.find(c => c.slug === state.activeCategory);
    $('#breadcrumbCurrent').textContent = current ? current.name : 'Products';
    $('#pageTitle').textContent = current ? current.name : 'All Products';
  }

  async function loadProducts() {
    const grid = $('#productsPageGrid');
    const empty = $('#emptyState');
    let products = [];
    try {
      const q = state.activeCategory !== 'all' ? `?category=${encodeURIComponent(state.activeCategory)}` : '';
      products = await getJSON(`/api/products${q}`);
    } catch (e) { console.warn(e); }

    $('#pageSubtitle').textContent = `${products.length} produk tersedia dalam kategori ini`;

    if (!products.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = products.map(p => `
      <a class="product-card" href="/products/${p.slug}">
        <div class="thumb"><img src="${p.image_url || '/img/product-1.svg'}" alt="${p.name}" loading="lazy" width="480" height="480"></div>
        <div class="body">
          <h3>${p.name}</h3>
          <p>${p.short_desc || ''}</p>
        </div>
      </a>`).join('');
  }

  function setCategory(slug) {
    state.activeCategory = slug;
    const url = new URL(location.href);
    if (slug === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', slug);
    history.replaceState({}, '', url);
    renderActiveCategory();
    loadProducts();
  }

  async function initCatalog() {
    await loadCategories();
    const params = new URLSearchParams(location.search);
    state.activeCategory = params.get('category') || 'all';
    renderActiveCategory();
    loadProducts();
  }

  /* ---------- Chat widget (same behavior as the homepage) ---------- */
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

  document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = new Date().getFullYear();
    initCatalog();
    initChat();
  });
})();
