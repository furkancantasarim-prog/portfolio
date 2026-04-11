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

// YouTube getVideos() iptal edildi. Artık klasörden okunuyor.
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
    await renderMediaPanel('video', 'Videolar', true);
  } else if (category === 'fotograf') {
    await renderMediaPanel('fotograf', 'Fotoğraf', false);
  } else if (category === 'grafik') {
    await renderMediaPanel('grafik tasarim', 'Grafik Tasarım', false);
  }
}

async function renderMediaPanel(folder, label, isVideo = false) {
  const files = await loadMediaFiles(folder);

  let html = `<p class="panel-section-title">${label}</p>`;

  if (!files || files.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">${isVideo ? '▶' : '◻'}</div>
        <p>Henüz dosya yüklenmemiş.</p>
      </div>`;
  } else {
    html += isVideo ? '<div class="video-list">' : '<div class="media-grid">';
    
    files.forEach(f => {
      const src = encodeURI(folder + '/' + f);
      if (isVideo) {
        html += `
          <div class="video-item" style="border:none;background:transparent;">
            <div class="video-thumb-wrap" style="aspect-ratio:auto;">
              <video src="${src}" controls style="width:100%; border-radius:8px;" loading="lazy"></video>
            </div>
            <div style="font-size:12px;color:#aaa;margin-top:5px;text-align:center;">${escHtml(f)}</div>
          </div>`;
      } else {
        html += `
          <div class="media-item" onclick="openLightbox('${src}')">
            <img src="${src}" alt="${escHtml(f)}" loading="lazy"
              onerror="this.parentElement.style.display='none'">
            <div class="media-item-label">Büyüt ⤢</div>
          </div>`;
      }
    });
    html += '</div>';
  }

  panelBody.innerHTML = html;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function openLightbox(src) {
  let box = document.getElementById('lightbox');
  if (!box) {
    const div = document.createElement('div');
    div.id = 'lightbox';
    div.innerHTML = '<div class="lightbox-close" onclick="closeLightbox()">✕</div><img id="lightbox-img" src="" onclick="event.stopPropagation()">';
    div.onclick = closeLightbox;
    document.body.appendChild(div);
    box = div;
  }
  document.getElementById('lightbox-img').src = src;
  box.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}
