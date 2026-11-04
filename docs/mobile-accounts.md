# Mobile accounts and shared profiles

User identity remains the immutable UUID in `users.id`. Every foreign key and session continues to reference that UUID. Mobile is required, canonical text, and globally unique; it is not a primary key. The contradictory request to make mobile a primary key was interpreted in favor of the repeated requirement to preserve the UUID primary key.

## Account behavior

- Login accepts Sri Lankan mobile and password only. `0771234567`, `077 123-4567` and `+94 77 123 4567` normalize to `+94771234567`. Landlines, email login and malformed numbers are rejected. Incorrect credentials and inactive/unknown accounts receive the same generic failure. Existing password strength, scrypt hashing, sessions, rate limits, return destinations and role redirects are retained.
- First and last names are required, trimmed and not unique. Sinhala, Tamil, English, spaces, apostrophes, hyphens and periods are supported. Email is optional; blank/omitted email becomes null, and the existing case-insensitive email uniqueness policy remains.
- `name` remains a read-compatible display column for existing order, delivery, admin, audit and notification queries. A database trigger derives it from `firstName` and `lastName`; no identity form or endpoint accepts an independently editable combined name. It is not a second source of identity. `legacyName` preserves each migrated account's exact original name. Splitting uses the final whitespace-separated component as last name and all preceding components as first name; review inferred splits with the account holder.
- Public registration fixes role to CUSTOMER and rejects protected/unknown fields. Existing owner/admin delivery-account creation and editing use the same identity validation; creation retains the existing securely generated temporary password flow. Administrator/shop-owner provisioning otherwise remains the existing development seed workflow; no new privileged public registration was introduced.
- Every role has a My profile entry and uses the same profile and password components. `/profile` serves all roles; the existing customer `/account/profile` remains available. Role is read-only. The self-profile API uses only the session UUID and rejects role, status, shop assignment and user-ID changes.
- A changed canonical mobile requires the current password. The repository locks the user row and performs password verification and the complete profile save in one transaction. Wrong passwords or duplicate mobile/email roll back the entire edit. Changing formatting alone does not require a password. Existing sessions and relationships retain their UUID identity; subsequent login uses the new number. Password changes retain the existing behavior of revoking other sessions.
- Formik and Yup were already installed. Login, registration and profile use their pending states and inline validation, backed by the shared server/client identity rules. Sonner reports confirmed success and failures, including network failures; values remain on errors. All added interface copy has English and Sinhala text.
- No phone is marked verified. No OTP, SMS, Firebase or external verification is performed. A correctly formatted mobile is only a contact/login identifier.

## Safe migration order

Stop application processes using the old account contract and back up the intended database. Confirm its migration history matches this checkout before changing it. Do not reset or reseed an existing database to resolve migration errors.

```bash
npm run db:generate
npm run db:accounts:check
```

The check reports account UUIDs requiring correction, normalized-number collisions, and inferred name splits. It makes no changes and returns a nonzero exit code for unresolved identities. Invalid existing mobiles and normalization collisions always require manual correction; the tool does not merge/delete accounts or reassign their relationships.

For an explicitly designated **development database only**, fill missing phones or unusable name components with deterministic placeholders:

```bash
ALLOW_DEV_ACCOUNT_PLACEHOLDERS=1 npm run db:accounts:dev-backfill
npm run db:accounts:check
npm run db:migrate:deploy
npm run typecheck
npm run lint
npm run build
```

The development tool adds the nullable name/legacy columns before backfilling. It preserves valid existing mobiles, saves exact original names, and reports affected UUIDs and synthetic mobiles for correction. Repeated runs preserve assigned placeholders. Synthetic `+9479...` values are development fixtures, not verified numbers or real customer contact details; never contact them. Outside development, correct unresolved records with their real details before deploying constraints. The migration also normalizes existing valid local/international numbers and detects collisions before enforcing canonical format, required names/mobile and uniqueness. Its SQL is transactional and leaves UUIDs/foreign keys unchanged. If Prisma records a failed attempt, correct the data, mark this migration rolled back with `npx prisma migrate resolve --rolled-back 20261104100000_mobile_accounts`, then deploy again; never reset the database.

The configured Neon database was inspected read-only during implementation: six users, two missing mobiles, one single-word name, no normalized-mobile collisions. It contains the later `20261101100000_product_selling_setup` migration, absent from this branch's migration directory. It was not backfilled or migrated. Align the intended database/check-out migration history before using the commands against it. The isolated test databases used for verification do not contain customer data.

## Development fixtures and credentials

