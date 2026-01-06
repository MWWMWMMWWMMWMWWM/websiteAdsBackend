import http from "http";
import pg from "pg";

const { Pool } = pg;

// ---- DATABASE ----
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create table ON STARTUP
await pool.query(`
  CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`);

console.log("Database initialized");

// ---- SERVER ----
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end("ok");
  }

  // POST /survey
  if (req.method === "POST" && req.url === "/survey") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const { response } = JSON.parse(body);

        if (
          typeof response !== "string" ||
          response.length === 0 ||
          response.length > 2000
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false }));
        }

        await pool.query(
          "INSERT INTO surveys (text) VALUES ($1)",
          [response]
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));

      } catch (err) {
        console.error("Error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });

    return;
  }

  res.writeHead(404);
  res.end();
});

// ---- RENDER PORT ----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
