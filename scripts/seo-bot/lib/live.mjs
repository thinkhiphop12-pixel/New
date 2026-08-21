/* live.mjs — optional checks against the deployed site.

   Everything else in the bot reads the repo, which is the right default: it
   runs in CI with no network and catches problems before they ship. This
   module answers the questions only production can — does the URL actually
   200, does it redirect, is it served with the headers a crawler needs — and
   is opt-in via `--live` because it needs network and takes real time.
*/

const UA = 'BALLKNW-SEO-Bot/1.0 (+https://www.ballknw.com)';

async function head(url, { timeout = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    // Some hosts answer HEAD differently from GET; GET with an early abort is
    // more faithful, but HEAD is enough for status and headers here.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'text/html' },
    });
    const body = res.status < 400 && res.headers.get('content-type')?.includes('text/html')
      ? await res.text()
      : '';
    return { status: res.status, headers: res.headers, location: res.headers.get('location'), body };
  } finally {
    clearTimeout(timer);
  }
}

/** Run live checks over the indexable pages, with a small concurrency cap. */
export async function checkLive(site, { concurrency = 6, log = () => {} } = {}) {
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  const queue = [...site.indexable];
  let done = 0;

  async function worker() {
    while (queue.length) {
      const page = queue.shift();
      try {
        const res = await head(page.url);
        done += 1;
        log(done, site.indexable.length, page.url);

        if (res.status >= 500) {
          push(page.file, 'live-5xx', 'error', `${page.url} returns ${res.status}`);
          continue;
        }
        if (res.status === 404 || res.status === 410) {
          push(page.file, 'live-404', 'error',
            `${page.url} returns ${res.status} but is in the sitemap`);
          continue;
        }
        if (res.status >= 300 && res.status < 400) {
          push(page.file, 'live-redirect', 'error',
            `${page.url} redirects to ${res.location} — a canonical URL should be served directly`);
          continue;
        }
        if (res.status !== 200) {
          push(page.file, 'live-status', 'warn', `${page.url} returns ${res.status}`);
        }

        const xRobots = res.headers.get('x-robots-tag');
        if (xRobots && /noindex/i.test(xRobots)) {
          push(page.file, 'live-x-robots', 'error',
            `${page.url} is served with X-Robots-Tag: ${xRobots} — it cannot be indexed`);
        }

        if (res.body) {
          const m = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i.exec(res.body);
          const href = m ? /href\s*=\s*["']([^"']+)["']/i.exec(m[0])?.[1] : null;
          if (href && href !== page.url) {
            push(page.file, 'live-canonical', 'error',
              `${page.url} is served with canonical ${href}`);
          }
          if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(res.body)) {
            push(page.file, 'live-noindex', 'error',
              `${page.url} is served with a noindex meta tag but is in the sitemap`);
          }
        }
      } catch (err) {
        done += 1;
        push(page.file, 'live-unreachable', 'warn', `${page.url} could not be fetched: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

/** Confirm the sitemap and robots.txt are actually reachable in production. */
export async function checkLiveInfra(site) {
  const out = [];
  for (const file of [site.config.sitemap, site.config.robots]) {
    const url = `${site.config.site}/${file}`;
    try {
      const res = await head(url);
      if (res.status !== 200) {
        out.push({ rule: 'live-infra', severity: 'error', page: file, message: `${url} returns ${res.status}` });
      }
    } catch (err) {
      out.push({ rule: 'live-infra', severity: 'warn', page: file, message: `${url} could not be fetched: ${err.message}` });
    }
  }
  return out;
}
