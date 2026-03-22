const { neon } = require("@neondatabase/serverless");

// Parse cookies from the raw cookie header string
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((pair) => {
    const [name, ...rest] = pair.trim().split("=");
    if (name) cookies[name.trim()] = rest.join("=").trim();
  });
  return cookies;
}

// Validate the session token from the request cookies
// Returns the session row if valid, null otherwise
async function checkSession(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies.rv_session;

  if (!token) return null;

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql(
      `SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

// Returns a 401 response object for unauthorized requests
function unauthorizedResponse(headers) {
  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({ error: "Unauthorized" }),
  };
}

module.exports = { checkSession, unauthorizedResponse, parseCookies };
