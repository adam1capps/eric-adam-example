const { neon } = require("@neondatabase/serverless");
const { checkSession, unauthorizedResponse } = require("./lib/auth-check");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Auth check for write operations
    if (["POST", "PUT", "DELETE"].includes(event.httpMethod)) {
      const session = await checkSession(event);
      if (!session) return unauthorizedResponse(headers);
    }

    // GET - List projects or get single project with files
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};

      // Single project by ID — includes files
      if (params.id) {
        const projectRows = await sql(
          `SELECT p.*, p.client_token FROM projects p WHERE p.id = $1`,
          [params.id]
        );

        if (projectRows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Project not found" }),
          };
        }

        const files = await sql(
          `SELECT id, filename, mime_type, file_size, uploaded_at FROM project_files WHERE project_id = $1 ORDER BY uploaded_at DESC`,
          [params.id]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ project: projectRows[0], files }),
        };
      }

      // List all projects
      let query = `
        SELECT
          p.id,
          p.project_name,
          p.client_name,
          p.client_email,
          p.roof_type,
          p.membrane,
          p.square_footage,
          p.scale_ratio,
          p.status,
          p.price,
          p.notes,
          p.client_token,
          p.created_at,
          p.updated_at
        FROM projects p
      `;

      const conditions = [];
      const values = [];

      if (params.status) {
        conditions.push(`p.status = $${values.length + 1}`);
        values.push(params.status);
      }

      if (params.search) {
        conditions.push(
          `(p.project_name ILIKE $${values.length + 1} OR p.client_name ILIKE $${values.length + 1})`
        );
        values.push(`%${params.search}%`);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY p.created_at DESC";

      const rows = await sql(query, values);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ projects: rows }),
      };
    }

    // POST - Create a new project
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);

      // Trim string fields
      for (const key of ['project_name', 'client_name', 'client_email', 'roof_type', 'membrane', 'scale_ratio', 'notes']) {
        if (typeof data[key] === 'string') data[key] = data[key].trim();
      }

      const required = [
        "project_name",
        "client_name",
        "client_email",
        "roof_type",
        "membrane",
        "square_footage",
        "scale_ratio",
      ];
      for (const field of required) {
        if (!data[field]) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Missing required field: ${field}` }),
          };
        }
      }

      // Validate email format
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(data.client_email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid email address" }),
        };
      }

      // Validate numeric fields
      if (isNaN(parseFloat(data.square_footage)) || parseFloat(data.square_footage) <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Square footage must be a positive number" }),
        };
      }

      if (data.price && (isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Price must be a non-negative number" }),
        };
      }

      // Validate string lengths
      if (data.project_name.length > 255) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Project name too long (max 255 chars)" }) };
      }
      if (data.notes && data.notes.length > 5000) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Notes too long (max 5000 chars)" }) };
      }

      const rows = await sql(
        `INSERT INTO projects
          (project_name, client_name, client_email, roof_type, membrane, square_footage, scale_ratio, status, price, notes, client_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, gen_random_uuid())
         RETURNING *`,
        [
          data.project_name,
          data.client_name,
          data.client_email,
          data.roof_type,
          data.membrane,
          parseFloat(data.square_footage),
          data.scale_ratio,
          data.status || "inquiry",
          data.price ? parseFloat(data.price) : null,
          data.notes || null,
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ project: rows[0] }),
      };
    }

    // PUT - Update a project
    if (event.httpMethod === "PUT") {
      const data = JSON.parse(event.body);

      if (!data.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing project id" }),
        };
      }

      const rows = await sql(
        `UPDATE projects SET
          project_name = COALESCE($2, project_name),
          client_name = COALESCE($3, client_name),
          client_email = COALESCE($4, client_email),
          roof_type = COALESCE($5, roof_type),
          membrane = COALESCE($6, membrane),
          square_footage = COALESCE($7, square_footage),
          scale_ratio = COALESCE($8, scale_ratio),
          status = COALESCE($9, status),
          price = COALESCE($10, price),
          notes = COALESCE($11, notes),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [
          data.id,
          data.project_name || null,
          data.client_name || null,
          data.client_email || null,
          data.roof_type || null,
          data.membrane || null,
          data.square_footage ? parseFloat(data.square_footage) : null,
          data.scale_ratio || null,
          data.status || null,
          data.price ? parseFloat(data.price) : null,
          data.notes || null,
        ]
      );

      if (rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Project not found" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ project: rows[0] }),
      };
    }

    // DELETE
    if (event.httpMethod === "DELETE") {
      const params = event.queryStringParameters || {};
      if (!params.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing project id" }),
        };
      }

      await sql(`DELETE FROM projects WHERE id = $1`, [params.id]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Project deleted" }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Database error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};
