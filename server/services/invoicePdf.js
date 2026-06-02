import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export async function createInvoicePdf({ client, invoice }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const draw = (text, x, y, size = 11, options = {}) => page.drawText(String(text), { x, y, size, font: options.bold ? bold : font, color: options.color ?? rgb(0.09, 0.12, 0.2) });

  draw('Fenyx Finance', 48, 730, 24, { bold: true, color: rgb(0.15, 0.39, 0.92) });
  draw('Invoice', 470, 735, 22, { bold: true });
  draw(`Invoice #: ${invoice.invoiceNumber}`, 410, 705, 10);
  draw(`Date: ${invoice.date}`, 410, 688, 10);
  draw(`Due: ${invoice.dueDate}`, 410, 671, 10);

  draw('Bill To', 48, 660, 13, { bold: true });
  draw(client.name, 48, 638, 11, { bold: true });
  draw(client.company, 48, 622, 10);
  draw(client.email, 48, 606, 10);
  draw(client.phone, 48, 590, 10);
  draw(`Subscription: ${client.plan}`, 48, 574, 10);

  page.drawRectangle({ x: 48, y: 510, width: 516, height: 28, color: rgb(0.94, 0.97, 1) });
  draw('Description', 62, 520, 10, { bold: true });
  draw('Qty', 370, 520, 10, { bold: true });
  draw('Unit Price', 420, 520, 10, { bold: true });
  draw('Line Total', 500, 520, 10, { bold: true });

  let y = 486;
  invoice.lineItems.forEach((item) => {
    const total = Number(item.quantity) * Number(item.unitPrice);
    draw(item.description, 62, y, 10);
    draw(item.quantity, 374, y, 10);
    draw(currency.format(item.unitPrice), 420, y, 10);
    draw(currency.format(total), 500, y, 10);
    y -= 26;
  });

  page.drawLine({ start: { x: 48, y: y + 10 }, end: { x: 564, y: y + 10 }, thickness: 1, color: rgb(0.82, 0.86, 0.91) });
  draw('Total', 420, y - 18, 13, { bold: true });
  draw(currency.format(invoice.amount), 500, y - 18, 13, { bold: true });
  draw(`Status: ${invoice.status.toUpperCase()}`, 48, y - 18, 11, { bold: true });

  draw('Thank you for choosing Fenyx Finance. This PDF was generated from the admin invoice template with client and invoice data auto-filled.', 48, 84, 9, { color: rgb(0.39, 0.45, 0.55) });

  return Buffer.from(await pdfDoc.save());
}
