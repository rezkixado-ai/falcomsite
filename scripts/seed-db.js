const bcrypt = require('bcryptjs');
const client = require('../db/client');

async function count(table) {
  const r = await client.execute(`SELECT COUNT(*) c FROM ${table}`);
  return r.rows[0].c;
}

async function seed() {
  if ((await count('settings')) === 0) {
    const defaults = {
      site_name: 'Falcom Technology',
      tagline: 'Elevate Connectivity',
      nav_opacity: '0',
      nav_style: 'default',
      testimonial_style: 'style1',
      wa_admin_number: '6281234567890',
      wa_default_message: 'Halo Falcom Technology, saya ingin bertanya tentang produk fiber optik.',
      chat_fail_limit: '3',
      contact_email: 'sales@falcom-technology.com',
      contact_phone: '+62 21 5010 2030',
      hq_address: 'Jl. Industri Raya, Jakarta Barat, DKI Jakarta',
      login_bg_1: '', login_bg_2: '', login_bg_3: '',
    };
    for (const [key, value] of Object.entries(defaults)) {
      await client.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: [key, value] });
    }
    console.log('Seeded settings.');
  }

  if ((await count('hero_slides')) === 0) {
    const rows = [
      { eyebrow: 'Distributor Resmi Fiber Optik', title: 'Elevate Connectivity Across Indonesia', subtitle: 'Kabel fiber optik, perangkat jaringan, dan solusi ISP end-to-end untuk membangun infrastruktur digital yang andal.', cta_text: 'Lihat Produk', cta_link: '#produk', image_url: '/img/hero-1.svg', sort_order: 1 },
      { eyebrow: 'Jaringan Distribusi Nasional', title: 'Stok Siap Kirim ke Seluruh Provinsi', subtitle: 'Gudang regional dan tim teknis tersebar di kota-kota utama untuk memastikan pasokan tidak pernah terputus.', cta_text: 'Cek Jaringan Kami', cta_link: '#jaringan', image_url: '/img/hero-2.svg', sort_order: 2 },
      { eyebrow: 'Dukungan Teknis Purna Jual', title: 'Partner Teknis, Bukan Sekadar Supplier', subtitle: 'Tim engineer bersertifikat siap membantu instalasi, splicing, hingga troubleshooting jaringan Anda.', cta_text: 'Hubungi Tim Kami', cta_link: '#kontak', image_url: '/img/hero-3.svg', sort_order: 3 },
    ];
    for (const s of rows) {
      await client.execute({
        sql: `INSERT INTO hero_slides (eyebrow,title,subtitle,cta_text,cta_link,image_url,sort_order,active) VALUES (?,?,?,?,?,?,?,1)`,
        args: [s.eyebrow, s.title, s.subtitle, s.cta_text, s.cta_link, s.image_url, s.sort_order],
      });
    }
    console.log('Seeded hero_slides.');
  }

  if ((await count('stats')) === 0) {
    const rows = [
      ['Tahun Pengalaman', 12, '+', 1],
      ['Klien ISP & Kontraktor', 850, '+', 2],
      ['Provinsi Terjangkau', 30, '+', 3],
      ['Kilometer Kabel Terdistribusi', 2500000, '+', 4],
    ];
    for (const [label, value, suffix, order] of rows) {
      await client.execute({ sql: 'INSERT INTO stats (label,value,suffix,sort_order) VALUES (?,?,?,?)', args: [label, value, suffix, order] });
    }
    console.log('Seeded stats.');
  }

  if ((await count('sales_network')) === 0) {
    const rows = [
      { city: 'Jakarta', region: 'Kantor Pusat', map_x: 24.22, map_y: 56.67, address: 'Jl. Industri Raya No. 8, Jakarta Barat', phone: '+62 21 5010 2030', is_hq: 1, sort_order: 1 },
      { city: 'Surabaya', region: 'Jawa Timur', map_x: 44.40, map_y: 64.34, address: 'Jl. Rungkut Industri No. 12, Surabaya', phone: '+62 31 8471 2200', is_hq: 0, sort_order: 2 },
      { city: 'Semarang', region: 'Jawa Tengah', map_x: 36.19, map_y: 61.04, address: 'Jl. Kaligawe Raya, Semarang', phone: '+62 24 6710 900', is_hq: 0, sort_order: 3 },
      { city: 'Medan', region: 'Sumatera Utara', map_x: 8.20, map_y: 23.51, address: 'Jl. Gatot Subroto, Medan', phone: '+62 61 4515 300', is_hq: 0, sort_order: 4 },
      { city: 'Pekanbaru', region: 'Riau', map_x: 15.70, map_y: 37.07, address: 'Jl. Soekarno-Hatta, Pekanbaru', phone: '+62 761 8657 41', is_hq: 0, sort_order: 5 },
      { city: 'Balikpapan', region: 'Kalimantan Timur', map_x: 49.54, map_y: 45.59, address: 'Jl. MT Haryono, Balikpapan', phone: '+62 542 876 210', is_hq: 0, sort_order: 6 },
      { city: 'Makassar', region: 'Sulawesi Selatan', map_x: 55.41, map_y: 56.88, address: 'Jl. Perintis Kemerdekaan, Makassar', phone: '+62 411 590 112', is_hq: 0, sort_order: 7 },
      { city: 'Denpasar', region: 'Bali', map_x: 48.76, map_y: 65.40, address: 'Jl. Cokroaminoto, Denpasar', phone: '+62 361 424 887', is_hq: 0, sort_order: 8 },
    ];
    for (const s of rows) {
      await client.execute({
        sql: `INSERT INTO sales_network (city,region,map_x,map_y,address,phone,is_hq,sort_order) VALUES (?,?,?,?,?,?,?,?)`,
        args: [s.city, s.region, s.map_x, s.map_y, s.address, s.phone, s.is_hq, s.sort_order],
      });
    }
    console.log('Seeded sales_network.');
  }

  if ((await count('clients')) === 0) {
    const names = ['MitraNet ISP', 'Kencana Fiber', 'Nusantara Telekom', 'Cakra Broadband', 'Garuda Konektiva', 'Sinar Jaringan', 'Borneo Link', 'Celebes Data'];
    for (let i = 0; i < names.length; i++) {
      await client.execute({ sql: 'INSERT INTO clients (name,logo_url,sort_order) VALUES (?,?,?)', args: [names[i], `/img/client-${(i % 4) + 1}.svg`, i + 1] });
    }
    console.log('Seeded clients.');
  }

  if ((await count('chatbot_qa')) === 0) {
    const rows = [
      ['Jam Operasional', 'jam,operasional,buka,jam berapa,jam kerja', 'Kami buka Senin–Jumat pukul 08.00–17.00 WIB, dan Sabtu 08.00–13.00 WIB.', 1],
      ['Produk Kabel Fiber', 'kabel,fiber,fo,fiber optik,kabel optik', 'Kami menyediakan kabel fiber optik single-mode & multi-mode, ADSS, dan drop core dari berbagai core count. Mau saya kirimkan katalog lengkapnya?', 2],
      ['Perangkat Jaringan', 'olt,ont,switch,router,perangkat,onu', 'Kami distributor resmi OLT, ONT/ONU, switch managed, dan perangkat pendukung jaringan ISP. Tim kami bisa bantu rekomendasikan sesuai kebutuhan Anda.', 3],
      ['Cara Order', 'order,pesan,beli,pembelian,cara beli', 'Anda bisa order melalui tim sales kami atau langsung menghubungi admin WhatsApp untuk penawaran harga terbaru.', 4],
      ['Pengiriman', 'kirim,pengiriman,ongkir,ekspedisi,sampai berapa lama', 'Pengiriman tersedia ke seluruh Indonesia melalui gudang regional kami, estimasi 2–7 hari kerja tergantung lokasi.', 5],
      ['Lokasi Kantor', 'lokasi,alamat,kantor,dimana', 'Kantor pusat kami di Jakarta, dengan jaringan distribusi di Surabaya, Medan, Balikpapan, Makassar, dan kota besar lainnya.', 6],
    ];
    for (const [topic, kw, ans, order] of rows) {
      await client.execute({ sql: 'INSERT INTO chatbot_qa (topic,keywords,answer,sort_order,active) VALUES (?,?,?,?,1)', args: [topic, kw, ans, order] });
    }
    console.log('Seeded chatbot_qa.');
  }

  if ((await count('articles')) === 0) {
    await client.execute({
      sql: `INSERT INTO articles (title,slug,excerpt,content,cover_image,category,status,publish_at) VALUES (?,?,?,?,?,?,?,?)`,
      args: [
        'Cara Memilih Kabel Fiber Optik yang Tepat untuk Proyek ISP',
        'cara-memilih-kabel-fiber-optik-untuk-proyek-isp',
        'Panduan singkat memilih jenis kabel, core count, dan pelindung yang sesuai kondisi lapangan.',
        '<p>Memilih kabel fiber optik yang tepat sangat menentukan performa jaringan jangka panjang...</p>',
        '/img/article-1.svg', 'Panduan Teknis', 'published', new Date().toISOString(),
      ],
    });
    console.log('Seeded articles.');
  }

  if ((await count('admin_users')) === 0) {
    const hash = bcrypt.hashSync('falcom2026', 10);
    await client.execute({ sql: 'INSERT INTO admin_users (username,password_hash) VALUES (?,?)', args: ['admin', hash] });
    console.log('Seeded admin user -> username: admin | password: falcom2026 (GANTI setelah login pertama)');
  }

  if ((await count('videos')) === 0) {
    const rows = [
      ['Perbedaan Wifi 4, Wifi 5, Wifi 6 dan Sejarahnya', 'https://www.youtube.com/@FalcomTechnologyOfficial', '/img/video-1.svg', 1],
      ['OLT GPON dan EPON 4 PON Double Power || FASTLINK', 'https://www.youtube.com/@FalcomTechnologyOfficial', '/img/video-2.svg', 2],
      ['Solusi Jaringan Fiber Optik Yang Paling Murah || Media Converter', 'https://www.youtube.com/@FalcomTechnologyOfficial', '/img/video-3.svg', 3],
    ];
    for (const [title, url, thumb, order] of rows) {
      await client.execute({ sql: 'INSERT INTO videos (title,youtube_url,thumbnail_url,channel_name,sort_order) VALUES (?,?,?,?,?)', args: [title, url, thumb, 'Falcom Technology Official', order] });
    }
    console.log('Seeded videos.');
  }

  if ((await count('categories')) === 0) {
    const names = ['Kabel Fiber Optik', 'Kabel LAN', 'Kabel Coaxial', 'Fiber Optic Accessories', 'OLT EPON & GPON', 'ONU / ONT', 'Transmitter & EDFA', 'Analog & Digital', 'HFC (Hybrid Fiber Coaxial)', 'Fiber Broadband Unit', 'Media Converter & Switch', 'Wireless Access Point', 'Tools & Spareparts', 'Rack'];
    for (let i = 0; i < names.length; i++) {
      const slug = names[i].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      await client.execute({ sql: 'INSERT INTO categories (name,slug,sort_order) VALUES (?,?,?)', args: [names[i], slug, i + 1] });
    }
    console.log('Seeded categories.');
  }

  if ((await count('products')) === 0) {
    const rows = [
      { name: 'Optical Fusion Splicer 300T', slug: 'optical-fusion-splicer-300t', sku: 'OPTICAL-FUSION-SPLICER-300T', category: 'tools-spareparts', short_desc: 'Bayangkan setiap sambungan serat optik yang Anda buat — sempurna. Setiap saat. Selama 30 tahun riset tanpa kompromi.', description: '<p>Optical Fusion Splicer 300T dirancang untuk hasil sambungan presisi tinggi dengan waktu splicing dan pemanasan yang lebih cepat.</p>', key_features: 'Solusi tools & spareparts berstandar industri untuk jaringan ISP, korporat, dan pemerintahan.\nDistributor resmi — perangkat original dengan garansi pabrikan.\nDukungan teknis oleh tim engineer bersertifikasi di seluruh cabang Indonesia.', image_url: '/img/product-1.svg', featured: 1, sort_order: 1 },
      { name: 'ONU XPON FASTLINK DKB 180', slug: 'onu-xpon-fastlink-dkb-180', sku: '', category: 'onu-ont', short_desc: 'ONU XPON adalah perangkat yang berfungsi untuk mengonversi sinyal laser/cahaya menjadi sinyal internet di sisi pelanggan.', description: '<p>ONU XPON FASTLINK DKB 180 mendukung jaringan GPON dan EPON dalam satu perangkat.</p>', key_features: '', image_url: '/img/product-2.svg', featured: 1, sort_order: 2 },
      { name: 'Optical Fusion Splicer 260T', slug: 'optical-fusion-splicer-260t', sku: '', category: 'tools-spareparts', short_desc: 'FTTx fusion splicer JiLong 260T. All rounder middle trunk line fusion splicer.', description: '<p>Fusion splicer serbaguna untuk kebutuhan instalasi trunk line menengah.</p>', key_features: '', image_url: '/img/product-3.svg', featured: 1, sort_order: 3 },
      { name: 'OLT GPON 3 PON FASTLINK', slug: 'olt-gpon-3-pon-fastlink', sku: '', category: 'olt-epon-gpon', short_desc: 'OLT atau Optical Line Terminal adalah perangkat aktif di headend yang mengonversi sinyal data.', description: '<p>OLT GPON 3 PON FASTLINK cocok untuk ISP skala kecil-menengah.</p>', key_features: '', image_url: '/img/product-4.svg', featured: 1, sort_order: 4 },
    ];
    for (const p of rows) {
      await client.execute({
        sql: `INSERT INTO products (name,slug,sku,category,short_desc,description,key_features,image_url,featured,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        args: [p.name, p.slug, p.sku, p.category, p.short_desc, p.description, p.key_features, p.image_url, p.featured, p.sort_order],
      });
    }
    console.log('Seeded products.');
  }

  if ((await count('solution_categories')) === 0) {
    const rows = [['Internet Network System Solutions', 'internet-network', 1], ['Networking & Wireless System Solutions', 'networking-wireless', 2], ['Multimedia & Security System Solutions', 'multimedia-security', 3]];
    for (const [name, slug, order] of rows) {
      await client.execute({ sql: 'INSERT INTO solution_categories (name,slug,sort_order) VALUES (?,?,?)', args: [name, slug, order] });
    }
    console.log('Seeded solution_categories.');
  }

  if ((await count('solutions')) === 0) {
    const rows = [
      ['internet-network', 'FTTH PON Solution', '/img/solution-1.svg', '#solusi', 1],
      ['internet-network', 'Smart Home Gateway (ONU/ONT)', '/img/solution-2.svg', '#solusi', 2],
      ['internet-network', 'Fiber Broadband Network', '/img/solution-3.svg', '#solusi', 3],
    ];
    for (const [cat, name, img, link, order] of rows) {
      await client.execute({ sql: 'INSERT INTO solutions (category_slug,name,image_url,link_url,sort_order) VALUES (?,?,?,?,?)', args: [cat, name, img, link, order] });
    }
    console.log('Seeded solutions.');
  }

  if ((await count('testimonials')) === 0) {
    const rows = [
      ['Bp. Hendra', 'Owner ISP Lokal', '/img/avatar-1.svg', 'Layanan after sales dari Falcom sangat memuaskan', 'Terima kasih layanan after sales dari Falcom sangat memuaskan, ada kebutuhan material Internet & Fiber Optik tentunya pilih Falcom yang sudah terbukti kualitasnya.', 1],
      ['Bp. Taufik', 'ISP Lokal', '/img/avatar-2.svg', 'Soal kualitas saya akui dari 20 tahun lalu', 'Saya sudah menjadi pelanggan Falcom ini hampir 20 tahun. Soal kualitas, saya akui sejak 20 tahun lalu.', 2],
      ['Bp. Yono', 'Pengelola Jaringan CATV', '/img/avatar-3.svg', 'Kualitas Produk Sesuai Dengan Harga', 'Sudah menggunakan produk Falcom lebih dari 10 tahun dan merasa terbantu karena ada layanan support dari Falcom Technology.', 3],
    ];
    for (const [name, role, photo, headline, quote, order] of rows) {
      await client.execute({ sql: 'INSERT INTO testimonials (name,role,photo_url,headline,quote,sort_order) VALUES (?,?,?,?,?,?)', args: [name, role, photo, headline, quote, order] });
    }
    console.log('Seeded testimonials.');
  }

  console.log('\nSeed complete.');
}

seed().catch(err => { console.error(err); process.exit(1); });
