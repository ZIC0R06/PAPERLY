const OpenAI = require("openai");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");        // 👈 LINE 7
const pdfParse = require("pdf-parse");

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
if (!GROQ_API_KEY || !HF_API_KEY) {
  console.error("Missing API keys in .env file");
  process.exit(1);
}

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});


// ─────────────────────────────────────────────
// SEARCH PAPERS (ArXiv)
// ─────────────────────────────────────────────
// ─── Combined Search ──────────────────────────────────────────────────────────

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "No query" });

  try {
    const [arxivResults, semanticResults, openAlexResults] =
      await Promise.allSettled([
        fetchArxiv(query),
        fetchSemantic(query),
        fetchOpenAlex(query),
      ]);

    var papers = [];
    if (arxivResults.status === "fulfilled")
      papers.push(...arxivResults.value);
    if (semanticResults.status === "fulfilled")
      papers.push(...semanticResults.value);
    if (openAlexResults.status === "fulfilled")
      papers.push(...openAlexResults.value);

    // Remove duplicates by title
    var seen = new Set();
    papers = papers.filter(function (p) {
      var key = p.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(papers);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ─── ArXiv Fetch ──────────────────────────────────────────────────────────────

async function fetchArxiv(query) {
  const response = await axios.get(
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      query
    )}&max_results=8`,
    { timeout: 15000 }
  );
  const data = response.data;
  const entries = [];
  const entryMatches = data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

  entryMatches.forEach(function (entry) {
    const title =
      (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "No title";
    const summary =
      (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1] || "";
    const link =
      (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || "#";

    entries.push({
      title: title.trim().replace(/\n/g, " "),
      summary: summary.trim().replace(/\n/g, " "),
      link: link.trim(),
      source: "ArXiv",
    });
  });

  return entries;
}

// ─── Semantic Scholar Fetch ───────────────────────────────────────────────────

async function fetchSemantic(query) {
  const response = await axios.get(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      query
    )}&limit=8&fields=title,abstract,url,citationCount`,
    { timeout: 15000 }
  );
  const data = response.data;

  return (data.data || []).map(function (p) {
    return {
      title: p.title || "No title",
      summary: p.abstract || "No abstract available.",
      link: p.url || "#",
      citationCount: p.citationCount || 0,
      source: "Semantic Scholar",
    };
  });
}

// ─── OpenAlex Fetch ───────────────────────────────────────────────────────────

async function fetchOpenAlex(query) {
  const response = await axios.get(
    `https://api.openalex.org/works?search=${encodeURIComponent(
      query
    )}&per-page=8&mailto=dhirvanshita@gmail.com`,
    { timeout: 15000 }
  );
  const data = response.data;

  return (data.results || []).map(function (p) {
    return {
      title: p.title || "No title",
      summary: p.abstract_inverted_index
        ? reconstructAbstract(p.abstract_inverted_index)
        : "No abstract available.",
      link: p.doi ? "https://doi.org/" + p.doi : p.id || "#",
      source: "OpenAlex",
    };
  });
}

// ─── OpenAlex Abstract Reconstruct ───────────────────────────────────────────

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return "";
  var words = [];
  Object.keys(invertedIndex).forEach(function (word) {
    invertedIndex[word].forEach(function (pos) {
      words[pos] = word;
    });
  });
  return words.join(" ");
}


// ─────────────────────────────────────────────
// SUMMARIZE (HuggingFace)
// ─────────────────────────────────────────────

app.post("/summarize", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).send("Missing text.");
  }

  try {
    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn",
      {
        inputs: text.substring(0, 2000),
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    console.log("HF Response:", response.data);

    let summary = "";

    if (Array.isArray(response.data)) {
      summary =
        response.data[0]?.summary_text ||
        response.data[0]?.generated_text ||
        "";
    } else if (typeof response.data === "object") {
      summary =
        response.data.summary_text ||
        response.data.generated_text ||
        "";
    }

    if (!summary) {
      summary = "Summary generated but format was unexpected.";
    }

    console.log("FINAL SUMMARY SENT:", summary);

    res.json({ summary });
  } catch (err) {
    console.error(
      "Summarize error:",
      err.response?.data || err.message
    );

    res.status(500).send("Error summarizing text.");
  }
});


