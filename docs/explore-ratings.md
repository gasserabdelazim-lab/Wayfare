# Explore ratings

Set `SERPAPI_API_KEY` as a server-only Production environment secret in Vercel.
Never prefix it with NEXT_PUBLIC or commit its value. Redeploy after configuration.

Explore uses one Google Maps search through SerpApi per destination/category cache
miss. The whole result list is cached in Next's shared Data Cache for seven days.
Equivalent canonical city labels and rounded city coordinates share the entry.
This is separate from the browser cache and the one-hour response CDN cache.
Concurrent calls are coalesced within a server instance; simultaneous cold misses
across different regions can still use additional requests. This is not a global lock.

Before an uncached provider search, the free Account API must confirm a zero-price
Free plan and remaining monthly searches. Missing key, exhausted quota, paid plan,
or upstream failure falls back to the existing unrated OSM results. When SerpApi is
configured, fallback never calls the billable Google Places provider.

No paid plan, auto-renewal, payment method, photo-detail or review-text calls are
configured by this integration. Keep the provider account on its Free plan.
The account's limit applies across all apps using that account. The public Explore
endpoint can consume quota on cache misses; this is not abuse-proof rate limiting.

The cache contains public place listings only, never trip titles, members, account
responses or API credentials. Ratings link to the exact Google place and carry
source attribution. Review counts are omitted when unavailable, not invented.
SerpApi is a third-party provider, not Google's official API; review data-reuse
and caching terms before public/commercial release.

Run `node --test tests/explore-ratings.test.mjs` for provider and safety tests.
