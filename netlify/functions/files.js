const { neon } = require("@neondatabase/serverless");
const { getStore } = require("@netlify/blobs");
const { checkSession, unauthorizedResponse } = require("./lib/auth-check");

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
    const params = event.queryStringParameters || {};

    // GET — serve a file or list files for a project
    if (event.httpMethod === "GET") {
      // Serve individual file binary
      if (params.file_id) {
        const rows = await sql(
          `SELECT * FROM project_files WHERE id = $1`,
          [params.file_id]
        );

        if (rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "File not found" }) };
        }

        const file = rows[0];
        const store = getStore("project-files");
        const blob = await store.get(file.blob_key, { type: "arrayBuffer" });

        if (!blob) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "File data not found" }) };
        }

        return {
          statusCode: 200,
          headers: {
            "Content-Type": file.mime_type,
            "Content-Disposition": `inline; filename="${file.filename}"`,
            "Cache-Control": "public, max-age=86400",
          },
          body: Buffer.from(blob).toString("base64"),
          isBase64Encoded: true,
        };
      }

      // List files for a project
      if (params.project_id) {
        const files = await sql(
          `SELECT id, filename, mime_type, file_size, uploaded_at FROM project_files WHERE project_id = $1 ORDER BY uploaded_at DESC`,
          [params.project_id]
        );
        return { statusCode: 200, headers, body: JSON.stringify({ files }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Provide file_id or project_id" }) };
    }

    // POST — upload a file (auth required)
    if (event.httpMethod === "POST") {
      const session = await checkSession(event);
      if (!session) return unauthorizedResponse(headers);

      const data = JSON.parse(event.body);
      const { project_id, filename, mime_type, file_data } = data;

      if (!project_id || !filename || !mime_type || !file_data) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing required fields: project_id, filename, mime_type, file_data" }),
        };
      }

      // Decode base64 to buffer
      const buffer = Buffer.from(file_data, "base64");
      const fileSize = buffer.length;

      // 4MB limit
      if (fileSize > 4 * 1024 * 1024) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "File too large. Maximum size is 4MB." }),
        };
      }

      // Store in Netlify Blobs
      const blobKey = `project_${project_id}/${Date.now()}_${filename}`;
      const store = getStore("project-files");
      await store.set(blobKey, buffer);

      // Save metadata to DB
      const rows = await sql(
        `INSERT INTO project_files (project_id, filename, mime_type, file_size, blob_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, filename, mime_type, file_size, uploaded_at`,
        [project_id, filename, mime_type, fileSize, blobKey]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ file: rows[0] }),
      };
    }

    // DELETE — remove a file (auth required)
    if (event.httpMethod === "DELETE") {
      const session = await checkSession(event);
      if (!session) return unauthorizedResponse(headers);

      if (!params.file_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing file_id" }) };
      }

      const rows = await sql(`SELECT * FROM project_files WHERE id = $1`, [params.file_id]);
      if (rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "File not found" }) };
      }

      // Delete from blob store
      const store = getStore("project-files");
      try {
        await store.delete(rows[0].blob_key);
      } catch {
        // blob may already be gone
      }

      // Delete metadata
      await sql(`DELETE FROM project_files WHERE id = $1`, [params.file_id]);

      return { statusCode: 200, headers, body: JSON.stringify({ message: "File deleted" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (error) {
    console.error("Files error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};
