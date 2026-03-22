const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");
const { parseCookies } = require("./lib/auth-check");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET ?check=true — validate current session
    if (event.httpMethod === "GET") {
      const cookieHeader = event.headers.cookie || event.headers.Cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies.rv_session;

      if (!token) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "No session" }) };
      }

      const rows = await sql(
        `SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );

      if (rows.length === 0) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid session" }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ authenticated: true }) };
    }

    // POST — login
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      const { username, password } = data;

      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Username and password required" }),
        };
      }

      const expectedUsername = process.env.ADMIN_USERNAME;
      const expectedHash = process.env.ADMIN_PASSWORD_HASH;

      if (!expectedUsername || !expectedHash) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Auth not configured" }),
        };
      }

      const inputHash = crypto.createHash("sha256").update(password).digest("hex");

      if (username !== expectedUsername || inputHash !== expectedHash) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: "Invalid username or password" }),
        };
      }

      // Clean up expired sessions
      await sql(`DELETE FROM sessions WHERE expires_at < NOW()`);

      // Create new session (7 day expiry)
      const token = crypto.randomBytes(32).toString("hex");
      await sql(
        `INSERT INTO sessions (token, expires_at) VALUES ($1, NOW() + INTERVAL '7 days')`,
        [token]
      );

      // Set HttpOnly cookie
      const cookieHeader = `rv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;

      return {
        statusCode: 200,
        headers: { ...headers, "Set-Cookie": cookieHeader },
        body: JSON.stringify({ success: true }),
      };
    }

    // DELETE — logout
    if (event.httpMethod === "DELETE") {
      const cookieHeader = event.headers.cookie || event.headers.Cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies.rv_session;

      if (token) {
        await sql(`DELETE FROM sessions WHERE token = $1`, [token]);
      }

      const clearCookie = `rv_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

      return {
        statusCode: 200,
        headers: { ...headers, "Set-Cookie": clearCookie },
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Auth error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
