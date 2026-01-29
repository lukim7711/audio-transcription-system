// Cloudflare Pages Function: Get job history with pagination

interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  try {
    // Parse query parameters
    const url = new URL(context.request.url);
    const limitParam = url.searchParams.get('limit') || '20';
    const offsetParam = url.searchParams.get('offset') || '0';

    let limit = parseInt(limitParam, 10);
    let offset = parseInt(offsetParam, 10);

    // Validate and clamp parameters
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100; // Max 100 items per request
    if (isNaN(offset) || offset < 0) offset = 0;

    // Get total count
    const countResult = await context.env.DB.prepare('SELECT COUNT(*) as count FROM jobs')
      .first();
    const total = (countResult?.count as number) || 0;

    // Get jobs with pagination
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM jobs ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
      .bind(limit, offset)
      .all();

    // Parse error_details for failed jobs
    const jobs = results.map((job: any) => {
      if (job.error_details) {
        try {
          job.error_details = JSON.parse(job.error_details);
        } catch {
          // Keep as string if parsing fails
        }
      }
      return job;
    });

    return Response.json(
      {
        success: true,
        data: {
          jobs,
          total,
          limit,
          offset,
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database error:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch job history',
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
      { status: 500 }
    );
  }
}