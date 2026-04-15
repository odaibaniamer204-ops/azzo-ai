import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const conversations = {};

// =======================
// Detect user intent (mode)
// =======================
function detectMode(message) {
  const text = message.toLowerCase();

  if (text.includes("translate") || text.includes("ترجم")) {
    return "translator";
  }

  if (text.includes("code") || text.includes("bug") || text.includes("error")) {
    return "coder";
  }

  if (
    text.includes("learn") ||
    text.includes("teach") ||
    text.includes("explain")
  ) {
    return "tutor";
  }

  return "chat";
}

// =======================
// System prompt by mode
// =======================
function getSystemPrompt(mode) {
  if (mode === "tutor") {
    return `
You are Azzo, an expert programming tutor.

- Explain step by step
- Use simple examples
- Keep answers clear
- Ask a follow-up question
- Give small exercises

Your goal is to teach, not just answer.
`;
  }

  if (mode === "coder") {
    return `
You are an expert software engineer.

- Write clean and correct code
- Fix bugs directly
- Be concise
- Use best practices
`;
  }

  if (mode === "translator") {
    return `
You are a professional translator.

- Translate accurately
- Keep meaning and tone
- Do not add extra explanation
`;
  }

  return `
You are Azzo, a smart AI assistant.

- Be helpful
- Keep answers clear and friendly
`;
}

// =======================
// Chat Endpoint
// =======================
app.post("/chat", async (req, res) => {
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
  const { message } = req.body;
  const userId = "default";

  const mode = detectMode(message);
  const systemPrompt = getSystemPrompt(mode);

  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    ...conversations[userId],
    {
      role: "user",
      content: message
    }
  ];

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: messages
        })
      }
    );

    const data = await response.json();

    console.log("FULL RESPONSE:", data);

    if (!data.choices) {
        return res.json({
            reply: "Error from AI: " + JSON.stringify(data)
        });
    }

    const reply = data.choices[0].message.content;

    conversations[userId].push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Something went wrong." });
  }
});

// =======================
// Start server
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
app.get("/", (req, res) => {
  res.send("Server is runnig 🚀");
});