import type { KioskReceiptPayload } from "@/types/kiosk-receipt";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const toLine = (left: string, right = "", width = 42) => {
  const safeLeft = left.slice(0, width);
  const safeRight = right.slice(0, width);
  const spaces = Math.max(1, width - safeLeft.length - safeRight.length);
  return `${safeLeft}${" ".repeat(spaces)}${safeRight}`;
};

const buildEscPosReceipt = (receipt: KioskReceiptPayload) => {
  const lines: string[] = [];

  lines.push("\x1B\x40"); // Initialize printer
  lines.push("\x1B\x61\x01"); // Center align
  lines.push("EBA ORDER RECEIPT");
  lines.push("External and Business Affair");
  lines.push("------------------------------------------");
  lines.push("\x1B\x61\x00"); // Left align
  lines.push(toLine("Order #", receipt.orderNumber));
  lines.push(toLine("Customer", receipt.customerName));
  lines.push(toLine("Mobile", receipt.mobileNumber));
  lines.push(toLine("Payment", receipt.paymentMethod.toUpperCase()));
  if (receipt.paymentReference) {
    lines.push(toLine("Reference", receipt.paymentReference));
  }
  lines.push("------------------------------------------");
  lines.push("Item / Variant");

  for (const item of receipt.items) {
    lines.push(`${item.productName} (${item.variant})`);
    lines.push(toLine(`x${item.quantity} @ PHP ${formatMoney(item.unitPrice)}`, `PHP ${formatMoney(item.lineTotal)}`));
  }

  lines.push("------------------------------------------");
  lines.push(toLine("TOTAL", `PHP ${formatMoney(receipt.total)}`));
  lines.push("------------------------------------------");
  lines.push(toLine("Issued", new Date(receipt.issuedAt).toLocaleString("en-PH")));
  lines.push("");
  lines.push("This receipt serves as proof");
  lines.push("of order and payment.");
  lines.push("");
  lines.push("");
  lines.push("\x1D\x56\x00"); // Full cut

  return `${lines.join("\n")}\n`;
};

export const printReceiptViaQz = async (receipt: KioskReceiptPayload): Promise<boolean> => {
  try {
    const qzModule = await import("qz-tray");
    const qz = qzModule.default ?? qzModule;

    qz.security.setCertificatePromise(async (resolve: (value: string) => void, reject: (reason?: unknown) => void) => {
      try {
        const response = await fetch("/api/qz/certificate");
        if (!response.ok) throw new Error("Failed to fetch QZ certificate.");
        const certificate = await response.text();
        resolve(certificate);
      } catch (error) {
        reject(error);
      }
    });

    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise(async (toSign: string) => {
      const response = await fetch("/api/qz/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: toSign }),
      });

      if (!response.ok) throw new Error("Failed to sign QZ request.");
      const payload = (await response.json()) as { signature?: string };
      if (!payload.signature) throw new Error("Missing QZ signature.");
      return payload.signature;
    });

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 1, delay: 0 });
    }

    const preferredPrinter = process.env.NEXT_PUBLIC_QZ_PRINTER || "";
    const printer =
      preferredPrinter || (await qz.printers.getDefault()) || (await qz.printers.find());
    if (!printer) throw new Error("No printer found for QZ Tray.");

    const config = qz.configs.create(printer);
    const rawData = buildEscPosReceipt(receipt);
    await qz.print(config, [{ type: "raw", format: "plain", data: rawData }]);

    return true;
  } catch (error) {
    console.error("QZ print failed:", error);
    return false;
  }
};
