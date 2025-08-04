// import { GoogleGenerativeAI } from '@google/generative-ai';

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// export async function summarizeJobPost(rawHtml: string, sourceUrl: string) {
//   const API_KEY = process.env.GEMINI_API_KEY;
//   const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

//   const prompt = `
// You are an AI-powered job data extractor.

// Given raw HTML of a job listing, extract and return a JSON object with the following:

// \`\`\`json
// {
//   "title": "string",                      // Job title
//   "company": "string | null",            // Company name
//   "location": "string | null",           // Location (or "Remote")
//   "experience": "string | null",         // Experience needed (e.g., 1-3 years)
//   "skills": ["string", ...],             // 5–10 relevant technical skills
//   "summary": "string",                   // 2–3 line human-written summary (not copied)
//   "insights": "string",                  // AI-written insights: what makes this job a good/bad fit, how to prepare, red flags, etc.
//   "priority": "HIGH | MEDIUM | LOW",     // Based on urgency phrases ("apply fast", "hiring now", etc.)
//   "role_tags": ["Frontend", "SDE", ...], // Tags like "Frontend", "Backend", "Intern", "Remote", etc.
//   "source_url": "string"                 // The provided source URL
// }
// \`\`\`

// Guidelines:
// - Keep summary concise and clear.
// - AI Insights should be personalized: give prep tips, red flags, and suggestions.
// - Infer tags and priority smartly.
// - Output clean JSON enclosed in triple backticks.

// Here is the HTML content:
// """
// ${rawHtml.slice(0, 15000)}
// """

// Original Source: ${sourceUrl}

// Only respond with valid JSON.
// `;


//   const response = await fetch(API_URL, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       contents: [
//         {
//           parts: [{ text: prompt }]
//         }
//       ]
//     })
//   });

//   const json = await response.json();
//   const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

//   try {
//     const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
//     const normalized = cleaned.replace(/\\n/g, '\n');
//     const parsed  = JSON.parse(normalized)

//     return {
//       ...parsed,
//       source_url: parsed.source_url ?? sourceUrl,
//       priority:   (parsed.priority  ?? "LOW").toUpperCase(),
//     }
//   } catch (err) {
//     console.warn('⚠️ Could not parse structured JSON. Returning raw text.');
//     return { summary: rawText };
//   }
// }



import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function summarizeJobPost (rawHtml: string, sourceUrl: string) {
  /* ---------- build Gemini prompt ---------- */
  const prompt = `
You are an AI job-post parser.

Return **ONLY** JSON (inside triple back-ticks) shaped like:

{
  "title":        "string",
  "company":      "string|null",
  "location":     "string|null",
  "experience":   "string|null",
  "skills":       ["…", …],      // 5-10
  "summary":      "string",      // 2-3 lines, re-written
  "insights":     "string",      // prep tips, red flags, etc.
  "priority":     "HIGH|MEDIUM|LOW",
  "role_tags":    ["…", …],
  "source_url":   "string"
}

Guidelines:
• Don’t copy paragraphs verbatim.  
• Decide **priority** from urgency language.  
• Infer sensible defaults if data is missing.  

HTML ↓
"""
${rawHtml.slice(0, 15_000)}
"""
Original URL: ${sourceUrl}
`

  /* ---------- call Gemini ---------- */
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  )

  const raw = (await resp.json())
               .candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  /* ---------- normalise + parse ---------- */
  try {
    const json = JSON.parse(
      raw.replace(/```json|```/g, '').replace(/\\n/g, '\n').trim()
    )

    return {
      ...json,
      source_url: json.source_url ?? sourceUrl,
      priority  : (json.priority ?? 'LOW').toUpperCase()          // e.g. “high” -> “HIGH”
    }
  } catch {
    console.warn('⚠️ Gemini returned unparsable payload')
    return { title: null, summary: null }                         // forces skip-save
  }
}

