# Owner order bills

On an owned order, select **Preview and print bill**. The bill always has Sinhala labels and uses the product's saved Sinhala name when available; otherwise it uses the saved English name. Prices come from the order snapshot, including final packed weights, rather than the current catalogue.

Choose **80 mm**, **58 mm**, or **A4**, review the preview, and select **Print bill**. This opens the browser's print dialog for the receipt only. Select the connected printer and matching paper size. For thermal receipts, disable browser headers and footers and use the printer's receipt paper settings. The app cannot silently select a printer or confirm physical printing.

The bill includes shop contact details, the order reference, cashier, customer, products, delivery fee, total due, and known savings. An unfinished KG order is marked as an estimate. Cash received, card payments, and change are not shown because those transactions are not recorded by this application. The order UUID is the bill reference; no separate sequential POS invoice number is generated.

Sinhala fonts are served locally from `public/fonts`, with their redistribution license in `NOTO-LICENSE.txt`.

## Direct order statuses

Owners can select **Preparing** or **Ready for delivery** directly from a placed order, or **Ready for delivery** from a confirmed order. Only the actual transition is recorded in history. For KG items, enter Preparing to confirm weights first. All existing packed-weight and customer-agreement checks still run on the server. Assignment and dispatch remain delivery-person actions. Terminal orders cannot be reopened through this control.
