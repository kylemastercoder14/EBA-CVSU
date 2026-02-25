import type { KioskReceiptPayload } from "@/types/kiosk-receipt";

export const formatReceiptMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatReceiptPickupDate = (dateText: string) => {
  if (!dateText) return "-";
  const parsed = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateText;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

export const formatReceiptIssuedAtLong = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatReceiptIssuedAtShort = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export const escapeReceiptHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type ReceiptHtmlOptions = {
  paymentMethodLabel?: string;
};

export const buildReceiptHtml = (
  receipt: KioskReceiptPayload,
  options: ReceiptHtmlOptions = {},
) => {
  const paymentMethodLabel =
    options.paymentMethodLabel ??
    (receipt.paymentMethod === "gcash" ? "GCash" : "Cash");

  const issuedAtLabel = formatReceiptIssuedAtLong(receipt.issuedAt);
  const issuedShort = formatReceiptIssuedAtShort(receipt.issuedAt);
  const firstPickupDate = receipt.items[0]?.pickupDate
    ? formatReceiptPickupDate(receipt.items[0].pickupDate)
    : "-";

  const itemRows = receipt.items
    .map(
      (item) => `
        <tr>
          <td>${escapeReceiptHtml(item.productName)}</td>
          <td>${escapeReceiptHtml(item.variant)}</td>
          <td>${item.quantity}</td>
          <td>PHP ${formatReceiptMoney(item.unitPrice)}</td>
          <td>PHP ${formatReceiptMoney(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  const paymentDetailRow =
    receipt.paymentMethod === "gcash"
      ? `<div><span class="label">GCash Reference:</span> ${escapeReceiptHtml(receipt.paymentReference || "-")}</div>`
      : `<div><span class="label">Payment Status:</span> Pending Cash Collection</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeReceiptHtml(receipt.orderNumber)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font-family: Arial, Helvetica, sans-serif;
        color: #000;
        background: #fff;
      }
      .receipt {
        max-width: 820px;
        margin: 0 auto;
        border: 2px solid #000;
        padding: 24px;
      }
      .header {
        border-bottom: 1px solid #000;
        padding-bottom: 12px;
        margin-bottom: 14px;
      }
      .title {
        font-size: 26px;
        font-weight: 700;
        margin: 0;
      }
      .subtitle {
        margin: 4px 0 0;
        font-size: 14px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 18px;
        margin: 14px 0;
        font-size: 14px;
      }
      .label { font-weight: 700; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      th, td {
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
        font-size: 13px;
      }
      th { font-weight: 700; background: #fff; }
      .totals {
        margin-top: 14px;
        border-top: 1px solid #000;
        padding-top: 10px;
        text-align: right;
        font-size: 16px;
        font-weight: 700;
      }
      .footer {
        margin-top: 18px;
        border-top: 1px solid #000;
        padding-top: 10px;
        font-size: 12px;
      }
      @media print {
        body { padding: 0; }
        .receipt {
          max-width: 100%;
          border: none;
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <section class="receipt">
      <header class="header">
        <div style="display:flex;justify-content:space-between;gap:12px;font-size:14px;margin-bottom:8px;">
          <span>${escapeReceiptHtml(issuedShort)}</span>
          <span>Receipt ${escapeReceiptHtml(receipt.orderNumber)}</span>
        </div>
        <h1 class="title">EBA ORDER RECEIPT</h1>
        <p class="subtitle">External and Business Affair Ordering System</p>
      </header>

      <div class="grid">
        <div><span class="label">Order Number:</span> ${escapeReceiptHtml(receipt.orderNumber)}</div>
        <div><span class="label">Issue Date:</span> ${escapeReceiptHtml(issuedAtLabel)}</div>
        <div><span class="label">Customer:</span> ${escapeReceiptHtml(receipt.customerName)}</div>
        <div><span class="label">Mobile:</span> ${escapeReceiptHtml(receipt.mobileNumber)}</div>
        <div><span class="label">Payment Method:</span> ${escapeReceiptHtml(paymentMethodLabel)}</div>
        ${paymentDetailRow}
        <div><span class="label">Pickup Date:</span> ${escapeReceiptHtml(firstPickupDate)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Variant</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals">TOTAL: PHP ${formatReceiptMoney(receipt.total)}</div>

      <div class="footer">
        This receipt serves as proof of order and payment confirmation.
      </div>
    </section>
  </body>
</html>`;
};
