const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const app = express();
app.use(express.json());
app.use(express.static('public'));
const TEMP = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP);
const PORT = 4000;

app.get('/api/instagram', (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http'))
    return res.status(400).json({ error: 'Valid link paste karo' });
  exec('yt-dlp --no-warnings --no-check-certificate --no-playlist ' +
    '--playlist-items 1 --socket-timeout 8 -j "' + url + '"',
    { maxBuffer: 1024 * 1024 * 50, timeout: 30000 },
    (err, stdout) => {
      if (err) return res.status(500).json({ error: 'Fetch fail. Link sahi hai?' });
      try {
        const info = JSON.parse(stdout.trim().split('\n').pop());
        const videoLink = info.webpage_url || info.original_url || url;
        res.json({ success: true, link: videoLink, thumbnail: info.thumbnail || '', title: info.title || 'video' });
      } catch (e) { res.status(500).json({ error: 'Parse fail' }); }
    });
});

// ⭐ MP4 - video+audio alag download karke ffmpeg se MERGE (ye guaranteed chalenga)
app.get('/api/download', (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) return res.status(400).json({ error: 'Galat link' });
  const id = Date.now();
  const outBase = path.join(TEMP, 'm' + id);

  const child = exec('yt-dlp --no-warnings --no-check-certificate --no-playlist ' +
    '-f "b[ext=mp4][height<=720]/bv*[height<=720]+ba/b" ' +
    '--merge-output-format mp4 ' +
    '--concurrent-fragments 6 --http-chunk-size 2M ' +
    '--socket-timeout 10 --retries 3 --newline ' +
    '-o "' + outBase + '.%(ext)s" "' + url + '"',
    { maxBuffer: 1024 * 1024 * 20, timeout: 900000 });

  child.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'MP4 fail. Terminal me error dekho' });
    let videoFile = null;
    fs.readdirSync(TEMP).forEach(f => {
      if (f.startsWith('m' + id) && (f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm'))) videoFile = f;
    });
    if (!videoFile) return res.status(500).json({ error: 'File nahi mili' });
    const finalName = 'done' + id + '.mp4';
    fs.renameSync(path.join(TEMP, videoFile), path.join(TEMP, finalName));
    res.json({ success: true, videoUrl: '/api/file?f=' + finalName });
  });
  child.on('error', () => res.status(500).json({ error: 'Process error' }));
});

// MP3 (pehle jaisa, chal raha hai)
app.get('/api/mp3direct', (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) return res.status(400).json({ error: 'Galat link' });
  const id = Date.now();
  const outBase = path.join(TEMP, 'a' + id);
  exec('yt-dlp --no-warnings --no-check-certificate --no-playlist -x --audio-quality 5 ' +
    '--concurrent-fragments 6 --socket-timeout 10 --retries 3 -o "' + outBase + '.%(ext)s" "' + url + '"',
    { maxBuffer: 1024 * 1024 * 20, timeout: 900000 },
    (err) => {
      if (err) return res.status(500).json({ error: 'MP3 fail' });
      let afile = null;
      fs.readdirSync(TEMP).forEach(f => { if (f.startsWith('a' + id)) afile = f; });
      if (!afile) return res.status(500).json({ error: 'Audio nahi mili' });
      res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
      res.setHeader('Content-Type', 'audio/mpeg');
      const s = fs.createReadStream(path.join(TEMP, afile));
      s.pipe(res);
      s.on('end', () => { try { fs.unlinkSync(path.join(TEMP, afile)); } catch (e) {} });
    });
});

app.get('/api/file', (req, res) => {
  const f = path.basename(req.query.f || '');
  const fp = path.join(TEMP, f);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File expire ho gayi' });
  res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
  res.setHeader('Content-Type', 'video/mp4');
  fs.createReadStream(fp).pipe(res);
});

app.listen(PORT, () => console.log('VidGrab MERGE-FIX v11 chalu: http://localhost:' + PORT));
