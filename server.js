const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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

// File Upload Storage - Bütün dosyaları temporary diske kaydeder (RAM limitine takılmamak için)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'data')); // Temporary folder
  },
  filename: function (req, file, cb) {
    cb(null, 'temp_' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 300 * 1024 * 1024 } }); // 300 MB limit

function updateManifest(folderName) {
  const folderPath = path.join(__dirname, folderName);
  const manifestPath = path.join(folderPath, 'manifest.json');
  
  try {
    const files = fs.readdirSync(folderPath);
    const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.mp4', '.m4v', '.mov', '.webm'];
    const mediaFiles = files.filter(f => exts.includes(path.extname(f).toLowerCase()));
    
    fs.writeFileSync(manifestPath, JSON.stringify({ files: mediaFiles }, null, 2));
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
  else if (category === 'video') folder = 'video';
  else {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid category' });
  }

  let baseName = req.file.originalname.replace(/\s+/g, '_').replace(/\.[^/.]+$/, "");
  const mime = req.file.mimetype;
  const tempFilePath = req.file.path;
  let finalFileName = '';
  
  try {
    await new Promise((resolve, reject) => {
      // VIDEO PROCESSING (FFMPEG COMPRESSION)
      if (category === 'video' || (mime && mime.startsWith('video/'))) {
        finalFileName = Date.now() + '-' + baseName + '.mp4';
        const finalPath = path.join(__dirname, folder, finalFileName);
        
        ffmpeg(tempFilePath)
          .outputOptions([
            '-vcodec libx264',
            '-crf 28', 
            '-preset veryfast', 
            '-vf scale=-2:1080', 
            '-acodec aac',
            '-b:a 128k'
          ])
          .save(finalPath)
          .on('end', () => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            resolve();
          })
          .on('error', (err) => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            reject(err);
          });
      } 
      // IMAGE PROCESSING (SHARP WEBP)
      else if (mime && mime.startsWith('image/') && mime !== 'image/svg+xml' && mime !== 'image/gif') {
        finalFileName = Date.now() + '-' + baseName + '.webp';
        const finalPath = path.join(__dirname, folder, finalFileName);
        
        sharp(tempFilePath)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(finalPath)
          .then(() => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            resolve();
          }).catch(err => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            reject(err);
          });
      } 
      // OTHER RAW FILES
      else {
        finalFileName = Date.now() + '-' + req.file.originalname.replace(/\s+/g, '_');
        const finalPath = path.join(__dirname, folder, finalFileName);
        fs.renameSync(tempFilePath, finalPath);
        resolve();
      }
    });

    updateManifest(folder);
    res.json({ success: true, filename: finalFileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Medya işlenirken/sıkıştırılırken hata oluştu.' });
  }
});

// Admin Delete Media
app.delete('/api/media/:category/:filename', requireAuth, (req, res) => {
  const category = req.params.category;
  const filename = req.params.filename;
  
  let folder = '';
  if (category === 'fotograf') folder = 'fotograf';
  else if (category === 'grafik') folder = 'grafik tasarim';
  else if (category === 'video') folder = 'video';
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
['data', 'fotograf', 'grafik tasarim', 'video'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
