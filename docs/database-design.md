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

Category management scopes every mutation through the category's shop owner.
Shop assignment is set when a category is created and is not editable. Owners
and administrators may read management category data, but only the owning
`SHOP_OWNER` may create, rename, activate, or deactivate categories. Public
storefront category reads always add `status = ACTIVE`, so inactive categories
remain available for management and existing product relations without being
shown to customers.

Product management follows the same ownership boundary. A product's shop is
immutable after creation, and category changes must reference a category from
that same owned shop. Owner searches are scoped through the shop relation before
applying category or case-insensitive bilingual text filters.

Customer storefront reads use a separate read-only repository. Every storefront
product query requires `Product.isAvailable = true` and an `ACTIVE` category,
including direct product-detail lookups. Products with zero stock remain visible
so customers can see the catalog state, but are explicitly marked out of stock.
Storefront category counts include only available products.

## Money and quantities

Money uses `DECIMAL(12,2)`, which is exact and can represent values up to
9,999,999,999.99 without floating-point rounding. The initial migration adds
database checks for non-negative prices and totals, positive order-item
quantities, non-negative stock, and `total = subtotal + deliveryFee`.

Product price requests are validated and normalized as decimal strings with at
most two fractional digits. They are passed to Prisma without conversion through
JavaScript floating-point arithmetic and returned to clients as fixed two-place
strings.

Coordinates use fixed-point decimals and database checks constrain latitude to
`[-90, 90]` and longitude to `[-180, 180]`.

Customer address coordinates accept at most six decimal places and are returned
through APIs as decimal strings. This preserves their exact PostgreSQL value
instead of converting them to an imprecise JSON floating-point representation.

## Deletion policy

Foreign keys use `RESTRICT` for users, shops, addresses, categories, products,
orders, batches, order items, and batch assignments. This deliberately avoids
silent cascades that could remove order or delivery history. Future deletion
workflows should generally deactivate or anonymize records and should remove
non-critical dependent records explicitly inside a transaction.

## Order lifecycle

Order status changes use a centralized, explicit transition graph. Shop owners
control acceptance and preparation, customers may cancel only a newly placed
order, delivery personnel control assigned-delivery states, and administrators
may perform any otherwise valid transition. Terminal states cannot transition.

Every successful transition updates the order and inserts an
`OrderStatusHistory` record in the same serializable transaction, including the
previous status, new status, actor, timestamp, and optional note.

## Uniqueness and indexing

Emails and user phone numbers are globally unique. Address labels are unique
per customer, category and product English names are unique per shop, an order
can appear in only one delivery batch, and batch sequence numbers cannot repeat.
Indexes cover common role/status, shop catalog, customer order history, shop
order queue, order status, and delivery-person batch queries.

A partial unique PostgreSQL index permits at most one default address per
customer. The first address becomes the default automatically. Default changes,
and promotion of a replacement when the default is deleted, run in database
transactions. Address reads and writes always include `customerId` in their
predicate so another customer's address is indistinguishable from a missing
record.

## Seed data

The development seed is idempotent and creates four role-specific users, one
shop, two bilingual categories, and two products. Its shared password is only a
development fixture and must never be used for deployed accounts.
