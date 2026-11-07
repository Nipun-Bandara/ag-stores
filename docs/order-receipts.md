# Owner order bills

On an owned order, select **Preview and print bill**. The bill always has Sinhala labels and uses the product's saved Sinhala name when available; otherwise it uses the saved English name. Prices come from the order snapshot, including final packed weights, rather than the current catalogue.

The preview defaults to **80 mm**; **58 mm** and **A4** remain available in the paper selector. Review the bill and press **Enter** or select **Print bill**. Enter also works while the receipt preview has focus; it selects an option normally when the paper selector is focused. Printing waits for the Sinhala fonts. The app sends only the receipt to the browser print flow. A standard browser may still show its native print dialog; silent printing needs printer or kiosk configuration outside the web application. The app cannot confirm physical printing.

The bill includes shop contact details, cashier, customer, products, delivery fee, total due, and known savings. An unfinished KG order is marked as an estimate. Cash received, card payments, and change are not shown because those transactions are not recorded by this application. Order numbers are omitted from the bill.

Sinhala fonts are served locally from `public/fonts`, with their redistribution license in `NOTO-LICENSE.txt`.

## Direct order statuses

Owners can select **Preparing** or **Ready for delivery** directly from a placed order, or **Ready for delivery** from a confirmed order. Only the actual transition is recorded in history. For KG items, enter Preparing to confirm weights first. All existing packed-weight and customer-agreement checks still run on the server. Assignment and dispatch remain delivery-person actions. Terminal orders cannot be reopened through this control.