// ─────────────────────────────────────────────
// FLASHCARDS (Groq)
// ─────────────────────────────────────────────

app.post("/flashcards", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).send("Missing text.");
  }

  const prompt = `
Create 5 academic flashcards from the following research paper text.

Return ONLY valid JSON.

Format EXACTLY like this:

{
  "flashcards": [
    {
      "question": "Question here",
      "answer": "Answer here"
    }
  ]
}

Rules:
- No markdown
- No explanation
- No extra text
- No \`\`\`json
- Only pure JSON

Text:
${text.substring(0, 3000)}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Return ONLY pure valid JSON. No markdown. No explanation. No text outside JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });
const raw = completion.choices[0]?.message?.content || "";
console.log("RAW FLASHCARDS:", raw);

// safer JSON extraction
let cleaned = raw
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

// find first { and last }
const firstBrace = cleaned.indexOf("{");
const lastBrace = cleaned.lastIndexOf("}");

if (firstBrace !== -1 && lastBrace !== -1) {
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
}

console.log("CLEANED FLASHCARDS:", cleaned);

let parsed;

try {
  parsed = JSON.parse(cleaned);
} catch (err) {
  console.error("JSON Parse Failed:", err.message);
  console.error("Bad JSON was:", cleaned);

  return res.json({
    flashcards: [
      {
        question: "Generation Error",
        answer: "Groq returned invalid JSON."
      }
    ]
  });
}

let flashcards = [];

if (Array.isArray(parsed)) {
  flashcards = parsed;
} else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
  flashcards = parsed.flashcards;
}

if (!flashcards.length) {
  flashcards = [
    {
      question: "Generation Error",
      answer: "No valid flashcards found."
    }
  ];
}

console.log("FINAL FLASHCARDS:", flashcards);

res.json({
  flashcards: flashcards
});
  } catch (err) {
    console.error(
      "Flashcards error:",
      err.response?.data || err.message
    );

    res.status(500).send("Error generating flashcards.");
  }
});

// ─────────────────────────────────────────────
// CHAT (Groq)
// ─────────────────────────────────────────────
app.post("/gapfinder", async (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "No topic" });

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a research expert. Return ONLY valid JSON. No markdown. No explanation.
Format:
{
  "gaps": [
    {
      "title": "Gap title",
      "description": "Why this gap exists and why it matters",
      "opportunity": "What kind of research could fill this gap",
      "priority": "High",
      "priorityScore": 92,
      "methodology": {
        "approach": "NLP-based model + dataset analysis",
        "type": "ML Model",
        "steps": ["Step 1", "Step 2", "Step 3"]
      },
      "researchQuestions": [
        "Specific research question 1?",
        "Specific research question 2?",
        "Specific research question 3?"
      ]
    }
  ],
  "hotAreas": ["area1", "area2", "area3"],
  "suggestedTopics": ["topic1", "topic2", "topic3"]
}`
                },
                {
                    role: "user",
                    content: `Find 5 significant research gaps in the field of: ${topic}. 
For each gap assign a DIFFERENT and REALISTIC priority score out of 100 based on:
- How much real-world impact solving this gap would have
- How many researchers are currently working on it
- How urgent the problem is

Rules for scoring:
- High priority gaps: score between 80-95
- Medium priority gaps: score between 50-75  
- Low priority gaps: score between 20-45
- Every gap MUST have a different score — no two gaps can have the same score
- Do NOT default to 70 for everything

Also for each gap:
1. Give priority level (High/Medium/Low) matching the score range above
2. Suggest specific methodology (type: Literature Review / ML Model / Survey / Clinical Study / Experiment) with 3 concrete steps
3. Generate 3 specific research questions for a thesis
Order gaps from highest to lowest priority score.`

                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const raw = completion.choices[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);

        // Step 2: For each gap, fetch related ArXiv papers
        const gapsWithPapers = await Promise.all(
            (parsed.gaps || []).map(async (gap) => {
                try {
                    const arxivRes = await axios.get(
                        `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(gap.title)}&max_results=3`,
                        { timeout: 10000 }
                    );
                    const entries = [];
                    const entryMatches = arxivRes.data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
                    entryMatches.forEach(function(entry) {
                        const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "No title";
                        const link  = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || "#";
                        const year  = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || "";
                        entries.push({
                            title: title.trim().replace(/\n/g, " "),
                            link:  link.trim(),
                            year:  year ? year.substring(0, 4) : ""
                        });
                    });
                    return { ...gap, relatedPapers: entries };
                } catch(e) {
                    return { ...gap, relatedPapers: [] };
                }
            })
        );

        res.json({ ...parsed, gaps: gapsWithPapers });

    } catch (err) {
        console.error("Gap finder error:", err);
        res.status(500).json({ error: "Failed to find gaps" });
    }
});
// ─────────────────────────────────────────────
// FILE UPLOAD + ANALYZE (Groq)
// ─────────────────────────────────────────────

