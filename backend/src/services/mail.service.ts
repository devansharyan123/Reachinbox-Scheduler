import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

export const sendEmail = async ({
  from,
  to,
  subject,
  text,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) => {
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
};