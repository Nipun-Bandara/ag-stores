# Database design decisions

## Identifiers and time

All primary identifiers are PostgreSQL UUIDs. Application timestamps use
`TIMESTAMPTZ(3)` so stored instants are timezone-aware and have millisecond
precision. `createdAt` values are database-generated; Prisma maintains
`updatedAt` values.

## Roles and lifecycle state

User roles, user status, catalog status, order status, preferred language, and
delivery batch status are PostgreSQL enums. This prevents values outside the
known workflows from being written even when a caller bypasses application
validation.

Foreign keys cannot assert that a referenced user has a particular role. The
service layer must therefore verify that `Shop.ownerId` references a
`SHOP_OWNER`, order customers are `CUSTOMER` users, and delivery batches are
assigned to `DELIVERY_PERSON` users.

## Ownership integrity

Composite foreign keys enforce two important tenant boundaries:

- An order's delivery address must belong to that order's customer.
- A product's category must belong to that product's shop.

The service layer must still verify other cross-record rules, such as ensuring
every order item belongs to the order's shop and validating allowed status
transitions.

## Money and quantities

Money uses `DECIMAL(12,2)`, which is exact and can represent values up to
9,999,999,999.99 without floating-point rounding. The initial migration adds
database checks for non-negative prices and totals, positive order-item
quantities, non-negative stock, and `total = subtotal + deliveryFee`.

Coordinates use fixed-point decimals and database checks constrain latitude to
`[-90, 90]` and longitude to `[-180, 180]`.

## Deletion policy

Foreign keys use `RESTRICT` for users, shops, addresses, categories, products,
orders, batches, order items, and batch assignments. This deliberately avoids
silent cascades that could remove order or delivery history. Future deletion
workflows should generally deactivate or anonymize records and should remove
non-critical dependent records explicitly inside a transaction.

## Uniqueness and indexing

Emails and user phone numbers are globally unique. Address labels are unique
per customer, category and product English names are unique per shop, an order
can appear in only one delivery batch, and batch sequence numbers cannot repeat.
Indexes cover common role/status, shop catalog, customer order history, shop
order queue, order status, and delivery-person batch queries.

## Seed data

The development seed is idempotent and creates four role-specific users, one
shop, two bilingual categories, and two products. Its shared password is only a
development fixture and must never be used for deployed accounts.
