# Shop owner and order staff workflows

## One shop

Keep the shop record and existing product/order links. When an account manages one shop, product creation, category creation, delivery-account creation, and staff-account creation automatically use it. Shop settings remain under **Shop settings**.

Administrators configure the initial shop under **Shops**. The create-shop form is hidden once a shop exists. Existing multiple-shop data remains supported; it is not merged or deleted.

## Create an order staff account

1. Sign in as the owner and open **Order staff**.
2. Enter the person's first and last names and Sri Lankan mobile number. Email is optional.
3. Create the account and privately share the displayed mobile number and temporary password.
4. The person signs in with that account and can change the password under **My profile**.

Staff land on **Orders**. They can view their assigned shop's orders, confirm or prepare orders, record packed weights, mark orders ready, and preview/print the existing Sinhala bill. Delivery assignment and dispatch remain with delivery personnel.

Staff cannot create or edit products, categories, prices, manual stock quantities, shop settings, or other staff accounts. These restrictions are enforced by APIs and service checks, as well as page access. Deactivating or editing a staff account revokes its existing sessions.

## Returns

1. Open a **delivered** order and use **Returns and refunds** to select an item, quantity, and reason.
2. Recording creates a pending return. It does not change stock or mark money paid.
3. The owner opens **Returns and refunds → Pending review**, opens the order, and reviews the goods.
4. Approve with **Goods are suitable for resale** checked to restore that quantity to stock. Leave it unchecked for damaged or otherwise non-saleable goods. Reject with a reason when appropriate.
5. Once an approved cash refund has actually been handed to the customer, the owner or staff member uses **Record refund paid**. This records a manual cash payment; it does not send money through a payment provider.

Refund amounts come from saved order prices and delivered/packed quantities. Delivery fees are excluded. Pending and approved returns reserve quantities; rejected returns release them. Cumulative refunds cannot exceed the original item line amount. Order locks and retry handling prevent duplicate stock restoration and over-returning. The original bill and order totals remain historical records.

Every creation, review, and recorded cash refund includes the acting account in the audit trail. Packing and order cancellation continue to reconcile stock automatically through their existing workflows; this is separate from permission to manually edit inventory.

## Database setup

Generate the Prisma client and apply `20261115120000_order_staff_and_returns` before using these screens. It adds a role, audit actions, and a return table, without rewriting existing business records.

For hosted PostgreSQL with a pooler, configure `DIRECT_URL` for migration tooling while keeping `DATABASE_URL` pooled for runtime. See [Neon's Prisma guidance](https://github.com/neondatabase/website/blob/main/content/docs/guides/prisma.md).
