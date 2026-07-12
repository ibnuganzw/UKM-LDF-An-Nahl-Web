/**
 * One-shot scroll reveal for elements marked with the global `.rv` class.
 *
 * Unlike the previous `animation-timeline: view()` approach (scrubbed — the
 * animation progressed with scroll position, so content crawled in), this
 * triggers a plain CSS transition exactly once when the element enters the
 * viewport. See globals.css for the `.rv` / `.rvIn` / `.rvStagger` styles.
 *
 * Content is only hidden after `html.rvReady` is set here, so if JS never
 * runs (or the user prefers reduced motion) everything stays visible.
 */
let started = false;

export function initReveal() {
  if (started || typeof IntersectionObserver === 'undefined') return;
  started = true;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('rvReady');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('rvIn');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );

  const scan = () => {
    document.querySelectorAll('.rv:not(.rvIn)').forEach((el) => io.observe(el));
  };

  // Pages mount and swap via the router; re-scan on DOM changes.
  let scheduled = false;
  const mo = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });

  scan();
}
