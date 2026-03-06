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

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(buildPrintHtml(title, table.outerHTML));
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
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

