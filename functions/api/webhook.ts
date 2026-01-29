// Cloudflare Pages Function: Webhook receiver for job completion

interface Env {
  DB: D1Database;
  WEBHOOK_SECRET: string;
}

// ✅ FIX: Web Crypto API untuk Cloudflare Workers
async function verifyHmacSignature(
  secret: string,
  data: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const dataBuffer = encoder.encode(data);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBuffer);
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === signature;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  try {
    // Get signature from header
    const signature = context.request.headers.get('X-Webhook-Signature');

    if (!signature) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'WEBHOOK_INVALID',
            message: 'Missing webhook signature',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 401 }
      );
    }

    // Clone request to read body multiple times
    const bodyText = await context.request.text();

    // Verify HMAC signature
    const isValid = await verifyHmacSignature(
      context.env.WEBHOOK_SECRET,
      bodyText,
      signature
    );

    if (!isValid) {
      console.error('Invalid webhook signature received');
      return Response.json(
        {
          success: false,
          error: {
            code: 'WEBHOOK_INVALID',
            message: 'Invalid webhook signature',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 401 }
      );
    }

    // Parse payload
    const payload = JSON.parse(bodyText);
    const { job_id, status } = payload;

    if (!job_id || !status) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Missing required fields: job_id, status',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const existingJob = await context.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    )
      .bind(job_id)
      .first();

    if (!existingJob) {
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

    // Update job based on status
    if (status === 'completed') {
      await context.env.DB.prepare(
        `UPDATE jobs SET
          status = ?,
          transcript_url = ?,
          audio_url = ?,
          srt_url = ?,
          txt_url = ?,
          video_title = ?,
          video_duration = ?,
          processing_time = ?,
          updated_at = unixepoch()
        WHERE id = ?`
      )
        .bind(
          'completed',
          payload.transcript_url,
          payload.audio_url,
          payload.srt_url,
          payload.txt_url,
          payload.video_title,
          payload.video_duration,
          payload.processing_time,
          job_id
        )
        .run();
    } else if (status === 'failed') {
      const error_details = payload.error_details
        ? JSON.stringify(payload.error_details)
        : null;

      await context.env.DB.prepare(
        `UPDATE jobs SET
          status = ?,
          error_code = ?,
          error_message = ?,
          error_details = ?,
          updated_at = unixepoch()
        WHERE id = ?`
      )
        .bind(
          'failed',
          payload.error_code,
          payload.error_message,
          error_details,
          job_id
        )
        .run();
    } else {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid status. Must be "completed" or "failed"',
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Job updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
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