import fs from "fs";
import path from "path";

export async function readPdfText(fileBuffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(fileBuffer);
  return data.text || "";
}

export async function loadToneManner(): Promise<{ resumes: string[]; workHistories: string[] }> {
  const tonePath = path.join(process.cwd(), "..", "tone&manner");
  const resumes: string[] = [];
  const workHistories: string[] = [];

  if (!fs.existsSync(tonePath)) return { resumes, workHistories };

  const files = fs.readdirSync(tonePath).filter((f) => f.endsWith(".pdf"));

  for (const file of files) {
    const filePath = path.join(tonePath, file);
    const buffer = fs.readFileSync(filePath);
    const text = await readPdfText(buffer);

    if (file.includes("職務経歴書")) {
      workHistories.push(`【参考例: ${file}】\n${text}`);
    } else if (file.includes("履歴書")) {
      resumes.push(`【参考例: ${file}】\n${text}`);
    }
  }

  return { resumes, workHistories };
}
