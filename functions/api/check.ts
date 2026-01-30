
interface Env {
    DB: D1Database;
}

export async function onRequestGet(context: EventContext<Env, unknown, unknown>) {
    const url = new URL(context.request.url);
    const video_url = url.searchParams.get('url');
    const model_size = url.searchParams.get('model') || 'medium';

    if (!video_url) {
        return Response.json({ error: 'Missing url param' });
    }

    // 1. Extract ID Logic (Same as submit.ts)
    const extractVideoId = (u: string): string | null => {
        try {
            const urlObj = new URL(u);
            const hostname = urlObj.hostname.replace('www.', '');

            if (hostname === 'youtu.be') return urlObj.pathname.slice(1).split(/[?#]/)[0];
            if (urlObj.pathname.startsWith('/shorts/')) return urlObj.pathname.split('/')[2] || null;
            if (urlObj.pathname === '/watch') return urlObj.searchParams.get('v');
            return null;
        } catch (e) { return null; }
    };

    const videoId = extractVideoId(video_url);

    // 2. DB Check
    let dbResult: any = null;
    let query = '';

    if (videoId) {
        const searchPattern = '%' + videoId + '%';
        query = `SELECT id, video_url, status FROM jobs WHERE video_url LIKE '${searchPattern}' AND model_size = '${model_size}'`; // Debug string

        try {
            const stmt = context.env.DB.prepare(
                `SELECT * FROM jobs WHERE video_url LIKE ? AND model_size = ? ORDER BY created_at DESC LIMIT 5`
            );
            const results = await stmt.bind(searchPattern, model_size).all();
            dbResult = results.results;
        } catch (e: any) {
            dbResult = 'Error: ' + e.message;
        }
    }

    return Response.json({
        debug_info: {
            input_url: video_url,
            extracted_id: videoId,
            db_matches: dbResult
        }
    });
}
