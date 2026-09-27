# Authentication design

## Credentials

Only customer accounts can be created through the public registration endpoint.
The service fixes every self-registered user's role to `CUSTOMER`; it does not
accept a role from the request. Staff and administrator provisioning requires a
future privileged administrative workflow.

Customers may register with an email address, an international phone number, or
both. Email addresses are normalized to lowercase, and the database has a
case-insensitive unique index. PostgreSQL also enforces that every user has at
least one identifier.

Passwords must be 12–128 characters and contain uppercase, lowercase, numeric,
and special characters. They are hashed with scrypt using a random 128-bit salt,
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
timing disclosure.

## Authorization boundaries

Proxy performs only a fast missing-cookie redirect for `/account`. The account
page and session endpoint independently resolve the token against PostgreSQL,
check expiry, and require an active user. Proxy is therefore not treated as the
security boundary.

Authenticated-user queries use an explicit safe-field projection. They never
return `passwordHash` or the stored session digest.

## Customer profile management

Profile APIs derive the customer ID only from the verified session and reject
unknown request fields. Customers may update their name, phone number, and
preferred language; email and role are immutable through these endpoints.

Password changes require the existing password, apply the same strength rules
as registration, and revoke every other session in the same database
transaction. The current session remains active so a successful password change
does not interrupt the initiating customer.

## Operational follow-ups

Production deployments should add distributed rate limiting for registration
and login, TLS termination, security event logging, password reset and email or
phone verification, session-management UI, and periodic deletion of expired
sessions. Multi-factor authentication is recommended for privileged roles.
