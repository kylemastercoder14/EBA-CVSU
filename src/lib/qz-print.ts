import type { KioskReceiptPayload } from "@/types/kiosk-receipt";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

// 32 chars fits cleanly within 48mm printable width
const toLine = (left: string, right = "", width = 32) => {
  const safeLeft = left.slice(0, width);
  const safeRight = right.slice(0, width);
  const spaces = Math.max(1, width - safeLeft.length - safeRight.length);
  return `${safeLeft}${" ".repeat(spaces)}${safeRight}`;
};

const divider = () => "-".repeat(32);

const buildEscPosReceipt = (receipt: KioskReceiptPayload) => {
  const lines: string[] = [];

  const issuedAt = new Intl.DateTimeFormat("en-PH", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(receipt.issuedAt));

  const firstPickup = receipt.items[0]?.pickupDate
    ? (() => {
        const parsed = new Date(`${receipt.items[0].pickupDate}T00:00:00`);
        return Number.isNaN(parsed.getTime())
          ? receipt.items[0].pickupDate
          : new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(parsed);
      })()
    : "-";

  lines.push("\x1B\x40"); // Initialize printer
  lines.push("\x1B\x61\x01"); // Center align

  // Store name — large bold
  lines.push("\x1B\x21\x11"); // Font large (double width + height)
  lines.push("\x1B\x45\x01"); // Bold on
  lines.push("EBA ORDERING");
  lines.push("\x1B\x45\x00"); // Bold off
  lines.push("\x1B\x21\x00"); // Font normal
  lines.push("External & Business Affairs");
  lines.push("Ordering System");

  lines.push("\x1B\x61\x00"); // Left align
  lines.push(divider());

  // Transaction info
  lines.push(issuedAt);
  lines.push(toLine("OR No:", receipt.orderNumber));
  lines.push(toLine("Customer:", receipt.customerName));
  lines.push(toLine("Mobile:", receipt.mobileNumber));
  lines.push(toLine("Pickup:", firstPickup));
  lines.push(toLine("Payment:", receipt.paymentMethod.toUpperCase()));
  if (receipt.paymentReference) {
    lines.push(toLine("Ref:", receipt.paymentReference));
  }

  lines.push(divider());

  // Items header
  lines.push("\x1B\x45\x01"); // Bold on
  lines.push(toLine("ITEM", "AMOUNT"));
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

    // Qty breakdown
    lines.push(`  x${item.quantity} @ PHP ${formatMoney(item.unitPrice)}`);
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
  lines.push("This serves as your");
  lines.push("\x1B\x45\x01"); // Bold on
  lines.push("OFFICIAL RECEIPT");
  lines.push("\x1B\x45\x00"); // Bold off
  lines.push("");
  lines.push("Thank you for your order!");
  lines.push("Please come again :)");
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

    // ✅ Signature — must return a FUNCTION that returns a Promise
    // This was the bug: passing async fn directly instead of () => Promise
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise((toSign: string) => {
      return () =>
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
            return payload.signature;
          });
    });

    // Connect if not already active
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 3, delay: 1 });
    }

    // Resolve printer name
    const preferredPrinter = process.env.NEXT_PUBLIC_QZ_PRINTER ?? "";
    let printer: string = preferredPrinter;

    if (!printer) {
      const defaultPrinter = await qz.printers.getDefault();
      if (defaultPrinter) {
        printer = defaultPrinter as string;
      } else {
        const allPrinters = (await qz.printers.find()) as string[];
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

    await qz.print(config, [
      {
        type: "raw",
        format: "plain",
        data: buildEscPosReceipt(receipt),
      },
    ]);

    return true;
  } catch (error) {
    console.error("[QZ] Print failed:", error);
    return false;
  }
};
