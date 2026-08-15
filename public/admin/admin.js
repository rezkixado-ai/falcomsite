(() => {
  'use strict';
  const page = document.currentScript.dataset.page;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  async function api(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (res.status === 401) { location.href = '/admin/login'; throw new Error('unauthorized'); }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
    return res.json();
  }

  /* ================= LOGIN PAGE ================= */
  if (page === 'login') {
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        await api('/admin/auth/login', { method: 'POST', body: JSON.stringify(data) });
        location.href = '/admin/dashboard';
      } catch (err) {
        $('#loginError').textContent = err.message || 'Gagal masuk';
      }
    });
    return;
  }

  /* ================= DASHBOARD ================= */
  const SCHEMAS = {
    hero_slides: {
      label: 'Slide Hero', endpoint: 'hero_slides', listEl: '#heroList',
      title: r => r.title, sub: r => r.eyebrow || '',
      fields: [
        { name: 'eyebrow', label: 'Label kecil (eyebrow)', type: 'text' },
        { name: 'title', label: 'Judul', type: 'text', required: true },
        { name: 'subtitle', label: 'Subjudul', type: 'textarea' },
        { name: 'cta_text', label: 'Teks tombol', type: 'text' },
        { name: 'cta_link', label: 'Link tombol', type: 'text' },
        { name: 'image_url', label: 'Gambar / Video latar', type: 'media' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
        { name: 'active', label: 'Aktif tampil', type: 'checkbox', default: 1 },
      ],
    },
    stats: {
      label: 'Statistik', endpoint: 'stats', listEl: '#statsList',
      title: r => `${r.value}${r.suffix || ''}`, sub: r => r.label,
      fields: [
        { name: 'label', label: 'Label', type: 'text', required: true },
        { name: 'value', label: 'Nilai angka', type: 'number', required: true },
        { name: 'suffix', label: 'Akhiran (misal +)', type: 'text' },
        { name: 'image_url', label: 'Foto latar card (opsional — kosongkan untuk polos putih)', type: 'image' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
      ],
    },
    sales_network: {
      label: 'Kota Jaringan', endpoint: 'sales_network', listEl: '#networkAdminList',
      title: r => r.city, sub: r => `${r.region || ''} · X:${r.map_x}% Y:${r.map_y}%`,
      fields: [
        { name: 'city', label: 'Nama kota', type: 'text', required: true },
        { name: 'region', label: 'Wilayah / provinsi', type: 'text' },
        { name: 'map_x', label: 'Posisi peta X (0-100)', type: 'number', step: '0.1' },
        { name: 'map_y', label: 'Posisi peta Y (0-100)', type: 'number', step: '0.1' },
        { name: 'address', label: 'Alamat', type: 'text' },
        { name: 'phone', label: 'Telepon', type: 'text' },
        { name: 'is_hq', label: 'Kantor pusat', type: 'checkbox' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
      ],
    },
    clients: {
      label: 'Klien', endpoint: 'clients', listEl: '#clientsList',
      title: r => r.name, sub: () => '',
      fields: [
        { name: 'name', label: 'Nama klien', type: 'text', required: true },
        { name: 'logo_url', label: 'Logo', type: 'image' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
      ],
    },
    videos: {
      label: 'Video Tutorial', endpoint: 'videos', listEl: '#videosList',
      title: r => r.title, sub: r => r.channel_name || '',
      fields: [
        { name: 'title', label: 'Judul video', type: 'text', required: true },
        { name: 'youtube_url', label: 'Link YouTube', type: 'text', required: true },
        { name: 'thumbnail_url', label: 'Thumbnail', type: 'image' },
        { name: 'channel_name', label: 'Nama channel', type: 'text', default: 'Falcom Technology Official' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
        { name: 'active', label: 'Aktif tampil', type: 'checkbox', default: 1 },
      ],
    },
    products: {
      label: 'Produk', endpoint: 'products', listEl: '#productsList',
      title: r => r.name, sub: r => `${r.category || ''}${r.subcategory ? ' / ' + r.subcategory : ''}`,
      fields: [
        { name: 'name', label: 'Nama produk', type: 'text', required: true },
        { name: 'slug', label: 'Slug URL', type: 'text', required: true },
        { name: 'sku', label: 'SKU', type: 'text' },
        { name: 'category', label: 'Kategori (slug, harus cocok dengan salah satu di tab Kategori Produk)', type: 'text' },
        { name: 'subcategory', label: 'Sub-kategori', type: 'text' },
        { name: 'short_desc', label: 'Deskripsi singkat (tampil di kartu)', type: 'textarea' },
        { name: 'description', label: 'Deskripsi lengkap (mendukung HTML dasar, ditampilkan di halaman detail)', type: 'textarea-lg' },
        { name: 'key_features', label: 'Fitur unggulan (satu poin per baris)', type: 'textarea' },
        { name: 'specifications', label: 'Spesifikasi teknis (HTML dasar — kosongkan untuk tampilkan pesan "belum tersedia")', type: 'textarea-lg' },
        { name: 'image_url', label: 'Foto utama', type: 'image' },
        { name: 'gallery_urls', label: 'Foto galeri tambahan (pisahkan dengan koma, URL gambar)', type: 'text' },
        { name: 'catalogue_url', label: 'Link PDF katalog (kosongkan untuk sembunyikan tombol download)', type: 'text' },
        { name: 'featured', label: 'Tampilkan di beranda (unggulan)', type: 'checkbox' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
        { name: 'active', label: 'Aktif tampil', type: 'checkbox', default: 1 },
      ],
    },
    categories: {
      label: 'Kategori Produk', endpoint: 'categories', listEl: '#categoriesList',
      title: r => r.name, sub: r => r.slug,
      fields: [
        { name: 'name', label: 'Nama kategori', type: 'text', required: true },
        { name: 'slug', label: 'Slug (dipakai untuk mencocokkan field Kategori di tab Produk)', type: 'text', required: true },
        { name: 'sort_order', label: 'Urutan tampil di sidebar', type: 'number', default: 0 },
      ],
    },
    solution_categories: {
      label: 'Kategori Solusi', endpoint: 'solution_categories', listEl: '#solutionCategoriesList',
      title: r => r.name, sub: r => r.slug,
      fields: [
        { name: 'name', label: 'Nama kategori solusi', type: 'text', required: true },
        { name: 'slug', label: 'Slug (dipakai untuk mencocokkan field di tab Solusi)', type: 'text', required: true },
        { name: 'sort_order', label: 'Urutan tab', type: 'number', default: 0 },
      ],
    },
    solutions: {
      label: 'Solusi', endpoint: 'solutions', listEl: '#solutionsList',
      title: r => r.name, sub: r => r.category_slug,
      fields: [
        { name: 'name', label: 'Nama solusi', type: 'text', required: true },
        { name: 'category_slug', label: 'Kategori (slug, harus cocok dengan tab Kategori Solusi)', type: 'text', required: true },
        { name: 'image_url', label: 'Gambar', type: 'image' },
        { name: 'link_url', label: 'Link "Detail solusi"', type: 'text' },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
        { name: 'active', label: 'Aktif tampil', type: 'checkbox', default: 1 },
      ],
    },
    testimonials: {
      label: 'Testimoni', endpoint: 'testimonials', listEl: '#testimonialsList',
      title: r => r.name, sub: r => r.role || '',
      fields: [
        { name: 'name', label: 'Nama pelanggan', type: 'text', required: true },
        { name: 'role', label: 'Jabatan / Perusahaan', type: 'text' },
        { name: 'photo_url', label: 'Foto', type: 'image' },
        { name: 'headline', label: 'Judul singkat testimoni', type: 'text' },
        { name: 'quote', label: 'Isi testimoni lengkap', type: 'textarea', required: true },
        { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
        { name: 'active', label: 'Aktif tampil', type: 'checkbox', default: 1 },
      ],
    },
    chatbot_qa: {
      label: 'Respons Chatbot', endpoint: 'chatbot_qa', listEl: '#chatbotList',
      title: r => r.topic || r.keywords.split(',')[0], sub: r => r.keywords,
      fields: [
        { name: 'topic', label: 'Topik', type: 'text' },
        { name: 'keywords', label: 'Kata kunci (pisahkan koma)', type: 'text', required: true },
        { name: 'answer', label: 'Jawaban', type: 'textarea', required: true },
        { name: 'sort_order', label: 'Prioritas urutan', type: 'number', default: 0 },
        { name: 'active', label: 'Aktif', type: 'checkbox', default: 1 },
      ],
    },
    articles: {
      label: 'Artikel', endpoint: 'articles', listEl: '#articlesList',
      title: r => r.title, sub: r => `${r.status} · ${r.category || ''}`,
      fields: [
        { name: 'title', label: 'Judul', type: 'text', required: true },
        { name: 'excerpt', label: 'Ringkasan singkat', type: 'textarea' },
        { name: 'content', label: 'Isi artikel (mendukung HTML dasar)', type: 'textarea-lg' },
        { name: 'cover_image', label: 'Gambar sampul', type: 'image' },
        { name: 'category', label: 'Kategori', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: [['draft', 'Draft'], ['scheduled', 'Terjadwal'], ['published', 'Tayang']] },
        { name: 'publish_at', label: 'Tanggal publikasi', type: 'datetime' },
      ],
    },
  };

  let currentUploadedUrl = {};

  function fieldHTML(f, value) {
    let val = value ?? f.default ?? '';
    if (val === 'undefined' || val === 'null') val = '';
    if (f.type === 'textarea' || f.type === 'textarea-lg') {
      return `<label>${f.label}<textarea name="${f.name}" style="${f.type === 'textarea-lg' ? 'min-height:220px' : ''}">${val || ''}</textarea></label>`;
    }
    if (f.type === 'checkbox') {
      return `<label class="checkbox"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}> ${f.label}</label>`;
    }
    if (f.type === 'select') {
      return `<label>${f.label}<select name="${f.name}">${f.options.map(([v, l]) => `<option value="${v}" ${val === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    }
    if (f.type === 'datetime') {
      const dtVal = val ? new Date(val).toISOString().slice(0, 16) : '';
      return `<label>${f.label}<input type="datetime-local" name="${f.name}" value="${dtVal}"></label>`;
    }
    if (f.type === 'image') {
      return `<label>${f.label}
        <div class="upload-row">
          ${val ? `<img src="${val}" alt="">` : ''}
          <input type="file" accept="image/*" data-upload-for="${f.name}">
        </div>
        <input type="hidden" name="${f.name}" value="${val || ''}">
      </label>`;
    }
    if (f.type === 'media') {
      const isVid = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(val || '');
      const preview = val ? (isVid ? `<video src="${val}" muted autoplay loop playsinline></video>` : `<img src="${val}" alt="">`) : '';
      return `<label>${f.label}
        <div class="upload-row">
          ${preview}
          <input type="file" accept="image/*,video/*" data-upload-for="${f.name}">
        </div>
        <input type="hidden" name="${f.name}" value="${val || ''}">
        <span class="hint" style="display:block;margin-top:4px">Boleh foto atau video (mp4/webm/mov) — dideteksi otomatis di halaman.</span>
      </label>`;
    }
    return `<label>${f.label}<input type="${f.type}" name="${f.name}" value="${val ?? ''}" ${f.step ? `step="${f.step}"` : ''} ${f.required ? 'required' : ''}></label>`;
  }

  async function loadList(key) {
    const schema = SCHEMAS[key];
    const el = $(schema.listEl);
    if (!el) return;
    el.innerHTML = '<p class="hint">Memuat...</p>';
    try {
      const rows = await api(`/admin/api/${schema.endpoint}`);
      if (!rows.length) { el.innerHTML = '<p class="hint">Belum ada data.</p>'; return; }
      el.innerHTML = rows.map(r => `
        <div class="list-item">
          <div>
            <div class="title">${schema.title(r)}
              ${'active' in r ? `<span class="badge ${r.active ? 'on' : ''}">${r.active ? 'Aktif' : 'Nonaktif'}</span>` : ''}
              ${'is_hq' in r ? (r.is_hq ? '<span class="badge on">Pusat</span>' : '') : ''}
            </div>
            <div class="meta">${schema.sub(r)}</div>
          </div>
          <div class="actions">
            ${key === 'articles' ? `<button data-view="${r.slug}">Lihat</button>` : ''}
            <button data-edit="${key}:${r.id}">Ubah</button>
            <button class="danger" data-del="${key}:${r.id}">Hapus</button>
          </div>
        </div>`).join('');
    } catch (e) { el.innerHTML = `<p class="hint">Gagal memuat: ${e.message}</p>`; }
  }

  function openModal(key, row) {
    const schema = SCHEMAS[key];
    currentUploadedUrl = {};
    $('#modalTitle').textContent = row ? `Ubah ${schema.label}` : `Tambah ${schema.label}`;
    const form = $('#modalForm');
    form.innerHTML = schema.fields.map(f => fieldHTML(f, row ? row[f.name] : undefined)).join('')
      + `<div class="modal-actions"><button type="submit" class="btn-solid">Simpan</button></div>`;
    form.dataset.key = key;
    form.dataset.id = row ? row.id : '';

    $$('input[type=file]', form).forEach(input => wireImageUpload(input, form));

    $('#modalBackdrop').classList.add('is-open');
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || '');
  }

  function wireImageUpload(input, form) {
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        const hiddenName = input.dataset.uploadFor;
        const hiddenInput = form.querySelector(`input[type=hidden][name="${hiddenName}"]`);
        if (!data.url) { alert('Upload gagal: server tidak mengembalikan URL file.'); return; }
        hiddenInput.value = data.url;
        input.parentElement.querySelector('img,video')?.remove();
        let preview;
        if (isVideoUrl(data.url) || file.type.startsWith('video/')) {
          preview = document.createElement('video');
          preview.muted = true; preview.autoplay = true; preview.loop = true; preview.playsInline = true;
        } else {
          preview = document.createElement('img');
        }
        preview.src = data.url;
        input.parentElement.prepend(preview);
      } catch (e) { alert('Upload gagal: ' + e.message); }
    });
  }

  $('#modalClose').addEventListener('click', () => $('#modalBackdrop').classList.remove('is-open'));
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') $('#modalBackdrop').classList.remove('is-open'); });

  $('#modalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const key = form.dataset.key;
    const schema = SCHEMAS[key];
    const fd = new FormData(form);
    const payload = {};
    schema.fields.forEach(f => {
      if (f.type === 'checkbox') payload[f.name] = form.querySelector(`[name="${f.name}"]`).checked ? 1 : 0;
      else if (f.type === 'datetime') payload[f.name] = fd.get(f.name) ? new Date(fd.get(f.name)).toISOString() : null;
      else payload[f.name] = fd.get(f.name);
    });
    const id = form.dataset.id;
    try {
      if (id) await api(`/admin/api/${schema.endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api(`/admin/api/${schema.endpoint}`, { method: 'POST', body: JSON.stringify(payload) });
      $('#modalBackdrop').classList.remove('is-open');
      loadList(key);
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
  });

  document.addEventListener('click', async (e) => {
    const addKey = e.target.dataset.add;
    if (addKey) return openModal(addKey);

    const editVal = e.target.dataset.edit;
    if (editVal) {
      const [key, id] = editVal.split(':');
      const rows = await api(`/admin/api/${SCHEMAS[key].endpoint}`);
      const row = rows.find(r => String(r.id) === id);
      return openModal(key, row);
    }

    const delVal = e.target.dataset.del;
    if (delVal) {
      const [key, id] = delVal.split(':');
      if (!confirm('Hapus data ini?')) return;
      await api(`/admin/api/${SCHEMAS[key].endpoint}/${id}`, { method: 'DELETE' });
      return loadList(key);
    }

    const viewSlug = e.target.dataset.view;
    if (viewSlug) window.open(`/artikel/${viewSlug}`, '_blank');
  });

  /* ---- Panel navigation ---- */
  const panelLoaders = {
    dashboard: loadSummary,
    hero: () => loadList('hero_slides'),
    stats: () => loadList('stats'),
    network: () => loadList('sales_network'),
    clients: () => loadList('clients'),
    videos: () => loadList('videos'),
    products: () => loadList('products'),
    categories: () => loadList('categories'),
    solution_categories: () => loadList('solution_categories'),
    solutions: () => loadList('solutions'),
    testimonials: () => loadList('testimonials'),
    articles: () => loadList('articles'),
    chatbot: () => loadList('chatbot_qa'),
    chatlogs: loadChatLogs,
    settings: loadSettings,
  };

  $$('.admin-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.admin-nav button').forEach(b => b.classList.remove('is-active'));
      $$('.panel').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      const key = btn.dataset.panel;
      $(`.panel[data-panel="${key}"]`).classList.add('is-active');
      $('#panelTitle').textContent = btn.textContent;
      panelLoaders[key] && panelLoaders[key]();
    });
  });

  async function loadSummary() {
    try {
      const s = await api('/admin/api/dashboard-summary');
      $('#summaryCards').innerHTML = `
        <div class="summary-card"><div class="val">${s.articles}</div><div class="lbl">Artikel tayang</div></div>
        <div class="summary-card"><div class="val">${s.drafts}</div><div class="lbl">Draft artikel</div></div>
        <div class="summary-card"><div class="val">${s.chat_sessions}</div><div class="lbl">Sesi live chat</div></div>
        <div class="summary-card"><div class="val">${s.escalated}</div><div class="lbl">Dialihkan ke WA</div></div>`;
    } catch (e) {}
  }

  async function loadChatLogs() {
    const el = $('#chatlogsList');
    el.innerHTML = '<p class="hint">Memuat...</p>';
    const sessions = await api('/admin/api/chat-sessions');
    if (!sessions.length) { el.innerHTML = '<p class="hint">Belum ada percakapan.</p>'; return; }
    el.innerHTML = sessions.map(s => `
      <div class="list-item">
        <div>
          <div class="title">Sesi ${s.id.slice(0, 8)} ${s.escalated ? '<span class="badge on">Dialihkan WA</span>' : ''}</div>
          <div class="meta">${new Date(s.created_at).toLocaleString('id-ID')} · ${s.unresolved_count} pesan tak terjawab</div>
        </div>
        <div class="actions"><button data-view-chat="${s.id}">Lihat Percakapan</button></div>
      </div>`).join('');
  }

  document.addEventListener('click', async (e) => {
    const sid = e.target.dataset.viewChat;
    if (!sid) return;
    const msgs = await api(`/admin/api/chat-sessions/${sid}/messages`);
    alert(msgs.map(m => `${m.sender === 'user' ? 'Pengunjung' : 'Bot'}: ${m.message}`).join('\n\n'));
  });

  async function loadSettings() {
    const s = await api('/admin/api/settings');
    const form = $('#settingsForm');
    Object.entries(s).forEach(([k, v]) => {
      const input = form.querySelector(`[name="${k}"]`);
      if (input) input.value = v;
      if (k.startsWith('login_bg_') && v) {
        const fileInput = form.querySelector(`[data-upload-for="${k}"]`);
        if (fileInput) {
          fileInput.parentElement.querySelector('img,video')?.remove();
          let preview;
          if (isVideoUrl(v)) {
            preview = document.createElement('video');
            preview.muted = true; preview.autoplay = true; preview.loop = true; preview.playsInline = true;
          } else {
            preview = document.createElement('img');
          }
          preview.src = v;
          fileInput.parentElement.prepend(preview);
        }
      }
    });
    $('#navOpacityValue').textContent = form.querySelector('[name=nav_opacity]').value;
    $$('input[type=file][data-upload-for]', form).forEach(input => wireImageUpload(input, form));
  }
  $('#settingsForm').addEventListener('input', (e) => {
    if (e.target.name === 'nav_opacity') $('#navOpacityValue').textContent = e.target.value;
  });
  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    try {
      await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      $('#settingsMsg').textContent = 'Pengaturan tersimpan.';
      setTimeout(() => $('#settingsMsg').textContent = '', 3000);
    } catch (err) { $('#settingsMsg').textContent = 'Gagal: ' + err.message; }
  });

  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    try {
      await api('/admin/api/change-password', { method: 'POST', body: JSON.stringify(payload) });
      $('#passwordMsg').textContent = 'Password berhasil diubah.';
      e.target.reset();
    } catch (err) { $('#passwordMsg').textContent = 'Gagal: ' + err.message; }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/admin/auth/logout', { method: 'POST' });
    location.href = '/admin/login';
  });

  (async () => {
    try {
      const me = await api('/admin/api/me');
      $('#adminUser').textContent = me.username;
      loadSummary();
    } catch (e) { /* redirected already */ }
  })();
})();
