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
    'fotograf': 'Fotoğraf<span>çılık</span>',
    'cv': 'CV <span>/ Özgeçmiş</span>'
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
  } else if (category === 'cv') {
    await renderCVPanel();
  }
}

async function renderCVPanel() {
  try {
    const res = await fetch('data/cv.json?t=' + Date.now());
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    let html = `
      <div class="cv-container">
        <!-- Header / Profil Kartı -->
        <div class="cv-header">
          <div class="cv-avatar-wrap">
            <img src="${data.profilePhoto || 'fotograf/cv-profile.webp'}" alt="${escHtml(data.name)}" class="cv-avatar" onerror="this.src='https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'">
          </div>
          <div class="cv-header-info">
            <h3>${escHtml(data.name)}</h3>
            <p>${escHtml(data.title)}</p>
          </div>
        </div>
        
        <!-- Öğrenim Bilgileri -->
        <div class="cv-section">
          <p class="panel-section-title">ÖĞRENİM BİLGİLERİ</p>
          <div class="cv-timeline">
    `;
    
    (data.education || []).forEach(edu => {
      html += `
        <div class="cv-timeline-item">
          <div class="cv-item-header">
            <div class="cv-item-title">${escHtml(edu.school)}</div>
            <div class="cv-item-date">${escHtml(edu.startDate)} - ${escHtml(edu.endDate)}</div>
          </div>
          <div class="cv-item-subtitle">${escHtml(edu.department)}</div>
          <div class="cv-item-desc">${escHtml(edu.description || '')}</div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
        
        <!-- İş Deneyimleri -->
        <div class="cv-section">
          <p class="panel-section-title">İŞ DENEYİMLERİ</p>
          <div class="cv-timeline">
    `;
    
    (data.experience || []).forEach(exp => {
      html += `
        <div class="cv-timeline-item">
          <div class="cv-item-header">
            <div class="cv-item-title">${escHtml(exp.company)}</div>
            <div class="cv-item-date">${escHtml(exp.startDate)} - ${escHtml(exp.endDate)}</div>
          </div>
          <div class="cv-item-subtitle">${escHtml(exp.role)}</div>
          <div class="cv-item-desc">${escHtml(exp.description || '')}</div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
        
        <!-- Sertifikalar -->
        <div class="cv-section">
          <p class="panel-section-title">SERTİFİKALAR</p>
          <div class="cv-certs-grid">
    `;
    
    (data.certificates || []).forEach(cert => {
      html += `
        <div class="cv-cert-card">
          <div class="cv-cert-name">${escHtml(cert.name)}</div>
          <div class="cv-cert-meta">
            <span class="cv-cert-org">${escHtml(cert.organization)}</span>
            <span class="cv-cert-date">${escHtml(cert.date)}</span>
          </div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>

        <!-- Kullanılan Programlar / Yetenekler -->
        <div class="cv-section">
          <p class="panel-section-title">KULLANILAN PROGRAMLAR &amp; YETENEKLER</p>
          <div class="cv-skills-list">
    `;

    (data.skills || []).forEach(skill => {
      html += `
        <span class="cv-skill-badge">${escHtml(skill)}</span>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;
    
    panelBody.innerHTML = html;
  } catch (e) {
    panelBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✕</div>
        <p>CV verileri yüklenirken hata oluştu.</p>
      </div>`;
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
