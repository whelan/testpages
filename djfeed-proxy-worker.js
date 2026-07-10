// Cloudflare Worker: CORS proxy for djfeed.net song requests.
//
// Why this exists: djfeed.net sits behind Cloudflare bot protection and sends
// no CORS headers, so the browser page at whelan.github.io can neither call it
// directly (CORS) nor via public proxies (their shared IPs are Cloudflare-blocked).
// This Worker runs on your own Cloudflare account, forwards the POST with
// browser-like headers, and adds the CORS headers the browser needs.
//
// Deploy (free):
//   1. https://dash.cloudflare.com  ->  Workers & Pages  ->  Create  ->  Worker
//   2. Replace the template with this file's contents, Deploy.
//   3. Copy the *.workers.dev URL it gives you.
//   4. Put that URL in index.html as WORKER_URL (see that file).

const TARGET = 'https://www.djfeed.net/gjrock/requests/';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return new Response('Only POST is supported', {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    const body = await request.text();

    const upstream = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en,en-US;q=0.9,da;q=0.8',
        'Origin': 'https://www.djfeed.net',
        'Referer': 'https://www.djfeed.net/gjrock/requests/',
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':
          upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
      },
    });
  },
};
