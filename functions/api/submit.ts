// Cloudflare Pages Function: Submit transcription job

interface Env {
  DB: D1Database;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  WEBHOOK_URL: string;
}

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Validate YouTube URL
function validateYouTubeUrl(url: string): boolean {
  // ✅ FIX: Regex yang sama dengan frontend
  const pattern = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
  return pattern.test(url);
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  try {
    // Parse request body
    const body = await context.request.json();
    let { video_url, model_size = 'medium', language = 'auto' } = body;

    // --------------------------------------------------------------------------
    // LOGIC STEP 1: Input Analysis & Normalization
    // --------------------------------------------------------------------------

    // Extract 11-char Video ID (The "DNA")
    // This supports: youtu.be, youtube.com/watch, shorts, embed, etc.
    const extractVideoId = (url: string): string | null => {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return match ? match[1] : null;
    };

    const videoId = extractVideoId(video_url);
    let normalizedUrl = video_url; // Default to raw if ID extraction fails

    if (videoId) {
      // Force Canonical Format for consistent storage
      normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`[Submit] Video ID: ${videoId} -> Normalized: ${normalizedUrl}`);
    } else {
      console.warn(`[Submit] Could not extract Video ID from: ${video_url}`);
    }

    // --------------------------------------------------------------------------
    // LOGIC STEP 2: Database Lookup (The "Check")
    // --------------------------------------------------------------------------

    if (videoId) {
      console.log(`[Cache Check] Checking for existing jobs with ID: ${videoId}`);

      try {
        // Aggressive Search: Find ANY job containing this ID
        // This works regardless of how the URL is stored (shorts, raw, etc.)
        const searchPattern = `%${videoId}%`;

        const existingJob: any = await context.env.DB.prepare(
          `SELECT * FROM jobs WHERE video_url LIKE ? AND model_size = ? AND status != 'failed' ORDER BY created_at DESC LIMIT 1`
        )
          .bind(searchPattern, model_size)
          .first();

        // Scenario A: Job FOUND
        if (existingJob) {
          console.log(`[Cache HIT] Found existing job ${existingJob.id} (Status: ${existingJob.status})`);
          return Response.json(
            {
              success: true,
              data: {
                job_id: existingJob.id,
                status: existingJob.status,
                created_at: existingJob.created_at,
              },
              message: 'Job recovered from cache (Duplicate Detected)',
              timestamp: Math.floor(Date.now() / 1000),
            },
            { status: 200 }
          );
        }

        console.log(`[Cache MISS] No active job found for ID ${videoId}. Proceeding to create new job.`);

      } catch (e) {
        console.error('[Cache Check ERROR]', e);
        // On error, we proceed (fail-open) but log it
      }
    }

    // --------------------------------------------------------------------------
    // LOGIC STEP 3: Create New Job (Insert)
    // --------------------------------------------------------------------------

    // Generate job ID
    const job_id = generateUUID();
    const created_at = Math.floor(Date.now() / 1000);

    // Insert into database using NORMALIZED URL (Sanitized)
    try {
      await context.env.DB.prepare(
        'INSERT INTO jobs (id, video_url, model_size, language, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(job_id, normalizedUrl, model_size, language, 'pending', created_at, created_at)
        .run();
    } catch (dbError) {
      console.error('Database error:', dbError);
      return Response.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create job in database',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 500 }
      );
    }

    // Trigger GitHub Actions workflow
    const webhookUrl = `${context.env.WEBHOOK_URL}/api/webhook`;

    try {
      const githubResponse = await fetch(
        `https://api.github.com/repos/${context.env.GITHUB_REPO}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${context.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'AudioTranscriptionSystem/1.0',
          },
          body: JSON.stringify({
            event_type: 'transcription_job',
            client_payload: {
              job_id,
              video_url,
              model_size,
              language,
              webhook_url: webhookUrl,
            },
          }),
        }
      );

      if (!githubResponse.ok) {
        const errorText = await githubResponse.text();
        console.error('GitHub API error:', errorText);

        // In development, we want to know if GitHub trigger failed
        if (context.env.GITHUB_TOKEN === 'ghp_your_token' || context.env.GITHUB_TOKEN.includes('(hidden)')) {
          throw new Error(`GitHub Configuration Error: ${errorText}. Please check .dev.vars`);
        }
      }
    } catch (githubError) {
      console.error('Failed to trigger GitHub Actions:', githubError);
      // Don't fail the request, job is already in database
    }

    // Return success response
    return Response.json(
      {
        success: true,
        data: {
          job_id,
          status: 'pending',
          created_at,
        },
        timestamp: created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
      { status: 500 }
    );
  }
}