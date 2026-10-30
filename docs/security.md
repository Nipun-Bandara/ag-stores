# Security decisions

## Trust boundaries

Authentication, roles, resource ownership, prices, stock, and order status are
all enforced on the server. UI visibility is only a convenience. Route
handlers validate input and delegate to services; repositories scope reads and
writes by the authenticated actor (customer, shop owner, or delivery person).
Missing resources and resources owned by another user normally produce the
same `404` response to reduce identifier probing.

Checkout accepts only product IDs and quantities. Client price fields are
discarded, current prices and stock are reloaded inside the transaction, and
conditional stock updates prevent negative inventory and overselling. Order
status changes go through the centralized state machine and role policy.

## Authentication and sessions

- Passwords are limited to 12–128 characters, require mixed character classes,
  and use scrypt with a random 128-bit salt and a 64-byte derived key.
- Login uses a dummy hash for unknown accounts and returns a generic credential
  error. Duplicate registration errors do not identify which field exists.
- Public registration discards fields outside its allow-list and always creates
  `CUSTOMER`; a submitted role can never reach persistence.
- Session tokens contain 256 bits of randomness. Only SHA-256 token digests are
  stored. Cookies are `HttpOnly`, `SameSite=Lax`, path-scoped, high priority,
  expire after seven days, and are `Secure` in production.
- Login and registration use bounded fixed-window rate limits by normalized
  identifier and client address. Configure the limits with
  `AUTH_RATE_LIMIT_MAX_ATTEMPTS` and
  `AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP`.

The included rate-limit store is process-local and intentionally bounded to
avoid memory exhaustion. A multi-instance deployment must put an equivalent
limit at the load balancer/API gateway or replace the store with Redis or a
database-backed limiter so counters are shared between instances. Forwarded IP
headers must only be trusted when the edge proxy overwrites them.

## Request and browser protections

Cookie-authenticated mutations enforce the browser `Origin` and
`Sec-Fetch-Site` signals. Explicit cross-site requests receive `403`. Requests
without browser metadata remain supported for same-environment server clients;
such clients still require a valid session. Authentication, logout, and locale
mutation endpoints apply the same check.

All API JSON responses use `Cache-Control: no-store`. Application responses
include clickjacking, MIME sniffing, referrer, permissions, base URI, object,
and form-action protections. Production also sends HSTS and must be served only
through HTTPS.

React's escaped text rendering is used throughout and there is no
`dangerouslySetInnerHTML` usage. Product image URLs are limited to HTTPS and
are never treated as markup. The application currently accepts URLs only; it
does not ingest or transform uploaded files.

## Data and configuration

Prisma query builders and tagged raw SQL templates parameterize data values.
Runtime application code does not use unsafe raw SQL APIs. Environment parsing
validates the PostgreSQL URL, public application origin, and rate-limit bounds.
Only explicitly public map configuration uses `NEXT_PUBLIC_*`; database,
password, and session data stay server-side.

Expected business conflicts use stable, non-sensitive errors. Unexpected
exceptions are logged server-side and return generic messages without stack
traces, queries, credentials, or environment values.

## Security regression coverage

Automated tests cover cross-customer order access, cross-rider batch access,
cross-shop owner access, role injection, unauthorized APIs, cross-origin
mutations, password behavior, cookie flags, authentication throttling, unsafe
image schemes, server-authoritative prices, status manipulation, stock
manipulation, concurrent stock reservation, and response data filtering.

Dependency scanning, secret scanning, TLS configuration, edge rate limits, and
periodic penetration testing remain deployment responsibilities.
