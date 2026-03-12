"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type TablePrintButtonProps = {
  targetId: string;
  title: string;
};

const buildPrintHtml = (title: string, tableHtml: string) => {
  const printedAt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { font-size: 12px; margin: 0 0 16px; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    td img {
      width: 64px;
      height: 64px;
      max-width: 64px;
      max-height: 64px;
      object-fit: contain;
      display: block;
    }
    button, svg { display: none !important; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Printed: ${printedAt}</p>
  ${tableHtml}
</body>
</html>`;
};

export const TablePrintButton = ({ targetId, title }: TablePrintButtonProps) => {
  const handlePrint = () => {
    const container = document.getElementById(targetId);
    const table = container?.querySelector("table");
    if (!table) return;

    const printableTable = table.cloneNode(true) as HTMLTableElement;

    // Next.js fill images rely on runtime CSS classes. Normalize them to static images for printing.
    printableTable.querySelectorAll("img").forEach((img) => {
      const plain = document.createElement("img");
      plain.src = img.currentSrc || img.src;
      plain.alt = img.alt || "";
      plain.width = 64;
      plain.height = 64;
      plain.style.width = "64px";
      plain.style.height = "64px";
      plain.style.objectFit = "contain";
      plain.style.display = "block";

      const wrapper = img.parentElement;
      if (wrapper && wrapper !== printableTable) {
        wrapper.replaceWith(plain);
      } else {
        img.replaceWith(plain);
      }
    });

    const html = buildPrintHtml(title, printableTable.outerHTML);

    // Use a hidden iframe so printing stays in the same tab.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        document.body.removeChild(iframe);
      }, 200);
    };
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-[#07484A] text-[#07484A] hover:bg-[#07484A] hover:text-white"
      onClick={handlePrint}
    >
      <PrinterIcon className="size-4" />
      Print Table
    </Button>
  );
};
