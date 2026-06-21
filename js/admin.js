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
  loadMediaAdmin('video', 'admin-video-list');
  loadMediaAdmin('fotograf', 'admin-foto-list');
  loadMediaAdmin('grafik tasarim', 'admin-grafik-list');
  loadCVAdmin();
}

/* VIDEOS */
function ytIdFromUrl(url) {
  const patterns = [
    /(?:v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/
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
      const urlFolder = folder === 'fotograf' ? 'fotograf' : (folder === 'video' ? 'video' : 'grafik');
      
      let thumbHtml = '';
      if (folder === 'video') {
         thumbHtml = `<video src="${src}" class="media-thumb" muted></video>`;
      } else {
         thumbHtml = `<img src="${src}" class="media-thumb">`;
      }

      list.innerHTML += `
        <div class="admin-list-item">
          ${thumbHtml}
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
  let fileInput, btn;
  if(category === 'fotograf') { fileInput = document.getElementById('foto-file'); }
  else if(category === 'grafik') { fileInput = document.getElementById('grafik-file'); }
  else if(category === 'video') { fileInput = document.getElementById('video-file'); btn = document.getElementById('btn-video'); }
  
  const file = fileInput.files[0];
  if (!file) return alert('Lütfen bir dosya seçin.');
  
  const formData = new FormData();
  formData.append('media', file);
  
  let orgText = "";
  if (btn) {
    orgText = btn.innerText;
    btn.innerText = 'Yüklenip Sıkıştırılıyor... Lütfen Bekleyin...';
    btn.disabled = true;
  }
  
  try {
    const res = await fetch(`/api/upload/${category}`, {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      fileInput.value = '';
      if (category === 'fotograf') loadMediaAdmin('fotograf', 'admin-foto-list');
      else if (category === 'grafik') loadMediaAdmin('grafik tasarim', 'admin-grafik-list');
      else if (category === 'video') loadMediaAdmin('video', 'admin-video-list');
    } else {
      const error = await res.json();
      alert('Hata: ' + error.error);
    }
  } catch(e) {
    alert('Yükleme sırasında hata oluştu.');
  }
  
  if (btn) {
    btn.innerText = orgText;
    btn.disabled = false;
  }
}

async function deleteMedia(category, filename) {
  if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;
  await fetch(`/api/media/${category}/${filename}`, { method: 'DELETE' });
  if (category === 'fotograf') loadMediaAdmin('fotograf', 'admin-foto-list');
  else if (category === 'grafik') loadMediaAdmin('grafik tasarim', 'admin-grafik-list');
  else if (category === 'video') loadMediaAdmin('video', 'admin-video-list');
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

/* CV DÜZENLEME MANTIĞI */
let localCVData = {
  education: [],
  experience: [],
  certificates: [],
  skills: []
};

async function loadCVAdmin() {
  try {
    const res = await fetch('/api/cv?t=' + Date.now());
    if (!res.ok) throw new Error();
    const data = await res.json();
    localCVData = {
      name: data.name || '',
      title: data.title || '',
      profilePhoto: data.profilePhoto || 'fotograf/cv-profile.webp',
      education: data.education || [],
      experience: data.experience || [],
      certificates: data.certificates || [],
      skills: data.skills || []
    };
    
    document.getElementById('cv-name').value = localCVData.name;
    document.getElementById('cv-title').value = localCVData.title;
    
    if (localCVData.profilePhoto) {
      document.getElementById('admin-cv-preview').src = '/' + localCVData.profilePhoto + '?t=' + Date.now();
    }
    
    renderEducationList();
    renderExperienceList();
    renderCertificatesList();
    renderSkillsList();
  } catch (e) {
    console.error('Error loading CV in admin:', e);
  }
}

function renderEducationList() {
  const container = document.getElementById('education-form-container');
  container.innerHTML = '';
  
  if (localCVData.education.length === 0) {
    container.innerHTML = '<p style="color:#666; font-size:0.85rem; margin-bottom:1rem;">Henüz eğitim bilgisi eklenmedi.</p>';
    return;
  }
  
  localCVData.education.forEach((edu, idx) => {
    container.innerHTML += `
      <div class="admin-item-box" data-type="education" data-index="${idx}">
        <div class="admin-item-box-header">
          <h4>Eğitim #${idx + 1}</h4>
          <button type="button" class="admin-del-btn" style="margin:0; width:26px; height:26px; font-size:11px;" onclick="deleteCVItem('education', ${idx})">✕</button>
        </div>
        <div class="admin-form-grid">
          <div class="admin-form-group">
            <label>Okul Adı</label>
            <input type="text" class="admin-input edu-school" value="${edu.school || ''}" onchange="updateCVField('education', ${idx}, 'school', this.value)" placeholder="Örn: Bingöl Üniversitesi">
          </div>
          <div class="admin-form-group">
            <label>Bölüm / Derece</label>
            <input type="text" class="admin-input edu-dept" value="${edu.department || ''}" onchange="updateCVField('education', ${idx}, 'department', this.value)" placeholder="Örn: Radyo ve Televizyon Programcılığı">
          </div>
          <div class="admin-form-group">
            <label>Başlangıç Yılı</label>
            <input type="text" class="admin-input edu-start" value="${edu.startDate || ''}" onchange="updateCVField('education', ${idx}, 'startDate', this.value)" placeholder="Örn: 2019">
          </div>
          <div class="admin-form-group">
            <label>Bitiş Yılı (veya Devam Ediyor)</label>
            <input type="text" class="admin-input edu-end" value="${edu.endDate || ''}" onchange="updateCVField('education', ${idx}, 'endDate', this.value)" placeholder="Örn: 2021 veya Devam Ediyor">
          </div>
          <div class="admin-form-group full-width">
            <label>Açıklama / Detaylar</label>
            <textarea class="admin-input edu-desc" style="height:60px;" onchange="updateCVField('education', ${idx}, 'description', this.value)" placeholder="Eğitim detayları, kazanımlar...">${edu.description || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  });
}

function renderExperienceList() {
  const container = document.getElementById('experience-form-container');
  container.innerHTML = '';
  
  if (localCVData.experience.length === 0) {
    container.innerHTML = '<p style="color:#666; font-size:0.85rem; margin-bottom:1rem;">Henüz iş deneyimi eklenmedi.</p>';
    return;
  }
  
  localCVData.experience.forEach((exp, idx) => {
    container.innerHTML += `
      <div class="admin-item-box" data-type="experience" data-index="${idx}">
        <div class="admin-item-box-header">
          <h4>Deneyim #${idx + 1}</h4>
          <button type="button" class="admin-del-btn" style="margin:0; width:26px; height:26px; font-size:11px;" onclick="deleteCVItem('experience', ${idx})">✕</button>
        </div>
        <div class="admin-form-grid">
          <div class="admin-form-group">
            <label>Şirket / Kurum Adı</label>
            <input type="text" class="admin-input exp-company" value="${exp.company || ''}" onchange="updateCVField('experience', ${idx}, 'company', this.value)" placeholder="Örn: Bingöl Üniversitesi Rektörlüğü">
          </div>
          <div class="admin-form-group">
            <label>Rol / Pozisyon</label>
            <input type="text" class="admin-input exp-role" value="${exp.role || ''}" onchange="updateCVField('experience', ${idx}, 'role', this.value)" placeholder="Örn: Medya Sorumlusu">
          </div>
          <div class="admin-form-group">
            <label>Başlangıç Yılı</label>
            <input type="text" class="admin-input exp-start" value="${exp.startDate || ''}" onchange="updateCVField('experience', ${idx}, 'startDate', this.value)" placeholder="Örn: 2022">
          </div>
          <div class="admin-form-group">
            <label>Bitiş Yılı (veya Devam Ediyor)</label>
            <input type="text" class="admin-input exp-end" value="${exp.endDate || ''}" onchange="updateCVField('experience', ${idx}, 'endDate', this.value)" placeholder="Örn: Devam Ediyor">
          </div>
          <div class="admin-form-group full-width">
            <label>Açıklama / Görevler</label>
            <textarea class="admin-input exp-desc" style="height:60px;" onchange="updateCVField('experience', ${idx}, 'description', this.value)" placeholder="Neler yaptınız, hangi programları kullandınız...">${exp.description || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  });
}

function renderCertificatesList() {
  const container = document.getElementById('certificates-form-container');
  container.innerHTML = '';
  
  if (localCVData.certificates.length === 0) {
    container.innerHTML = '<p style="color:#666; font-size:0.85rem; margin-bottom:1rem;">Henüz sertifika eklenmedi.</p>';
    return;
  }
  
  localCVData.certificates.forEach((cert, idx) => {
    container.innerHTML += `
      <div class="admin-item-box" data-type="certificates" data-index="${idx}">
        <div class="admin-item-box-header">
          <h4>Sertifika #${idx + 1}</h4>
          <button type="button" class="admin-del-btn" style="margin:0; width:26px; height:26px; font-size:11px;" onclick="deleteCVItem('certificates', ${idx})">✕</button>
        </div>
        <div class="admin-form-grid three-col">
          <div class="admin-form-group">
            <label>Sertifika / Başarı Adı</label>
            <input type="text" class="admin-input cert-name" value="${cert.name || ''}" onchange="updateCVField('certificates', ${idx}, 'name', this.value)" placeholder="Örn: İleri Düzey Adobe Photoshop">
          </div>
          <div class="admin-form-group">
            <label>Kurum</label>
            <input type="text" class="admin-input cert-org" value="${cert.organization || ''}" onchange="updateCVField('certificates', ${idx}, 'organization', this.value)" placeholder="Örn: Adobe Certified">
          </div>
          <div class="admin-form-group">
            <label>Yıl / Tarih</label>
            <input type="text" class="admin-input cert-date" value="${cert.date || ''}" onchange="updateCVField('certificates', ${idx}, 'date', this.value)" placeholder="Örn: 2022">
          </div>
        </div>
      </div>
    `;
  });
}

function renderSkillsList() {
  const container = document.getElementById('skills-list-container');
  container.innerHTML = '';
  
  if (localCVData.skills.length === 0) {
    container.innerHTML = '<p style="color:#666; font-size:0.85rem;">Henüz program/yetenek eklenmedi.</p>';
    return;
  }
  
  localCVData.skills.forEach((skill, idx) => {
    container.innerHTML += `
      <div class="admin-skill-tag">
        <span>${skill}</span>
        <span onclick="deleteSkill(${idx})">✕</span>
      </div>
    `;
  });
}

function addEducationField() {
  localCVData.education.push({
    school: '',
    department: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  renderEducationList();
}

function addExperienceField() {
  localCVData.experience.push({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  renderExperienceList();
}

function addCertificateField() {
  localCVData.certificates.push({
    name: '',
    organization: '',
    date: ''
  });
  renderCertificatesList();
}

function addSkillBadge() {
  const input = document.getElementById('new-skill-input');
  const val = input.value.trim();
  if (!val) return;
  
  const skillsToAdd = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  skillsToAdd.forEach(skill => {
    if (!localCVData.skills.includes(skill)) {
      localCVData.skills.push(skill);
    }
  });
  
  input.value = '';
  renderSkillsList();
}

function deleteCVItem(type, idx) {
  if (!confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) return;
  localCVData[type].splice(idx, 1);
  if (type === 'education') renderEducationList();
  else if (type === 'experience') renderExperienceList();
  else if (type === 'certificates') renderCertificatesList();
}

function deleteSkill(idx) {
  localCVData.skills.splice(idx, 1);
  renderSkillsList();
}

function updateCVField(type, idx, field, val) {
  localCVData[type][idx][field] = val;
}

async function saveCVData() {
  const name = document.getElementById('cv-name').value;
  const title = document.getElementById('cv-title').value;
  
  const payload = {
    name: name,
    title: title,
    profilePhoto: localCVData.profilePhoto || 'fotograf/cv-profile.webp',
    education: localCVData.education,
    experience: localCVData.experience,
    certificates: localCVData.certificates,
    skills: localCVData.skills
  };
  
  try {
    const res = await fetch('/api/cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('CV bilgileri başarıyla kaydedildi!');
      loadCVAdmin();
    } else {
      alert('Hata oluştu: ' + data.error);
    }
  } catch (e) {
    alert('CV kaydedilirken hata oluştu.');
  }
}

async function uploadCVProfile() {
  const fileInput = document.getElementById('cv-profile-file');
  const btn = document.getElementById('btn-cv-profile');
  const file = fileInput.files[0];
  if (!file) return alert('Lütfen bir profil resmi seçin.');
  
  const formData = new FormData();
  formData.append('media', file);
  
  const orgText = btn.innerText;
  btn.innerText = 'Yükleniyor...';
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/upload/cv-profile', {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      fileInput.value = '';
      alert('Profil resmi başarıyla güncellendi!');
      loadCVAdmin();
    } else {
      const error = await res.json();
      alert('Hata: ' + error.error);
    }
  } catch (e) {
    alert('Yükleme sırasında hata oluştu.');
  }
  
  btn.innerText = orgText;
  btn.disabled = false;
}

