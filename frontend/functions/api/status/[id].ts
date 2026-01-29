// Cloudflare Pages Function: Get job status by ID

interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  try {
    // Get job ID from URL parameter
    const { id } = context.params as { id: string };

    if (!id) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Job ID is required',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 400 }
      );
    }

    // Query database
    const result = await context.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    )
      .bind(id)
      .first();

    if (!result) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VIDEO_NOT_FOUND',
            message: 'Job not found',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 404 }
      );
    }

    // Parse error_details if it exists
    let job = { ...result };
    if (job.error_details) {
      try {
        job.error_details = JSON.parse(job.error_details as string);
      } catch {
        // If parsing fails, keep as string
      }
    }

    // Return job data
    return Response.json(
      {
        success: true,
        data: job,
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
          message: error instanceof Error ? error.message : 'Failed to fetch job status',
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
      { status: 500 }
    );
  }
}