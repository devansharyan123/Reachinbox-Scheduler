const EMAIL_REGEX =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/g;

export interface ParsedEmails {
  emails: string[];
  detectedCount: number;
  duplicateCount: number;
}

export const extractEmails = (
  files: Express.Multer.File[]
): ParsedEmails => {
  const uniqueEmails = new Set<string>();
  let detectedCount = 0;

  for (const file of files) {
    const content = file.buffer
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const matches = content.match(EMAIL_REGEX) ?? [];

    detectedCount += matches.length;

    for (const email of matches) {
      uniqueEmails.add(email.toLowerCase().trim());
    }
  }

  return {
    emails: [...uniqueEmails],
    detectedCount,
    duplicateCount: detectedCount - uniqueEmails.size,
  };
};