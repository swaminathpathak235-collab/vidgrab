const express = require('express');
const { Innertube } = require('youtubei.js');

const app = express();
const ytPromise = Innertube.create();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

async function getAudio(videoId) {
  const yt = await ytPromise;
  const info = await yt.getInfo(videoId);
  const title = info.basic_info.title;

  const formats = info.streaming_data?.adaptive_formats || [];
  const audio = formats
    .filter(f => f.mime_type && f.mime_type.startsWith('audio/'))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

  if (!audio) throw new Error('Audio format nahi mila');
  return { title, url: audio.url };
}

function extractVideoId(link) {
  const m = (link || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// info route (frontend yahi call karta hai)
app.get('/api/info', async (req, res) => {
  const videoId = extractVideoId(req.query.url || req.query.link || '');
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube link' });
  try {
    const { title } = await getAudio(videoId);
    res.json({ title, videoId });
  } catch (e) {
    res.status(500).json({ error: e.message.slice(0, 150) });
  }
});

// download routes (GET + POST, dono naam supported)
async function handleDownload(req, res) {
  const link = req.query.url || req.query.link || req.body?.link || req.body?.url;
  const videoId = extractVideoId(link);
  if (!videoId) return res.status(400).send('Invalid YouTube link');
  try {
    const { url } = await getAudio(videoId);
    res.redirect(url);
  } catch (e) {
    res.status(500).send('Error: ' + e.message.slice(0, 150));
  }
}
app.get('/api/download', handleDownload);
app.post('/api/download', handleDownload);
app.get('/download', handleDownload);
app.post('/download', handleDownload);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
