// Cloudflare Pages Functions Middleware
// Handles CORS for all API endpoints

interface Env {
  ALLOWED_ORIGIN?: string;
}

export async function onRequest(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  
  const allowedOrigin = env.ALLOWED_ORIGIN || 'http://localhost:5173';
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Signature',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }
  
  // Process the request
  const response = await context.next();
  
  // Add CORS headers to response
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
  newHeaders.set('Access-Control-Allow-Credentials', 'true');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}