For a new migrated development/test database, explicitly enable the seed:

```bash
ALLOW_DEV_SEED=1 npm run db:seed
```

New fixture accounts use password `ChangeMe123!`:

| Role            | Mobile       | Optional email          |
| --------------- | ------------ | ----------------------- |
| Administrator   | +94700000001 | admin@agstores.local    |
| Shop owner      | +94700000002 | owner@agstores.local    |
| Delivery person | +94700000003 | delivery@agstores.local |
| Customer        | +94700000004 | customer@agstores.local |

All sample names, mobiles, emails, shop/contact values and credentials are development placeholders. Local mobile forms (`0700000001` through `0700000004`) work too. Existing fixture passwords are preserved, so the password above applies only to newly created fixtures or an explicit reset. A private nullable `developmentFixtureKey` keeps fixture accounts stable across edited names, phones and emails; it is never accepted from profile/registration or exposed in authentication responses. Legacy fixtures are adopted by their known email/mobile only when those contacts identify one matching-role account; ambiguous matches stop seeding. Existing shop assignments, catalogue prices, stock and category settings are preserved; normal seeding creates missing sample catalogue records without resetting existing ones.

If you explicitly need to reset only these marked development fixtures:

```bash
ALLOW_DEV_CREDENTIAL_RESET=1 npm run db:credentials:reset-dev
```

This is separate from normal seeding. It does not reset arbitrary users' passwords.

## Manual checks and expected results

1. Register with first name `අමා`, last name `Perera`, mobile `0771234567`, a strong password and blank email. Expect a customer account, canonical `+94771234567`, null email, success toast and the normal customer redirect. Register the same names with another mobile: allowed. Retry the original mobile as `+94 77 123 4567`: duplicate error, no second account.
2. Log out. Login with `077-123-4567` and the password: succeeds. Email/name login and a landline fail. Unknown mobile and wrong password show the same generic credential error. Verify a protected return destination and each seeded role's normal redirect.
3. Open My profile for customer, owner, delivery and admin at narrow/mobile and desktop widths. Expect the same editable first/last/mobile/optional-email/language fields, read-only role and password section. Clear email, change a name/language, save: confirmed toast, persisted values and the same UUID/role/shop assignment.
4. Change mobile. Without a password, with a wrong password, and with another account's mobile: reject and retain all previous database profile values. With the correct password and an unused local-format mobile: save canonically. The current session stays signed in; old-mobile login fails, new-mobile login succeeds; existing orders, shops, delivery assignments and addresses remain attached.
5. Submit extra role/status/shop/user-ID fields directly to the self-profile endpoint: 400, no privileged change. An anonymous request returns 401. Change password through the existing section: current password required, success toast only after confirmation, current session retained and other sessions revoked.
6. As owner and admin, create/edit delivery personnel with both names, local mobile and no email. Expect normalized contact details, no cross-shop permission expansion, and a temporary password only for creation. Duplicate mobiles (including equivalent formatting) produce a clear error. Deactivated accounts cannot log in.
7. Simulate offline/server errors on login/register/profile: inline feedback and an error toast, retained values, retry enabled, no premature success. Switch to Sinhala and repeat labels, validation, feedback and profile/password navigation.
8. On an isolated legacy-data copy, run the check before backfill: unresolved UUIDs reported and migration blocked. Run the gated development backfill twice: same placeholders, original names preserved. Migrate and compare UUIDs and relationship counts. Seed twice after editing a fixture's email/mobile/password: same fixture UUID and edited values, no duplicate account or password reset.

## Verification

Prisma generation, type checking, lint, formatting and the production build passed. All 318 unit checks across 72 files and 140 database integration checks across 26 files passed; the strengthened seed-preservation check also passed separately after its final update. All 11 focused Chromium checks across authentication, profile, role authorization and delivery-personnel management passed against a production build configured for the browser test origin. The exact final migration set also deployed to a separate empty PostgreSQL 17 database. Legacy tests cover collision refusal, unresolved-account migration refusal, original names/UUID-linked sessions, deterministic placeholders, and preserving already populated multiword name components.

Database checks use explicitly isolated PostgreSQL databases and temporary test schemas; configured Neon data is untouched. The PostgreSQL adapter emits its existing concurrent-client-query deprecation warning, while assertions pass. The entire unrelated browser suite was not run. Real-device usability and complete Sinhala language review remain manual checks. Configure `NEXT_PUBLIC_APP_URL` for the actual browser origin when building; using a build for port 3000 on the browser-test port 3100 correctly causes mutation-origin rejection.
