const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '')));

// Simple Auth Middleware
const requireAuth = (req, res, next) => {
  if (req.cookies.admin_token === 'furkan_logged_in') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'furkan' && password === 'furkan') {
    res.cookie('admin_token', 'furkan_logged_in', { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); // 1 day
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  if (req.cookies.admin_token === 'furkan_logged_in') {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Videos API
const videosFile = path.join(__dirname, 'data', 'videos.json');

app.get('/api/videos', (req, res) => {
  try {
    const data = fs.readFileSync(videosFile, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/videos', requireAuth, (req, res) => {
  const { id, title, url } = req.body;
  if (!id || !url) return res.status(400).json({ error: 'Invalid data' });

  try {
    let data = [];
    if (fs.existsSync(videosFile)) {
      data = JSON.parse(fs.readFileSync(videosFile, 'utf8'));
    }
    data.push({ id, title, url });
    fs.writeFileSync(videosFile, JSON.stringify(data, null, 2));
    res.json({ success: true, videos: data });
  } catch (err) {
    res.status(500).json({ error: 'Error saving video' });
  }
});

app.delete('/api/videos/:id', requireAuth, (req, res) => {
  try {
    let data = [];
    if (fs.existsSync(videosFile)) {
      data = JSON.parse(fs.readFileSync(videosFile, 'utf8'));
    }
    data = data.filter(v => v.id !== req.params.id);
    fs.writeFileSync(videosFile, JSON.stringify(data, null, 2));
    res.json({ success: true, videos: data });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting video' });
  }
});

// File Upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function updateManifest(folderName) {
  const folderPath = path.join(__dirname, folderName);
  const manifestPath = path.join(folderPath, 'manifest.json');
  
  try {
    const files = fs.readdirSync(folderPath);
    // filter only images and don't include manifest.json
    const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    const images = files.filter(f => imgExts.includes(path.extname(f).toLowerCase()));
    
    fs.writeFileSync(manifestPath, JSON.stringify({ files: images }, null, 2));
  } catch (e) {
    console.error('Error updating manifest:', e);
  }
}

app.post('/api/upload/:category', requireAuth, upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const category = req.params.category;
  let folder = '';
  if (category === 'fotograf') folder = 'fotograf';
  else if (category === 'grafik') folder = 'grafik tasarim';
  else return res.status(400).json({ error: 'Invalid category' });

  let filename = Date.now() + '-' + req.file.originalname.replace(/\s+/g, '_');
  const mime = req.file.mimetype;
  
  try {
    // Fotoğraf ve resim türevlerini sıkıştırarak WebP formatına çeviriyoruz. (GIF ve SVG hariç)
    if (mime.startsWith('image/') && mime !== 'image/svg+xml' && mime !== 'image/gif') {
      filename = filename.replace(/\.[^/.]+$/, "") + ".webp";
      const filepath = path.join(__dirname, folder, filename);
      
      await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })  // Maksimum 1200px genişlik
        .webp({ quality: 80 }) // Yüksek oranlı kalite-boyut optimizasyonu
        .toFile(filepath);
    } else {
      const filepath = path.join(__dirname, folder, filename);
      fs.writeFileSync(filepath, req.file.buffer);
    }
    
    updateManifest(folder);
    res.json({ success: true, filename: filename });
  } catch (err) {
    res.status(500).json({ error: 'Resim işlenirken hata oluştu' });
  }
});

// Admin Delete Media
app.delete('/api/media/:category/:filename', requireAuth, (req, res) => {
  const category = req.params.category;
  const filename = req.params.filename;
  
  let folder = '';
  if (category === 'fotograf') folder = 'fotograf';
  else if (category === 'grafik') folder = 'grafik tasarim';
  else return res.status(400).json({ error: 'Invalid category' });

  const filepath = path.join(__dirname, folder, filename);
  
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      updateManifest(folder);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error deleting file' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile('admin.html', { root: __dirname });
});

// Deploy to GitHub Route
app.post('/api/deploy', requireAuth, (req, res) => {
  exec('git add .', () => {
    exec('git commit -m "Admin paneli: İçerik güncellendi"', () => {
      exec('git push origin main', (err, stdout, stderr) => {
        if (err) {
          return res.status(500).json({ error: err.message + ' (Eğer hiçbir şey değiştirmeden veya yeni resim eklemeden yüklemeye çalışıyorsanız hata verecektir. Önce sisteme bir içerik ekleyin.)' });
        }
        res.json({ success: true });
      });
    });
  });
});

// Create needed directories
['data', 'fotograf', 'grafik tasarim'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
