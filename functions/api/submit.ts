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

    // Store raw URL for cache checking against legacy non-normalized data
    const raw_video_url = video_url;

    // Helper to normalize YouTube URL to canonical format
    // Converts youtu.be/ID -> youtube.com/watch?v=ID
    // Removes query parameters like &feature=share
    const normalizeYouTubeUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        let videoId = '';

        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
          const params = new URLSearchParams(urlObj.search);
          if (urlObj.pathname.includes('/shorts/')) {
            videoId = urlObj.pathname.split('/shorts/')[1];
          } else {
            videoId = params.get('v') || '';
          }
        }

        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
        return url; // Fallback if extraction fails
      } catch (e) {
        return url;
      }
    };

    // Normalize URL before processing
    if (video_url && typeof video_url === 'string') {
      video_url = normalizeYouTubeUrl(video_url);
    }

    // Validate video_url
    if (!video_url || typeof video_url !== 'string') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'video_url is required',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 400 }
      );
    }

    if (!validateYouTubeUrl(video_url)) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Must be a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 400 }
      );
    }

    // Validate model_size
    const validSizes = ['tiny', 'base', 'small', 'medium', 'large-v3'];
    if (!validSizes.includes(model_size)) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: `Invalid model_size. Must be one of: ${validSizes.join(', ')}`,
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 400 }
      );
    }

    // Check for existing job (Smart Caching)
    try {
      // Strategy: Check exact match AND canonical match AND short link match AND RAW INPUT
      // This handles legacy data that might be stored in different formats
      const candidates = [
        video_url, // Canonical
        raw_video_url, // Legacy/Raw input
      ];

      // Extract ID again just to be sure we have variants
      const urlObj = new URL(video_url);
      const videoId = urlObj.searchParams.get('v');

      if (videoId) {
        candidates.push(`https://www.youtube.com/watch?v=${videoId}`);
        candidates.push(`https://youtube.com/watch?v=${videoId}`);
        candidates.push(`https://youtu.be/${videoId}`);
      }

      // Create placeholders for SQL IN (? , ? , ?)
      const placeholders = candidates.map(() => '?').join(',');

      console.log(`[Cache Check] Looking for candidates:`, candidates);

      const query = `
        SELECT * FROM jobs 
        WHERE video_url IN (${placeholders}) 
        AND model_size = ? 
        AND status != 'failed' 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      // Bind params: candidates array + model_size
      const existingJob: any = await context.env.DB.prepare(query)
        .bind(...candidates, model_size)
        .first();

      if (existingJob) {
        console.log(`[Cache HIT] Found job ${existingJob.id} for ${video_url}`);
        return Response.json(
          {
            success: true,
            data: {
              job_id: existingJob.id,
              status: existingJob.status,
              created_at: existingJob.created_at,
            },
            message: 'Job recovered from cache',
            timestamp: Math.floor(Date.now() / 1000),
          },
          { status: 200 }
        );
      } else {
        console.log(`[Cache MISS] No matching job found for ${video_url}`);
      }
    } catch (e) {
      console.error('[Cache Check ERROR]:', e);
      // Ignore cache error and proceed to create new job
    }

    // Generate job ID
    const job_id = generateUUID();
    const created_at = Math.floor(Date.now() / 1000);

    // Insert into database
    try {
      await context.env.DB.prepare(
        'INSERT INTO jobs (id, video_url, model_size, language, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(job_id, video_url, model_size, language, 'pending', created_at, created_at)
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