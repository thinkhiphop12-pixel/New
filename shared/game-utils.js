/* Ball Knw — tiny shared helpers (zero deps, <1kb) */
window.BK = {
  share(text, btn){
    const done = () => {
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    };
    if (navigator.share) {
      navigator.share({ text }).then(done).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(text).then(done).catch(() => alert(text));
  },
  tap(el){
    el?.classList.remove('anim-pop');
    void el?.offsetWidth;
    el?.classList.add('anim-pop');
  },
  prefetch(url){
    if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = url;
    document.head.appendChild(l);
  }
};