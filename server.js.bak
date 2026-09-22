const express = require('express');
const ytdl = require('@distube/ytdl-core');
const app = express();
app.use(express.static('public'));
const PORT = process.env.PORT || 4000;

// Video info + quality list
app.get('/api/info', async (req, res) => {
  const url = req.query.url;
  if (!url || !ytdl.validateURL(url))
    return res.status(400).json({ error: 'Valid YouTube link paste karo' });
  try {
    const info = await ytdl.getInfo(url);
    const v = info.videoDetails;
    const seen = new Set();
    const qualities = [];
    // MP4 video qualities (video-only, audio bhi stream me judta hai client-side link se)
    info.formats.filter(f => f.hasVideo && f.container === 'mp4' && f.height)
      .sort((a, b) => b.height - a.height)
      .forEach(f => {
        const q = f.height + 'p';
        if (!seen.has(q)) {
          seen.add(q);
          qualities.push({ type: 'mp4', label: q + ' MP4', itag: f.itag, size: f.contentLength });
        }
      });
    // Audio (MP3-style)
    const bestAudio = info.formats.filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => b.audioBitrate - a.audioBitrate)[0];
    if (bestAudio) qualities.push({ type: 'mp3', label: 'MP3 Audio', itag: bestAudio.itag, size: bestAudio.contentLength });

    res.json({
      success: true,
      title: v.title,
      thumbnail: v.thumbnails[v.thumbnails.length - 1].url,
      duration: v.lengthSeconds,
      author: v.author.name,
      qualities
    });
  } catch (e) {
    res.status(500).json({ error: 'Video info nahi mili. Link check karo.' });
  }
});

// Download stream (quality choose karke)
app.get('/api/download', (req, res) => {
  const url = req.query.url, itag = req.query.itag, type = req.query.type;
  if (!url || !ytdl.validateURL(url)) return res.status(400).json({ error: 'Galat link' });
  const opts = itag ? { filter: f => f.itag == itag } : { quality: 'highest' };
  try {
    const stream = ytdl(url, opts);
    res.setHeader('Content-Disposition', 'attachment; filename="' +
      encodeURIComponent((req.query.title || 'video').slice(0, 50)) + (type === 'mp3' ? '.m4a' : '.mp4') + '"');
    stream.on('error', () => { try { res.end(); } catch (e) {} });
    stream.pipe(res);
  } catch (e) {
    res.status(500).json({ error: 'Download fail' });
  }
});

app.listen(PORT, () => console.log('VidGrab v12 live on port ' + PORT));
