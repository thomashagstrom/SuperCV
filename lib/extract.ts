export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type Extraction = { text: string } | { error: string };

const UNREADABLE =
  "We couldn't read that file. Paste your resume text instead.";

async function pdfText(bytes: Uint8Array) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function docxText(bytes: Uint8Array) {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return value;
}

export async function extractResumeText(
  name: string,
  bytes: Uint8Array,
): Promise<Extraction> {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return { error: "That file is larger than 5 MB. Paste your resume text instead." };
  }
  const lower = name.toLowerCase();
  const read = lower.endsWith(".pdf")
    ? pdfText
    : lower.endsWith(".docx")
      ? docxText
      : null;
  if (!read) {
    return { error: "Only PDF and DOCX files are supported. Paste your resume text instead." };
  }
  try {
    const text = (await read(bytes)).trim();
    return text ? { text } : { error: UNREADABLE };
  } catch {
    return { error: UNREADABLE };
  }
}
