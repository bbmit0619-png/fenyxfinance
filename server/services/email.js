import nodemailer from 'nodemailer';

function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendInvoiceEmail({ client, invoice, pdfBuffer }) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.MAIL_FROM ?? 'Fenyx Finance <billing@fenyxfinance.local>',
    to: client.email,
    subject: `Invoice ${invoice.invoiceNumber} from Fenyx Finance`,
    html: `
      <p>Hello ${client.name},</p>
      <p>Your invoice <strong>${invoice.invoiceNumber}</strong> for <strong>$${Number(invoice.amount).toFixed(2)}</strong> is attached as a PDF.</p>
      <p>This email includes the actual PDF file as an application/pdf attachment; no hosted download link is used.</p>
    `,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