app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    try {
        let extractedText = "";

        if (req.file.mimetype === "application/pdf") {
            try {
                const pdfData = await pdfParse(req.file.buffer, { version: 'default' });
                extractedText = pdfData.text.substring(0, 4000);
            } catch(pdfErr) {
                console.error("PDF parse error:", pdfErr);
                // Fallback — treat as text
                extractedText = req.file.buffer.toString("utf-8").substring(0, 4000);
            }
        } else {
            extractedText = req.file.buffer.toString("utf-8").substring(0, 4000);
        }

        if (!extractedText.trim()) {
            return res.status(400).json({ error: "Could not extract text from file." });
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are a research assistant. Analyze the given paper/document and provide: 1) Main contribution 2) Methodology 3) Key findings 4) Limitations 5) Future work. Be clear and concise."
                },
                {
                    role: "user",
                    content: `Analyze this research paper:\n\n${extractedText}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        const analysis = completion.choices[0]?.message?.content || "Could not analyze.";

        res.json({
            filename: req.file.originalname,
            analysis: analysis,
            textLength: extractedText.length
        });

    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Failed to analyze file." });
    }
});

// ─────────────────────────────────────────────
// NEWS (NewsAPI)
// ─────────────────────────────────────────────

app.get("/news", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).send("Missing query.");
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${NEWS_API_KEY}`;

    const response = await axios.get(url, {
      timeout: 15000,
    });

    res.json(response.data);
  } catch (err) {
    console.error("News error:", err.message);
    res.status(500).send("Error fetching news.");
  }
});
app.post("/chat", async (req, res) => {
    const { messages, system } = req.body;
    if (!messages) return res.status(400).json({ error: "No messages" });
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: system || "You are a helpful research assistant." },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        res.json({ reply: completion.choices[0]?.message?.content || "" });
    } catch (err) {
        res.status(500).json({ error: "Chat failed" });
    }
});

app.post("/followups", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ questions: [] });
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: 'Return ONLY JSON: {"questions": ["Q1?", "Q2?", "Q3?"]}' },
                { role: "user", content: "Generate 3 follow-up questions for: " + text.substring(0, 1000) }
            ],
            temperature: 0.5,
            max_tokens: 300
        });
        const raw = completion.choices[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        res.json({ questions: parsed.questions || [] });
    } catch (err) {
        res.json({ questions: [] });
    }
});
// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(
    "✅ Paperly server running on http://localhost:5000"
  );
  console.log("   /search      → ArXiv");
  console.log("   /summarize   → HuggingFace");
  console.log("   /flashcards  → Groq");
  console.log("   /chat        → Groq");
   console.log("   /followups   → Groq");
  console.log("   /news        → NewsAPI"); 
    console.log("   /gapfinder   → Groq");
    console.log("   /upload      → Groq"); 
});