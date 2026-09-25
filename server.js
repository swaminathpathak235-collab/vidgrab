const express = require('express');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

const COBALT_API = "https://api.cobalt.tools/";

async function getVideo(youtubeUrl) {
  const res = await fetch(COBALT_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      url: youtubeUrl,
      videoQuality: "720",
      filenameStyle: "basic"
    })
  });

  const data = await res.json();

  if (data.status === "error" || !data.url) {
    throw new Error(data.text?.text || data.text || "Cobalt error");
  }

  return data;
}

function extractVideoId(link) {
  const m = (link || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.get('/api/info', async (req, res) => {
  const link = req.query.url || req.query.link || '';
  if (!extractVideoId(link)) return res.status(400).json({ error: 'Invalid YouTube link' });
  try {
    const data = await getVideo(link);
    res.json({ title: data.filename || 'Video ready!', videoId: extractVideoId(link) });
  } catch (e) {
    res.status(500).json({ error: String(e.message).slice(0, 150) });
  }
});

async function handleDownload(req, res) {
  const link = req.query.url || req.query.link || req.body?.link || req.body?.url;
  if (!extractVideoId(link)) return res.status(400).send('Invalid YouTube link');
  try {
    const data = await getVideo(link);
    res.redirect(data.url);
  } catch (e) {
    res.status(500).send('Error: ' + String(e.message).slice(0, 150));
  }
}

app.get('/api/download', handleDownload);
app.post('/api/download', handleDownload);
app.get('/download', handleDownload);
app.post('/download', handleDownload);

app.use((req, res) => res.redirect('/'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
