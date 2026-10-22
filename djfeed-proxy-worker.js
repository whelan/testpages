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
//
// The page picks the djfeed event with ?event=<path>, e.g.
//   https://djfeed-proxy.larsmhansen.workers.dev/?event=sdp-main
// Any event name made of letters, digits and dashes is forwarded, so new
// events only need adding to the dropdown in index.html.
//
// Only requests from the GitHub Pages site (ALLOWED_ORIGIN) are accepted.
// That stops other websites from using the Worker in a browser; it is not a
// secret, since non-browser clients can send any Origin header they like.

const ALLOWED_ORIGIN = 'https://whelan.github.io';
const EVENT_PATTERN = /^[A-Za-z0-9-]+$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    if (request.headers.get('Origin') !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403, headers: CORS_HEADERS });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return new Response('Only POST is supported', {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    const event = new URL(request.url).searchParams.get('event') || '';
    if (!EVENT_PATTERN.test(event)) {
      return new Response(`Invalid event: ${event}`, {
        status: 400,
        headers: CORS_HEADERS,
      });
    }
    const target = `https://www.djfeed.net/${event}/requests/`;

    const body = await request.text();

    const upstream = await fetch(target, {
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
        'Referer': target,
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
