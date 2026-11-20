/**
 * Sets coherent HTTP cache headers that vary by authentication state (Cookie).
 * - Anonymous public reads: cacheable by browser/CDN with stale-while-revalidate.
 * - Authenticated or private reads: strictly private, never stored in shared caches.
 */
export function setCacheHeaders(res, { isPublic = true, isAuthenticated = false, maxAge = 60 } = {}) {
  res.setHeader("Vary", "Cookie");
  if (isPublic && !isAuthenticated) {
    res.setHeader(
      "Cache-Control",
      `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 5}`,
    );
  } else {
    res.setHeader("Cache-Control", "private, no-store");
  }
}
