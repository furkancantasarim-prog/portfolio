/* ═══════════════════════════════════════════════
   PORTFOLYO — Ana JavaScript
   ═══════════════════════════════════════════════ */

/* ── CURSOR ── */
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
});
(function animRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animRing);
})();

/* ── REVEAL ON SCROLL ── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
revealEls.forEach(el => revealObs.observe(el));

/* ══════════════════════════════════════════
   PANEL — Sağdan açılan çalışmalar paneli
   ══════════════════════════════════════════ */
const overlay = document.getElementById('panel-overlay');
const panel   = document.getElementById('panel');
const panelTitle = document.getElementById('panel-title-text');
const panelBody  = document.getElementById('panel-body');

let currentCategory = null;

function openPanel(category) {
  currentCategory = category;
  overlay.classList.add('open');
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';

  const labels = {
    'video':   'Video <span>& Reklam</span>',
    'grafik':  'Grafik <span>Tasarım</span>',
    'fotograf': 'Fotoğraf<span>çılık</span>'
  };
  panelTitle.innerHTML = labels[category] || category;

  renderPanel(category);
}

function closePanel() {
  overlay.classList.remove('open');
  panel.classList.remove('open');
  document.body.style.overflow = '';
  currentCategory = null;
}

overlay.addEventListener('click', closePanel);
document.getElementById('panel-close').addEventListener('click', closePanel);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

/* ══════════════════════════════════════════
   VIDEO YÖNETİCİSİ — Backend API
   ══════════════════════════════════════════ */
async function getVideos() {
  try { 
    // GitHub Pages'te doğrudan statik dosyadan okuruz
    const res = await fetch('data/videos.json?t=' + Date.now());
    return await res.json();
  }
  catch { return []; }
}

/* ══════════════════════════════════════════
   MEDYA TARAYICI — fotograf & grafik klasörleri
   (GitHub Pages'de dosya listesi için manifest.json kullanılır)
   ══════════════════════════════════════════ */

/*
  GitHub Pages statik dosya sunucusu "dizin listeleme" yapmaz.
  Bu yüzden her klasörde bir manifest.json dosyası kullanıyoruz.
  Klasöre dosya attığında manifest.json'ı güncellemen yeterli —
  ya da projeyle gelen update-manifest.py script'ini çalıştırırsın.

  manifest.json formatı:
  { "files": ["foto1.jpg", "foto2.jpg", ...] }
*/

async function loadMediaFiles(folder) {
  try {
    /* manifest.json'dan dosya listesini çek */
    const res = await fetch(folder + '/manifest.json?t=' + Date.now());
    if (!res.ok) return null;
    const data = await res.json();
    return data.files || [];
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════
   PANEL İÇERİĞİ RENDER
   ══════════════════════════════════════════ */
async function renderPanel(category) {
  panelBody.innerHTML = '<p style="color:#555;font-size:13px;padding:2rem 0">Yükleniyor…</p>';

  if (category === 'video') {
    await renderVideoPanel();
  } else if (category === 'fotograf') {
    await renderMediaPanel('fotograf', 'Fotoğraf');
  } else if (category === 'grafik') {
    await renderMediaPanel('grafik tasarim', 'Grafik Tasarım');
  }
}

async function renderVideoPanel() {
  const videos = await getVideos();
  let html = '';

  if (videos.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">▶</div>
        <p>Henüz video eklenmemiş.</p>
      </div>`;
  } else {
    html += `<p class="panel-section-title">Videolar (${videos.length})</p><div class="video-list">`;
    videos.forEach(v => {
      html += `
        <div class="video-item">
          <div class="video-thumb-wrap">
            <iframe src="https://www.youtube.com/embed/${v.id}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>
          </div>
          <div class="video-item-info">
            <div>
              <div class="video-item-title">${escHtml(v.title)}</div>
              <div class="video-item-url">${escHtml(v.url)}</div>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  panelBody.innerHTML = html;
}

async function renderMediaPanel(folder, label) {
  const files = await loadMediaFiles(folder);

  const imgExts = ['jpg','jpeg','png','gif','webp','avif','svg'];
  const isImage = f => imgExts.includes(f.split('.').pop().toLowerCase());

  let html = `<p class="panel-section-title">${label} Çalışmaları</p>`;

  if (!files || files.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">◻</div>
        <p>Henüz dosya yok.<br>
          <strong style="color:#fff">"${folder}"</strong> klasörüne<br>
          dosya at ve manifest.json'ı güncelle.</p>
      </div>`;
  } else {
    const images = files.filter(isImage);
    if (images.length === 0) {
      html += `<div class="empty-state"><p>Klasörde görüntü bulunamadı.</p></div>`;
    } else {
      html += '<div class="media-grid">';
      images.forEach(f => {
        const src = encodeURI(folder + '/' + f);
        html += `
          <div class="media-item">
            <img src="${src}" alt="${escHtml(f)}" loading="lazy"
              onerror="this.parentElement.style.display='none'">
            <div class="media-item-label">${escHtml(f)}</div>
          </div>`;
      });
      html += '</div>';
    }
  }

  panelBody.innerHTML = html;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
