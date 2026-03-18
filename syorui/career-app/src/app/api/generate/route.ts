import { NextRequest, NextResponse } from "next/server";
import { readPdfText, loadToneManner } from "@/lib/pdf-reader";
import { generateDocuments } from "@/lib/claude";
import { generateResumeDocx, generateWorkHistoryDocx } from "@/lib/doc-generator";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const apiKey = formData.get("apiKey") as string;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが必要です" }, { status: 400 });
    }

    const transcript = (formData.get("transcript") as string) || "";
    const targetCompany = (formData.get("targetCompany") as string) || "";
    const targetPosition = (formData.get("targetPosition") as string) || "";

    // Read uploaded PDFs
    let existingResume = "";
    let existingCv = "";
    let photoBuffer: Buffer | null = null;

    const resumeFile = formData.get("resumeFile") as File | null;
    const cvFile = formData.get("cvFile") as File | null;
    const photoFile = formData.get("photoFile") as File | null;

    if (resumeFile && resumeFile.size > 0) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      existingResume = await readPdfText(buffer);
    }

    if (cvFile && cvFile.size > 0) {
      const buffer = Buffer.from(await cvFile.arrayBuffer());
      existingCv = await readPdfText(buffer);
    }

    if (photoFile && photoFile.size > 0) {
      photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    }

    if (!transcript && !existingResume && !existingCv) {
      return NextResponse.json(
        { error: "文字起こしテキスト、または既存書類（PDF）を入力してください" },
        { status: 400 }
      );
    }

    // Load tone & manner examples
    const { resumes: toneResumes, workHistories: toneWorkHistories } = await loadToneManner();

    // Generate with Claude
    const generated = await generateDocuments({
      transcript,
      existingResume,
      existingCv,
      toneResumes,
      toneWorkHistories,
      targetCompany,
      targetPosition,
      apiKey,
    });

    // Generate Word documents
    const resumeDocx = await generateResumeDocx(generated.resume, photoBuffer ?? undefined);
    const cvDocx = await generateWorkHistoryDocx(generated.work_history);

    // Return JSON with generated data and base64 docs
    return NextResponse.json({
      generated,
      resumeDocx: resumeDocx.toString("base64"),
      cvDocx: cvDocx.toString("base64"),
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
