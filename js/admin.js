document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

async function checkAuth() {
  try {
    const res = await fetch('/api/check-auth');
    const data = await res.json();
    if (data.authenticated) {
      showDashboard();
    }
  } catch (e) {
    console.log('Not authenticated');
  }
}

async function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const err = document.getElementById('login-error');
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    
    // Yönlendirme (file protokolünden açılmışsa hata vereceği için trycatch mantıklı)
    const data = await res.json();
    if (data.success) {
      err.style.display = 'none';
      showDashboard();
    } else {
      err.innerText = data.error || 'Giriş başarısız.';
      err.style.display = 'block';
    }
  } catch (e) {
    err.innerText = 'Sunucuya bağlanılamadı. Lütfen Node sunucusunun çalıştığından ve http://localhost:3000 üzerinden girdiğinizden emin olun.';
    err.style.display = 'block';
    console.error(e);
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  loadDashboardData();
}

function loadDashboardData() {
  loadVideos();
  loadMediaAdmin('fotograf', 'admin-foto-list');
  loadMediaAdmin('grafik tasarim', 'admin-grafik-list');
}

/* VIDEOS */
function ytIdFromUrl(url) {
  const patterns = [
    /(?:v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function loadVideos() {
  const res = await fetch('/api/videos');
  const videos = await res.json();
  const list = document.getElementById('admin-video-list');
  list.innerHTML = '';
  
  if (videos.length === 0) {
    list.innerHTML = '<p style="color:#888; font-size:0.9rem">Video yok.</p>';
    return;
  }
  
  videos.forEach(v => {
    list.innerHTML += `
      <div class="admin-list-item">
        <div style="flex:1;">
          <div class="admin-list-item-title">${v.title || 'İsimsiz Video'}</div>
          <div class="admin-list-item-url">${v.url}</div>
        </div>
        <button class="admin-del-btn" onclick="deleteVideo('${v.id}')">✕</button>
      </div>
    `;
  });
}

async function addVideo() {
  const urlParams = document.getElementById('yt-input').value;
  const title = document.getElementById('yt-title').value;
  const id = ytIdFromUrl(urlParams);
  
  if (!id) return alert('Geçerli bir YouTube linki girin.');
  
  await fetch('/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title: title || ('Video ' + id), url: urlParams })
  });
  
  document.getElementById('yt-input').value = '';
  document.getElementById('yt-title').value = '';
  loadVideos();
}

async function deleteVideo(id) {
  if (!confirm('Silmek istediğinizden emin misiniz?')) return;
  await fetch(`/api/videos/${id}`, { method: 'DELETE' });
  loadVideos();
}

/* MEDIA (FOTOĞRAF VE GRAFİK) */
async function loadMediaAdmin(folder, elementId) {
  const list = document.getElementById(elementId);
  list.innerHTML = '<p style="color:#888; font-size:0.9rem">Yükleniyor...</p>';
  
  try {
    const res = await fetch(`/${folder}/manifest.json?t=${Date.now()}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const files = data.files || [];
    
    if (files.length === 0) {
      list.innerHTML = '<p style="color:#888; font-size:0.9rem">Gösterilecek öğe yok.</p>';
      return;
    }
    
    list.innerHTML = '';
    files.forEach(f => {
      const src = `/${folder}/${f}`;
      const urlFolder = folder === 'fotograf' ? 'fotograf' : 'grafik';
      list.innerHTML += `
        <div class="admin-list-item">
          <img src="${src}" class="media-thumb">
          <div class="admin-list-item-title" style="flex:1; margin:0 10px;">${f}</div>
          <button class="admin-del-btn" onclick="deleteMedia('${urlFolder}', '${f}')">✕</button>
        </div>
      `;
    });
  } catch(e) {
    list.innerHTML = '<p style="color:#888; font-size:0.9rem">Henüz dosya veya manifest.json yok.</p>';
  }
}

async function uploadMedia(category) {
  const fileInput = document.getElementById(category === 'fotograf' ? 'foto-file' : 'grafik-file');
  const file = fileInput.files[0];
  if (!file) return alert('Lütfen bir dosya seçin.');
  
  const formData = new FormData();
  formData.append('media', file);
  
  try {
    const res = await fetch(`/api/upload/${category}`, {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      fileInput.value = '';
      if (category === 'fotograf') loadMediaAdmin('fotograf', 'admin-foto-list');
      else loadMediaAdmin('grafik tasarim', 'admin-grafik-list');
    } else {
      const error = await res.json();
      alert('Hata: ' + error.error);
    }
  } catch(e) {
    alert('Yükleme sırasında hata oluştu.');
  }
}

async function deleteMedia(category, filename) {
  if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;
  await fetch(`/api/media/${category}/${filename}`, { method: 'DELETE' });
  if (category === 'fotograf') loadMediaAdmin('fotograf', 'admin-foto-list');
  else loadMediaAdmin('grafik tasarim', 'admin-grafik-list');
}

async function deployToGithub() {
  if (!confirm('Tüm değişiklikleriniz kalıcı olarak canlı web sitenize (GitHub) aktarılacak. Emin misiniz?')) return;
  const btn = document.querySelector('button[onclick="deployToGithub()"]');
  const orgText = btn.innerText;
  btn.innerText = '⏳ GitHub\'a Gönderiliyor...';
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/deploy', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Tebrikler! Yaptığınız tüm değişiklikler GitHub Pages üzerinden canlıya aktarıldı. Birkaç dakika içinde sitenizde güncellenmiş olarak görünecektir.');
    } else {
      alert('Hata oluştu: ' + data.error);
    }
  } catch (e) {
    alert('İşlem sırasında beklenmedik bir hata oluştu.');
  }
  
  btn.innerText = orgText;
  btn.disabled = false;
}
