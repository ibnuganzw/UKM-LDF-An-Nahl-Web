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
let io: IntersectionObserver | null = null;
let mo: MutationObserver | null = null;
const observed = new Set<Element>();

function hasRv(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return node.classList.contains('rv') || !!node.querySelector('.rv');
}

/** Start watching for `.rv` content and hide it until it scrolls into view. */
function enable() {
  if (io) return; // already enabled

  document.documentElement.classList.add('rvReady');

  // Elements currently registered with `io`, so a removed-but-not-yet-
  // intersected node (e.g. a below-the-fold .rv section on a page the user
  // navigated away from before scrolling to it) can be unobserved instead of
  // leaking a reference to now-detached DOM for the rest of the tab's life.
  const activeIo = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('rvIn');
          activeIo.unobserve(entry.target);
          observed.delete(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  io = activeIo;

  const scan = () => {
    document.querySelectorAll('.rv:not(.rvIn)').forEach((el) => {
      if (observed.has(el)) return;
      observed.add(el);
      activeIo.observe(el);
    });
  };

  // Pages mount and swap via the router; re-scan on DOM changes. Mutation
  // records are inspected rather than treated as a generic "something
  // changed" ping: a route with no .rv content (the article editor, where
  // every keystroke mutates the Tiptap DOM) should never pay for a
  // full-document querySelectorAll it can't possibly need.
  let scheduled = false;
  const activeMo = new MutationObserver((mutations) => {
    let sawAddition = false;

    for (const { addedNodes, removedNodes } of mutations) {
      for (const node of removedNodes) {
        if (!(node instanceof Element) || !hasRv(node)) continue;
        if (observed.has(node)) {
          activeIo.unobserve(node);
          observed.delete(node);
        }
        node.querySelectorAll('.rv').forEach((el) => {
          if (observed.has(el)) {
            activeIo.unobserve(el);
            observed.delete(el);
          }
        });
      }
      if (!sawAddition) {
        for (const node of addedNodes) {
          if (hasRv(node)) {
            sawAddition = true;
            break;
          }
        }
      }
    }

    if (!sawAddition) return; // nothing new for scan() to find, regardless of any removal cleanup above
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  });
  mo = activeMo;
  activeMo.observe(document.body, { childList: true, subtree: true });

  scan();
}

/** Stop watching and make every `.rv` element visible immediately — removing
 *  `rvReady` is enough on its own (see globals.css: without it nothing is
 *  ever hidden), the observers are torn down just to stop doing work. */
function disable() {
  io?.disconnect();
  mo?.disconnect();
  io = null;
  mo = null;
  observed.clear();
  document.documentElement.classList.remove('rvReady');
}

export function initReveal() {
  if (started || typeof IntersectionObserver === 'undefined') return;
  started = true;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!mq.matches) enable();

  // A one-time check at startup missed a user toggling the OS setting mid-
  // session — reduced motion turned on later would never actually stop new
  // .rv sections from animating in on scroll, and turned off later would
  // leave reveal permanently disabled for the rest of the tab's life.
  mq.addEventListener('change', (e) => {
    if (e.matches) disable();
    else enable();
  });
}
