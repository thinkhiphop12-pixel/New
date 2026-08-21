/* content.mjs — headings, images and body depth.

   The heading rules are the ones that move rankings: exactly one H1 stating
   the topic, and no skipped levels, so the outline a crawler builds matches
   the one a reader sees.
*/

export const id = 'content';
export const describe = 'Heading outline, image accessibility and content depth';

export function run(site) {
  const { config } = site;
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  for (const page of site.audited) {
    const { file } = page;

    /* ── headings ── */
    const h1s = page.headings.filter((h) => h.level === 1);
    if (h1s.length === 0) {
      push(file, 'h1-missing', 'error', 'No H1');
    } else if (h1s.length > 1) {
      push(file, 'h1-multiple', 'warn',
        `${h1s.length} H1s — a page should state one topic`,
        { hint: h1s.map((h) => `"${h.text}"`).join(', ') });
    }

    let previous = 0;
    for (const h of page.headings) {
      if (previous && h.level > previous + 1) {
        push(file, 'heading-skip', 'warn',
          `Heading jumps from H${previous} to H${h.level} at "${h.text.slice(0, 60)}"`);
      }
      if (!h.text) push(file, 'heading-empty', 'warn', `Empty H${h.level}`);
      previous = h.level;
    }

    // An H1 that does not share any substantial word with the title usually
    // means the two were edited apart.
    if (h1s.length === 1 && page.title) {
      const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) || []);
      const titleWords = words(page.title.replace('| BALLKNW', ''));
      const overlap = [...words(h1s[0].text)].filter((w) => titleWords.has(w));
      if (titleWords.size && overlap.length === 0) {
        push(file, 'h1-title-drift', 'info',
          'H1 and <title> share no keywords — check they still describe the same page');
      }
    }

    /* ── images ── */
    for (const img of page.images) {
      const where = img.src ? img.src.split('/').pop() : '(no src)';
      if (!img.src) {
        push(file, 'img-src', 'error', 'An <img> has no src');
        continue;
      }
      if (!img.hasAlt) {
        push(file, 'img-alt', 'error', `<img src="${where}"> has no alt attribute`);
      } else if (!img.alt.trim() && !/^(icon|spacer|decoration)/i.test(where)) {
        // alt="" is correct for decorative images, so this is only a note.
        push(file, 'img-alt-empty', 'info', `<img src="${where}"> has alt="" — decorative?`);
      }
      if (!img.width || !img.height) {
        push(file, 'img-dimensions', 'warn',
          `<img src="${where}"> has no width/height — causes layout shift, which Core Web Vitals penalises`);
      }
    }

    /* ── depth ── */
    if (page.words < config.content.minWords) {
      push(file, 'thin-content', 'warn',
        `Only ${page.words} words — thin for a page competing on a keyword`);
    }
  }

  return out;
}
