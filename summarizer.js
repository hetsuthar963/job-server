import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function summarizeJobPost(rawHtml, sourceUrl) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
You are a professional AI job analyst and information extractor.

You are given raw HTML content of a job posting page. Your task is to analyze and extract the most relevant and structured job information. Output only a valid JSON object with the following schema:

\`\`\`json
{
  "title": "string (Job title, e.g., Frontend Developer)",
  "company": "string (Hiring company, e.g., Google or null if missing)",
  "location": "string (e.g., Remote, Bangalore, etc. or null)",
  "experience": "string (e.g., 2-4 years, Entry-level, Senior, etc. or null)",
  "skills": ["string", "string", ...] // Top 5-10 technical or soft skills (sorted by relevance),
  "summary": "string (3-line overview of job responsibilities written in natural tone, not copied)",
  "priority_score": number (1–5) // Score urgency based on language like 'immediate hiring', 'urgent need', 'apply now', etc.
  "role_tags": ["string", ...] // Keywords like: Frontend, Backend, Fullstack, Remote, Internship, SDE, Lead, etc.
  "source_url": "string (Original source link provided)"
}
\`\`\`

Your output must:
- Be a valid JSON enclosed in triple backticks
- Avoid copying entire paragraphs verbatim
- Infer missing fields smartly if needed
- Prioritize concise and human-readable results

Here is the job post HTML:
"""
${rawHtml.slice(0, 15000)}
"""

The source URL is: ${sourceUrl}
Only respond with clean JSON.
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().trim()

    // Clean and parse
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return parsed
  } catch (error) {
    console.error('❌ Gemini summarization failed:', error)
    throw error
  }
}
