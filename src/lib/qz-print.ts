import type { KioskReceiptPayload } from "@/types/kiosk-receipt";
import {
  formatReceiptIssuedAtShort,
  formatReceiptMoney,
  formatReceiptPickupDate,
} from "@/lib/receipt-template";

const formatMoney = formatReceiptMoney;

// 32 chars fits cleanly within 48mm printable width
const toLine = (left: string, right = "", width = 32) => {
  const safeLeft = left.slice(0, width);
  const safeRight = right.slice(0, width);
  const spaces = Math.max(1, width - safeLeft.length - safeRight.length);
  return `${safeLeft}${" ".repeat(spaces)}${safeRight}`;
};

const divider = () => "-".repeat(32);

const withTimeout = async <T,>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms.`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const buildEscPosReceipt = (receipt: KioskReceiptPayload) => {
  const lines: string[] = [];

  const issuedAt = formatReceiptIssuedAtShort(receipt.issuedAt);
  const firstPickup = receipt.items[0]?.pickupDate
    ? formatReceiptPickupDate(receipt.items[0].pickupDate)
    : "-";

  lines.push("\x1B\x40"); // Initialize printer
  lines.push("\x1B\x61\x01"); // Center align

  // Store name — large bold
  lines.push("\x1B\x21\x11"); // Font large (double width + height)
  lines.push("\x1B\x45\x01"); // Bold on
  lines.push("EBA ORDER RECEIPT");
  lines.push("\x1B\x45\x00"); // Bold off
  lines.push("\x1B\x21\x00"); // Font normal
  lines.push("External & Business Affairs");
  lines.push("Ordering System");

  lines.push("\x1B\x61\x00"); // Left align
  lines.push(divider());

  // Transaction info (matched with student receipt layout)
  lines.push(issuedAt);
  lines.push(toLine("Receipt", receipt.orderNumber));
  lines.push(toLine("Order Number:", receipt.orderNumber));
  lines.push(toLine("Customer:", receipt.customerName));
  lines.push(toLine("Mobile:", receipt.mobileNumber));
  lines.push(toLine("Pickup Date:", firstPickup));
  lines.push(
    toLine(
      "Payment Method:",
      receipt.paymentMethod === "gcash" ? "GCash" : "Cash",
    ),
  );
  if (receipt.paymentReference) {
    lines.push(toLine("GCash Ref:", receipt.paymentReference));
  } else {
    lines.push(toLine("Pay Status:", "Pending Cash"));
  }

  lines.push(divider());

  // Items header
  lines.push("\x1B\x45\x01"); // Bold on
  lines.push(toLine("ITEM", "LINE TOTAL"));
  lines.push("\x1B\x45\x00"); // Bold off
  lines.push(divider());

  // Items
  for (const item of receipt.items) {
    const label = item.variant
      ? `${item.productName} (${item.variant})`
      : item.productName;
    const amount = `PHP ${formatMoney(item.lineTotal)}`;

    // If label + amount is too long, put label on its own line
    if (label.length + amount.length + 1 > 32) {
      lines.push(label);
      lines.push(toLine("", amount));
    } else {
      lines.push(toLine(label, amount));
    }

    // Qty/variant breakdown to mirror HTML receipt columns
    if (item.variant) {
      lines.push(`  Variant: ${item.variant}`);
    }
    lines.push(
      `  Qty ${item.quantity} @ PHP ${formatMoney(item.unitPrice)}`,
    );
  }

  lines.push(divider());

  // Grand total — large
  lines.push("\x1B\x21\x11"); // Font large
  lines.push("\x1B\x45\x01"); // Bold on
  lines.push(toLine("TOTAL", `PHP ${formatMoney(receipt.total)}`));
  lines.push("\x1B\x45\x00"); // Bold off
  lines.push("\x1B\x21\x00"); // Font normal

  lines.push(divider());

  // Footer
  lines.push("\x1B\x61\x01"); // Center align
  lines.push("This receipt serves as proof");
  lines.push("of order and payment.");
  lines.push("");
  lines.push(receipt.orderNumber);

  // Feed lines + partial cut
  lines.push("\x1B\x64\x04"); // Feed 4 lines
  lines.push("\x1D\x56\x41\x00"); // Partial cut

  return `${lines.join("\n")}\n`;
};

// ── QZ Tray Print ──────────────────────────────────────────────────────────

export const printReceiptViaQz = async (
  receipt: KioskReceiptPayload,
): Promise<boolean> => {
  try {
    const qzModule = await import("qz-tray");
    const qz = qzModule.default ?? qzModule;

    // ✅ Certificate — callback style (resolve/reject)
    qz.security.setCertificatePromise(
      (
        resolve: (value: string) => void,
        reject: (reason?: unknown) => void,
      ) => {
        fetch("/api/qz/certificate")
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch QZ certificate.");
            return res.text();
          })
          .then(resolve)
          .catch(reject);
      },
    );

    // QZ 2.x accepts either:
    // 1) an async function that returns the signature string, or
    // 2) a function that returns a resolver callback (resolve, reject) => void.
    // Use the resolver callback form for compatibility with qz-tray@2.2.x.
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise((toSign: string) => {
      return (
        resolve: (value: string) => void,
        reject: (reason?: unknown) => void,
      ) => {
        fetch("/api/qz/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: toSign }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to sign QZ request.");
            return res.json() as Promise<{ signature?: string }>;
          })
          .then((payload) => {
            if (!payload.signature) throw new Error("Missing QZ signature.");
            resolve(payload.signature);
          })
          .catch(reject);
      };
    });

    // Connect if not already active
    if (!qz.websocket.isActive()) {
      await withTimeout(
        qz.websocket.connect({ retries: 3, delay: 1 }),
        10_000,
        "QZ websocket connect",
      );
    }

    // Resolve printer name
    const preferredPrinter = process.env.NEXT_PUBLIC_QZ_PRINTER ?? "";
    let printer: string = preferredPrinter;

    if (!printer) {
      const defaultPrinter = await withTimeout(
        qz.printers.getDefault(),
        5_000,
        "QZ getDefault printer",
      );
      if (defaultPrinter) {
        printer = defaultPrinter as string;
      } else {
        const allPrinters = (await withTimeout(
          qz.printers.find(),
          8_000,
          "QZ find printers",
        )) as string[];
        const thermal = allPrinters.find((p) =>
          ["xp-58", "xp58", "pb-58", "pb58", "thermal", "receipt", "pos"].some(
            (kw) => p.toLowerCase().includes(kw),
          ),
        );
        printer = thermal ?? allPrinters[0] ?? "";
      }
    }

    if (!printer) throw new Error("No printer found for QZ Tray.");

    console.log("[QZ] Printing to:", printer);

    const config = qz.configs.create(printer, {
      encoding: "UTF-8",
      copies: 1,
    });

    await withTimeout(
      qz.print(config, [
        {
          type: "raw",
          format: "plain",
          data: buildEscPosReceipt(receipt),
        },
      ]),
      15_000,
      "QZ print",
    );

    return true;
  } catch (error) {
    console.error("[QZ] Print failed:", error);
    return false;
  }
};
