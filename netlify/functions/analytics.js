const { neon } = require("@neondatabase/serverless");
const { checkSession, unauthorizedResponse } = require("./lib/auth-check");

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

  // Auth required for analytics
  const session = await checkSession(event);
  if (!session) return unauthorizedResponse(headers);

  const sql = neon(process.env.DATABASE_URL);
  const params = event.queryStringParameters || {};
  const type = params.type;

  try {
    // Status breakdown
    if (type === "status_breakdown") {
      const rows = await sql(
        `SELECT status, COUNT(*)::int as count FROM projects GROUP BY status ORDER BY status`
      );
      return { statusCode: 200, headers, body: JSON.stringify({ data: rows }) };
    }

    // Revenue by month (last 12 months)
    if (type === "revenue_by_month") {
      const rows = await sql(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          COALESCE(SUM(price), 0)::float as revenue
        FROM projects
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
      return { statusCode: 200, headers, body: JSON.stringify({ data: rows }) };
    }

    // Project trend (count by month, last 12 months)
    if (type === "project_trend") {
      const rows = await sql(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM projects
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);
      return { statusCode: 200, headers, body: JSON.stringify({ data: rows }) };
    }

    // Roof types breakdown
    if (type === "roof_types") {
      const rows = await sql(
        `SELECT roof_type, COUNT(*)::int as count FROM projects GROUP BY roof_type ORDER BY count DESC`
      );
      return { statusCode: 200, headers, body: JSON.stringify({ data: rows }) };
    }

    // Summary stats
    if (type === "summary") {
      const rows = await sql(`
        SELECT
          COUNT(*)::int as total_projects,
          COALESCE(SUM(price), 0)::float as total_revenue,
          COALESCE(AVG(price), 0)::float as avg_price,
          COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END)::int as completed_count,
          ROUND(
            COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END)::numeric /
            GREATEST(COUNT(*)::numeric, 1) * 100
          )::int as completion_rate
        FROM projects
      `);
      return { statusCode: 200, headers, body: JSON.stringify({ data: rows[0] }) };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid type. Use: status_breakdown, revenue_by_month, project_trend, roof_types, summary" }),
    };
  } catch (error) {
    console.error("Analytics error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
