(() => {
  'use strict';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const state = { sessionId: null, escalated: false, waNumber: '6281234567890', gallery: [], galIndex: 0, product: null };

  async function getJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  /* ---------- Gallery ---------- */
  function renderGallery(images) {
    state.gallery = images.length ? images : ['/img/product-1.svg'];
    state.galIndex = 0;
    const thumbs = $('#galThumbs');
    thumbs.innerHTML = state.gallery.map((src, i) =>
      `<button type="button" class="gallery-thumb${i === 0 ? ' is-active' : ''}" data-i="${i}"><img src="${src}" alt=""></button>`
    ).join('');
    thumbs.classList.toggle('hidden', state.gallery.length < 2);
    $$('.gallery-nav').forEach(b => b.classList.toggle('hidden', state.gallery.length < 2));
    showGalleryImage(0);
    thumbs.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-thumb');
      if (btn) showGalleryImage(parseInt(btn.dataset.i, 10));
    });
  }
  function showGalleryImage(i) {
    state.galIndex = (i + state.gallery.length) % state.gallery.length;
    $('#galMainImg').src = state.gallery[state.galIndex];
    $$('.gallery-thumb').forEach((t, idx) => t.classList.toggle('is-active', idx === state.galIndex));
  }
  $('#galPrev').addEventListener('click', () => showGalleryImage(state.galIndex - 1));
  $('#galNext').addEventListener('click', () => showGalleryImage(state.galIndex + 1));

  /* ---------- Tabs ---------- */
  $$('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn[data-tab]').forEach(b => b.classList.remove('is-active'));
      $$('.tab-panel').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      $(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add('is-active');
    });
  });

  /* ---------- Related products ---------- */
  async function renderRelated(product) {
    const grid = $('#relatedGrid');
    if (!product.category) { grid.closest('.related-products').classList.add('hidden'); return; }
    let items = [];
    try { items = await getJSON(`/api/products?category=${encodeURIComponent(product.category)}`); } catch (e) { console.warn(e); }
    items = items.filter(p => p.slug !== product.slug).slice(0, 4);
    if (!items.length) { grid.closest('.related-products').classList.add('hidden'); return; }
    grid.innerHTML = items.map(p => `
      <a class="product-card" href="/products/${p.slug}">
        <div class="thumb"><img src="${p.image_url || '/img/product-1.svg'}" alt="${p.name}" loading="lazy" width="480" height="480"></div>
        <div class="body">
          <span class="related-cat">${(p.category || '').toUpperCase()}</span>
          <h3>${p.name}</h3>
        </div>
      </a>`).join('');
  }

  /* ---------- Quote form -> WhatsApp ---------- */
  $('#quoteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const productName = state.product ? state.product.name : '';
    const text = `Halo Falcom Technology, saya ${data.get('name')} dari ${data.get('company') || '-'} (${data.get('email')}).\n\nSaya ingin minta penawaran untuk: ${productName}\n\n${data.get('message') || ''}`;
    window.open(`https://wa.me/${state.waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  });

  /* ---------- Ask About Product / Share ---------- */
  $('#prodAskBtn').addEventListener('click', async () => {
    $('#chatWindow').classList.add('is-open');
    $('#chatLauncher').style.display = 'none';
    await ensureSession();
    if (state.product) sendChat(`Saya ingin tanya tentang produk: ${state.product.name}`);
  });
  $('#prodShareBtn').addEventListener('click', async () => {
    const shareData = { title: document.title, url: location.href };
    if (navigator.share) { try { await navigator.share(shareData); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(location.href); alert('Link disalin ke clipboard.'); } catch (e) {} }
  });

  /* ---------- Load product ---------- */
  async function loadProduct() {
    const slug = location.pathname.split('/').pop();
    try {
      const [p, settings] = await Promise.all([
        getJSON(`/api/products/${slug}`),
        getJSON('/api/settings').catch(() => ({})),
      ]);
      state.product = p;
      state.waNumber = settings.wa_admin_number || state.waNumber;

      document.title = `${p.name} — Falcom Technology`;
      $('#pageDesc').setAttribute('content', p.short_desc || '');
      $('#prodCategory').textContent = p.category || 'Produk';
      $('#prodCategoryText').textContent = p.category || '-';
      $('#prodName').textContent = p.name;
      $('#prodDescription').innerHTML = p.description || `<p>${p.short_desc || ''}</p>`;
      $('#prodSku').textContent = p.sku || '-';
      $('#quoteProductField') && ($('#quoteProductField').value = p.name);

      const gallery = (p.gallery_urls || '').split(',').map(s => s.trim()).filter(Boolean);
      renderGallery(gallery.length ? gallery : [p.image_url || '/img/product-1.svg']);

      // Specifications tab
      if (p.specifications && p.specifications.trim()) {
        $('#specsContent').innerHTML = p.specifications;
        $('#specsContent').classList.remove('hidden');
        $('#specsFallback').classList.add('hidden');
      } else {
        $('#specsContent').classList.add('hidden');
        $('#specsFallback').classList.remove('hidden');
      }

      // Key Features tab
      const features = (p.key_features || '').split('\n').map(s => s.trim()).filter(Boolean);
      $('#featuresList').innerHTML = features.length
        ? features.map(f => `<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${f}</span></li>`).join('')
        : '<li><span>Fitur unggulan akan segera dilengkapi.</span></li>';

      // Download catalogue button
      if (p.catalogue_url) {
        $('#catalogueBtn').href = p.catalogue_url;
        $('#catalogueBtn').classList.remove('hidden');
      }

      renderRelated(p);
    } catch (e) {
      $('#prodName').textContent = 'Produk tidak ditemukan';
      $('#prodDescription').innerHTML = '<p>Produk yang Anda cari tidak tersedia atau sudah tidak aktif.</p>';
    }
  }

  /* ---------- Chat widget (same pattern as other pages) ---------- */
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
    launcher.addEventListener('click', async () => {
      win.classList.add('is-open');
      launcher.style.display = 'none';
      await ensureSession();
    });
    $('#chatClose').addEventListener('click', () => { win.classList.remove('is-open'); launcher.style.display = 'flex'; });
    $('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = $('#chatInput').value;
      $('#chatInput').value = '';
      sendChat(val);
    });
    $$('#chatQuick button').forEach(b => b.addEventListener('click', async () => {
      await ensureSession();
      sendChat(b.dataset.q);
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = new Date().getFullYear();
    loadProduct();
    initChat();
  });
})();
