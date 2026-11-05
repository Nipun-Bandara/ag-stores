import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { translate } from "@/lib/i18n/text";
import type { getOwnerOrder } from "@/services/owner-order.service";

export type ReceiptOrder = Awaited<ReturnType<typeof getOwnerOrder>>;
export type ReceiptPaper = "80mm" | "58mm" | "A4";
function escape(value: string | number): string {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
const amount = (value: string) =>
  Number(value).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Uses the saved order pricing and packed weights; never catalogue prices. */
export function buildOrderReceipt(
  order: ReceiptOrder,
  cashier: string,
  paper: ReceiptPaper = "80mm",
): string {
  const estimated = order.packingRequired && !order.packingFinalizedAt;
  const savings = order.items.every((item) => item.savings !== null)
    ? minorUnitsToMoney(
        order.items.reduce(
          (sum, item) => addMinorUnits(sum, moneyToMinorUnits(item.savings!)),
          "0",
        ),
      )
    : null;
  const rows = order.items
    .map(
      (item) => `<tbody class="item">
    <tr><th colspan="4" class="product">${escape(item.nameSi?.trim() || item.nameEn)} <small>(${item.sellingUnit === "KG" ? "කි.ග්‍රෑ." : "ඒකක"})</small></th></tr>
    <tr><td>${escape((item.packedQuantity ?? item.quantity).toFixed(3))}</td><td>${item.regularPrice === null ? "—" : amount(item.regularPrice)}</td><td><strong>${amount(item.unitPrice)}</strong></td><td>${amount(item.lineTotal)}</td></tr>
  </tbody>`,
    )
    .join("");
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(order.createdAt));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((value) => value.type === type)?.value ?? "";
  const date = `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
  const width = paper === "58mm" ? "52mm" : paper === "A4" ? "180mm" : "74mm";
  return `<!DOCTYPE html><html lang="si"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; base-uri 'none'"><title>බිල්පත — ${escape(order.id)}</title><style>
    @font-face{font-family:ReceiptSinhala;src:url('/fonts/NotoSerifSinhala-Regular.ttf') format('truetype');font-weight:400;font-display:block}
    @font-face{font-family:ReceiptSinhala;src:url('/fonts/NotoSerifSinhala-Bold.ttf') format('truetype');font-weight:700;font-display:block}
    @page{size:${paper === "A4" ? "A4" : "auto"};margin:${paper === "A4" ? "12mm" : "0"}}
    *{box-sizing:border-box}html,body{background:#fff;color:#000;margin:0;padding:0}body{font-family:ReceiptSinhala,'Nirmala UI','Iskoola Pota',serif;font-size:${paper === "58mm" ? "10" : "12"}px;line-height:1.65}
    .receipt{width:${width};max-width:100%;margin:3mm auto;padding:0 1mm}header{text-align:center;border-bottom:1px solid #000;padding-bottom:2mm}h1{font-size:22px;margin:0;overflow-wrap:anywhere}.slogan{font-size:15px;font-weight:700;text-decoration:underline;text-underline-offset:3px}p{margin:1mm 0;overflow-wrap:anywhere}.meta{padding:2mm 0;font-size:10px}.ref{font:9px monospace;overflow-wrap:anywhere}.notice{border:1px solid #000;padding:2mm;font-weight:bold;text-align:center}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-variant-numeric:tabular-nums}thead th{font-size:10px;border-top:1px solid #000;border-bottom:1px solid #000;padding:1mm 0}td{text-align:right;font-family:ReceiptSinhala,serif;white-space:nowrap;font-size:${paper === "58mm" ? "9" : "11"}px;padding:0 0 1mm}.product{text-align:left;overflow-wrap:anywhere;padding-top:2mm;font-weight:400}small{font-size:9px}.item{break-inside:avoid}
    .totals{border-top:1px solid #000;margin-top:2mm;padding-top:2mm}.row{display:flex;justify-content:space-between;gap:2mm;padding:1mm 0}.row span:last-child{white-space:nowrap;font-variant-numeric:tabular-nums}.grand{font-weight:bold;font-size:15px;border-top:1px solid #000}.savings{border:2px solid #000;padding:2mm;margin:2mm 0;font-weight:bold}footer{text-align:center;padding-top:2mm;border-top:1px solid #000;break-inside:avoid}h1,header,.totals{break-inside:avoid}
    @media print{.receipt{max-width:none;margin:${paper === "A4" ? "0 auto" : "3mm auto"}}}
  </style></head><body><main class="receipt">
    <header><h1>${escape(order.shopName)}</h1><p class="slogan">හොඳම දේ අඩුම මිලට</p><p>${escape(order.shopAddress)}</p><p>දුර: ${escape(order.shopOwnerPhone)}</p></header>
    <div class="meta"><p>අයකැමි: ${escape(cashier)}</p><p>ඇණවුම් අංකය: <span class="ref">${escape(order.id)}</span></p><p>දිනය: ${escape(date)}</p><p>පාරිභෝගිකයා: ${escape(order.customer.name)}</p>${order.customer.phone ? `<p>දුරකථන: ${escape(order.customer.phone)}</p>` : ""}<p>ලිපිනය: ${escape(order.deliveryAddress.address)}</p><p>තත්ත්වය: ${escape(translate("si", orderStatusLabels[order.status]))}</p></div>
    ${estimated ? '<p class="notice">තාවකාලික බිල්පතකි. ඇසුරුම් කිරීම අවසන් වූ පසු මුළු මුදල වෙනස් විය හැක.</p>' : ""}
    <table aria-label="භාණ්ඩ"><thead><tr><th>ප්‍රමාණය</th><th>වෙළඳ මිල</th><th>අපේ මිල</th><th>එකතුව</th></tr></thead>${rows}</table>
    <div class="totals"><div class="row"><span>භාණ්ඩ එකතුව</span><span>${amount(order.subtotal)}</span></div><div class="row"><span>බෙදාහැරීමේ ගාස්තුව</span><span>${amount(order.deliveryFee)}</span></div><div class="row grand"><span>මුළු එකතුව (රු.)</span><span>${amount(order.total)}</span></div><p>භාණ්ඩ ලැබුණු විට මුදලින් ගෙවීම</p><div class="row"><span>ගෙවිය යුතු මුදල</span><span>${amount(order.total)}</span></div></div>
    ${savings !== null ? `<div class="row savings"><span>ඔබ ලැබූ ලාභය (රු.)</span><span>${amount(savings)}</span></div>` : ""}
    <footer><p>භාණ්ඩ වර්ග ගණන: ${order.items.length}</p><p><strong>ස්තුතියි, නැවත එන්න!</strong></p></footer>
  </main></body></html>`;
}
