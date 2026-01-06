import http from "http";
import sqlite3 from "sqlite3";

// --- DATABASE (temporary SQLite) ---
const db = new sqlite3.Database("survey.db");

db.run(`
  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- SERVER ---
const server = http.createServer((req, res) => {
  // CORS (required for GitHub Pages)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // POST /survey
  if (req.method === "POST" && req.url === "/survey") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        const text = parsed.response;

        if (typeof text !== "string" || text.length === 0 || text.length > 2000) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false }));
        }

        db.run(
          "INSERT INTO surveys (text) VALUES (?)",
          [text],
          err => {
            if (err) {
              console.error("DB error:", err);
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false }));
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          }
        );
      } catch (err) {
        console.error("Parse error:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });

    return;
  }

  // Fallback
  res.writeHead(404);
  res.end();
});

// --- REQUIRED FOR RENDER ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
