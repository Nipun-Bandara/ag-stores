# Authentication design

## Credentials

Only customer accounts can be created through the public registration endpoint.
The service fixes every self-registered user's role to `CUSTOMER`; it does not
accept a role from the request. Owners/administrators may create delivery
personnel within their existing shop-management permissions. Administrator and
shop-owner development fixtures are provisioned by the explicitly enabled seed;
there is no public staff-role registration.

Every account requires first name, last name and a unique Sri Lankan mobile.
Local and international mobile formats normalize to canonical `+94` text before
lookup or persistence. Login uses mobile and password only. Email is optional,
normalizes to lowercase/null, and retains the database's case-insensitive unique
index. Names are not unique. The immutable UUID remains the primary key and all
relationships continue to reference it. See [mobile accounts](mobile-accounts.md)
for safe migration/backfill, development credentials and manual checks.

Passwords must be 8–128 characters and contain uppercase, lowercase, and numeric
characters. Symbols are optional. They are hashed with scrypt using a random 128-bit salt,
a 64-byte derived key, and explicit cost parameters. Password hashes are only
selected by the login repository and are mapped out before any service result is
returned.

## Sessions

Sessions are opaque and database-backed. The browser receives a random 256-bit
token. Only its SHA-256 digest is stored in PostgreSQL, so a database read does
not reveal usable bearer tokens. Sessions expire after seven days and are
revoked on logout.

The cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, high priority, and
marked `Secure` in production. Login failures use the same message and perform a
scrypt verification whether or not the account exists, reducing account and
timing disclosure. Login and registration are rate-limited by hashed identifier
and client-address buckets; successful authentication clears the buckets.

## Authorization boundaries

Proxy performs only a fast missing-cookie redirect for the protected customer,
shop-owner, delivery, and administration route prefixes. Every protected page
independently resolves the token against PostgreSQL, checks expiry and active
user status, and requires its exact role. Proxy is therefore an early user
experience optimization, not the security boundary.

Page authorization is centralized in `requireAuth`, `requireRole`, and
`requireAnyRole`. API authorization uses the corresponding request helpers and
returns `401` for a missing or invalid session and `403` for an authenticated
user with the wrong role. Pages redirect anonymous users to login with a safe
relative return path and redirect authenticated users with the wrong role to
the forbidden page.

The role dashboards and their matching APIs use the same policy:

- `CUSTOMER`: `/account/*`, `/orders/*`, `/cart/*`, and `/checkout/*`
- `SHOP_OWNER`: `/owner/*`
- `DELIVERY_PERSON`: `/delivery/*`
- `ADMIN`: `/admin/*`

Roles are intentionally exact. In particular, administrators do not implicitly
inherit another role's permissions; broader access must be granted explicitly
with `requireAnyRole` at the relevant boundary.

Authenticated-user queries use an explicit safe-field projection. They never
return `passwordHash` or the stored session digest.

## Shared profile management

Profile APIs derive the user UUID only from the authenticated session and reject
unknown/protected fields. All roles share `/profile` and may edit first/last
names, mobile, optional email and language. The existing customer profile route
uses the same components. Mobile changes require the current password and save
atomically; UUID relationships and sessions remain intact. Role, status and shop
assignment cannot be changed through self-profile. No phone verification is
performed or implied.

Password changes require the existing password, apply the same strength rules
as registration, and revoke every other session in the same database
transaction. The current session remains active so a successful password change
does not interrupt the initiating user.

## Operational follow-ups

Multi-instance production deployments must back authentication rate limits with
a shared edge, Redis, or database store. They should also provide TLS
termination, security event monitoring, password reset and email or phone
verification, session-management UI, and periodic deletion of expired
sessions. Multi-factor authentication is recommended for privileged roles.
