// // server.ts
// import express from 'express';
// import bodyParser from 'body-parser';
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import Job from './models/jobs.js';
// import { summarizeJobPost } from './summarizer.ts';

// dotenv.config();

// // 🧠 MongoDB connection
// mongoose
//   .connect(process.env.MONGO_URI, { dbName: 'job_scraper' })
//   .then(() => console.log('✅ Connected to MongoDB'))
//   .catch((err) => console.error('❌ MongoDB connection failed:', err));

// const app = express();
// app.use(bodyParser.json({ limit: '5mb' }));

// // 🧠 Summarization endpoint
// app.post('/scrape', async (req, res) => {
//   const { url, html } = req.body;
//   console.log('✅ Received scrape from:', url);

//   try {
//     const summary = await summarizeJobPost(html, url);

//     console.log('🧠 Final Parsed Summary:', summary);

//     // ✅ Required fields
//     if (!summary.title || !summary.summary) {
//       console.warn('⚠️ Skipping save due to missing essential fields.', summary);
//       return res.status(400).json({ error: 'Missing essential fields' });
//     }

//     // ✅ Provide defaults if null
//     const jobToSave = {
//       title: summary.title,
//       company: summary.company || 'Unknown company',
//       location: summary.location || 'Remote / Not specified',
//       experience: summary.experience || 'Not specified',
//       skills: summary.skills || [],
//       summary: summary.summary,
//       insights: summary.insights || '',
//       priority:    (summary.priority   ?? "LOW").toUpperCase(),
//       role_tags:   summary.role_tags   ?? [],
//       source_url:  summary.source_url  ?? url,   // <-- KEEP IT!
//       scrapedAt:   new Date(),
//       url,                                // keep original URL as well
//     };

//     await Job.create(jobToSave);
//     console.log('💾 Job saved to MongoDB');

//     res.json({ status: 'processed', summary: jobToSave });
//   } catch (err) {
//     console.error('❌ LLM summarization failed:', err);
//     res.status(500).json({ error: 'LLM summarization failed' });
//   }
// });

// // 🔍 Test ping
// app.get('/', (_req, res) => {
//   res.send('Server is up and running ✅');
// });

// // 📄 Get recent jobs
// app.get('/jobs', async (_req, res) => {
//   const jobs = await Job.find().sort({ scrapedAt: -1 }).limit(100);
//   res.json(jobs);
// });

// // 🔊 Start server
// app.listen(4000, () => {
//   console.log('🚀 Listening on http://localhost:4000');
// });


// server.js  – complete file
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from './models/jobs.js';
import { summarizeJobPost } from './summarizer.ts';

dotenv.config();

/* ─────────────────────────── Mongo ─────────────────────────── */
mongoose.connect(process.env.MONGO_URI, { dbName: 'job_scraper' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ Mongo failed:', err));

/* ────────────────────────── Express ────────────────────────── */
const app = express();
app.use(bodyParser.json({ limit: '5mb' }));

/* ─── POST /scrape  –  create a job from raw HTML ───────────── */
app.post('/scrape', async (req, res) => {
  const { url, html } = req.body;
  console.log('➡️  Scrape request:', url);

  try {
    const parsed = await summarizeJobPost(html, url);

    if (!parsed.title || !parsed.summary) {
      return res.status(400).json({ error: 'Missing essential fields' });
    }

    const job = await Job.create({
      title      : parsed.title,
      company    : parsed.company     ?? 'Unknown company',
      location   : parsed.location    ?? 'Remote / Not specified',
      experience : parsed.experience  ?? 'Not specified',
      skills     : parsed.skills      ?? [],
      summary    : parsed.summary,
      insights   : parsed.insights    ?? '',
      priority   : ['HIGH','MEDIUM','LOW'].includes(parsed.priority)
                   ? parsed.priority  : 'LOW',
      role_tags  : parsed.role_tags   ?? [],
      source_url : parsed.source_url  ?? url,
      url,
    });

    console.log('💾 Job saved:', job._id);
    res.json(job);
  } catch (err) {
    console.error('❌ Scrape failed:', err);
    res.status(500).json({ error: 'LLM summarisation failed' });
  }
});

/* ─── CRUD routes the frontend now uses ─────────────────────── */
app.get('/jobs', async (_req, res) => {
  const jobs = await Job.find().sort({ scrapedAt: -1 });
  res.json(jobs);
});

app.get('/jobs/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: 'Invalid job id' });

  const job = await Job.findById(id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.delete('/jobs/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid job id' });
  }

  const deletedJob = await Job.findByIdAndDelete(id);
  if (!deletedJob) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ ok: true });
});

/* ────────────────────────── Server up ───────────────────────── */
const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`🚀 API ready on http://localhost:${PORT}`));
