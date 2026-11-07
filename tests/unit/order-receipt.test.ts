import { describe, expect, it } from "vitest";
import { buildOrderReceipt } from "@/features/owner/lib/order-receipt";
import { receiptOrder } from "../fixtures/owner-receipt";
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
describe("Sinhala order receipts", () => {
  it("uses Sinhala labels and names, saved prices and final packed weights", () => {
    const doc = parse(buildOrderReceipt(receiptOrder, "Ashen"));
    expect(doc.documentElement.lang).toBe("si");
    expect(doc.querySelector("h1")?.textContent).toBe("A.G. ස්ටෝර්ස්");
    expect(doc.querySelector(".product")?.textContent).toContain("සහල්");
    expect(doc.body.textContent).not.toContain("Rice");
    const numbers = [
      ...doc.querySelectorAll("tbody.item:first-of-type td"),
    ].map((cell) => cell.textContent);
    expect(numbers).toEqual(["0.500", "150.00", "130.00", "65.00"]);
    expect(doc.querySelector(".grand")?.textContent).toContain("405.00");
    expect(doc.querySelector(".savings")?.textContent).toContain("20.00");
    expect(doc.querySelector(".notice")).toBeNull();
    expect(doc.body.textContent).toContain("2026-11-05 14:30");
    expect(doc.documentElement.textContent).not.toContain("ඇණවුම් අංකය");
    expect(doc.documentElement.textContent).not.toContain(receiptOrder.id);
    expect(doc.body.textContent).not.toContain("මුදලින් ගෙවීම්");
  });
  it("renders the database shop name and address, fixed Sinhala slogan, and owner account mobile", () => {
    const order = {
      ...receiptOrder,
      shopName: "වෙනත් වෙළඳසැල",
      shopAddress: "අංක 21, මහනුවර",
      shopOwnerPhone: "0712345678",
    };
    const doc = parse(buildOrderReceipt(order, "Cashier"));
    const header = doc.querySelector("header")!;
    expect(header.querySelector("h1")?.textContent).toBe(order.shopName);
    expect(header.querySelector(".slogan")?.textContent).toBe(
      "හොඳම දේ අඩුම මිලට",
    );
    expect(header.textContent).toContain(order.shopAddress);
    expect(header.textContent).toContain("දුර: 0712345678");
    expect(header.textContent).not.toContain(receiptOrder.shopName);
  });
  it("escapes user content and falls back to the saved name if Sinhala is unavailable", () => {
    const order = {
      ...receiptOrder,
      shopName: '<img src=x onerror="alert(1)">',
      items: [
        {
          ...receiptOrder.items[0]!,
          nameSi: null,
          nameEn: '<script>alert("x")</script>',
        },
      ],
    };
    const doc = parse(buildOrderReceipt(order, "<b>Owner</b>"));
    expect(doc.querySelector("img,script")).toBeNull();
    expect(doc.querySelector("h1")?.textContent).toBe(order.shopName);
    expect(doc.querySelector(".product")?.textContent).toContain(
      order.items[0]!.nameEn,
    );
    expect(doc.body.textContent).toContain("<b>Owner</b>");
  });
  it("labels unfinished packing as an estimate and supports receipt paper sizes", () => {
    const order = { ...receiptOrder, packingFinalizedAt: null };
    expect(
      parse(buildOrderReceipt(order, "Owner", "58mm")).querySelector(".notice")
        ?.textContent,
    ).toContain("තාවකාලික");
    expect(buildOrderReceipt(order, "Owner", "58mm")).toContain("width:52mm");
    expect(buildOrderReceipt(order, "Owner", "80mm")).toContain("width:74mm");
    expect(buildOrderReceipt(order, "Owner", "A4")).toContain("size:A4");
  });
});
