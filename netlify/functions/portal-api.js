const { neon } = require("@neondatabase/serverless");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const params = event.queryStringParameters || {};
  const token = params.token;

  if (!token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing token" }) };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Look up project by client_token — only return public-safe fields
    const rows = await sql(
      `SELECT
        p.project_name,
        p.client_name,
        p.roof_type,
        p.membrane,
        p.square_footage,
        p.scale_ratio,
        p.status,
        p.created_at,
        p.updated_at
      FROM projects p
      WHERE p.client_token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Project not found. The link may be invalid or expired." }),
      };
    }

    const project = rows[0];

    // Also return any files for this project (by looking up project ID from token)
    const projectIdRows = await sql(
      `SELECT id FROM projects WHERE client_token = $1`,
      [token]
    );

    let files = [];
    if (projectIdRows.length > 0) {
      files = await sql(
        `SELECT id, filename, mime_type, file_size, uploaded_at FROM project_files WHERE project_id = $1 ORDER BY uploaded_at DESC`,
        [projectIdRows[0].id]
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ project, files }),
    };
  } catch (error) {
    console.error("Portal API error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
