import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { EventSecurityInput, SecurityReport } from "@/types/report";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RiskItemSchema = z.object({
  category: z.enum([
    "개인정보 수집",
    "개인정보 동의문",
    "인증/로그인",
    "관리자 페이지",
    "QR 입장권",
    "결제",
    "파일 업로드",
    "운영 보안",
  ]),
  riskLevel: z.enum(["낮음", "보통", "높음"]),
  evidence: z.string(),
  reason: z.string(),
  operatorGuide: z.string(),
  developerAction: z.string(),
});

const SecurityReportSchema = z.object({
  totalScore: z.number().int().min(0).max(100),
  summary: z.string(),
  riskItems: z.array(RiskItemSchema),
  priorityActions: z.array(z.string()),
});

function maskSensitiveText(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/01[016789]-?\d{3,4}-?\d{4}/g, "[phone]")
    .replace(/\d{6}-?\d{7}/g, "[resident_registration_number]")
    .replace(/\d{3,4}-?\d{4}-?\d{4}-?\d{4}/g, "[card_number]");
}

function sanitizeInput(input: EventSecurityInput): EventSecurityInput {
  return {
    ...input,
    serviceName: maskSensitiveText(input.serviceName || ""),
    serviceUrl: input.serviceUrl || "",
    personalDataItems: maskSensitiveText(input.personalDataItems || ""),
    privacyPolicyText: maskSensitiveText(input.privacyPolicyText || ""),
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "OPENAI_API_KEY가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as EventSecurityInput;
    const safeInput = sanitizeInput(body);

    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: `
너는 EventShield AI의 보안 분석 엔진이다.
학회·행사 앱/웹사이트의 개인정보, 인증, 관리자 페이지, QR 입장권, 결제, 파일 업로드 리스크를 점검한다.

중요 규칙:
- 반드시 한국어로 작성한다.
- 사용자가 입력한 정보만 사실로 사용한다.
- 입력에 없는 내용은 단정하지 않는다.
- 확인되지 않은 내용은 "확인 필요"라고 표현한다.
- "신용카드 정보 수집", "외부 협력사 제공", "민감정보 수집"은 입력에 명시되어 있을 때만 작성한다.
- 결제 기능이 있다고 해서 카드번호를 직접 저장한다고 단정하지 않는다.
- 파일 업로드 기능이 있다고 해서 악성코드가 실제 업로드되었다고 단정하지 않는다.
- 관리자 페이지가 있다고 해서 이미 노출되었다고 단정하지 않는다.
- 실제 공격 방법, 침투 절차, 악용 방법은 제공하지 않는다.
- 보안 인증이나 완전한 안전 보장을 한 것처럼 표현하지 않는다.
- riskItems는 3개 이상 6개 이하로 작성한다.
- priorityActions는 자연스러운 한국어 문장으로 작성한다.
- 영어 변수명, 코드명, "비밀번호_POLICY" 같은 혼합 표현을 쓰지 않는다.
- 각 riskItem의 evidence에는 판단 근거가 된 입력값을 짧게 적는다.
- totalScore는 위험도가 높을수록 높은 점수로 산정한다.
`.trim(),
        },
        {
          role: "user",
          content: `
다음은 사용자가 입력한 행사/학회 서비스 정보다.
아래 정보에 근거해서만 보안 리스크를 분석해줘.

[서비스 기본 정보]
서비스명: ${safeInput.serviceName || "입력 없음"}
서비스 URL: ${safeInput.serviceUrl || "입력 없음"}

[수집 개인정보 항목]
${safeInput.personalDataItems || "입력 없음"}

[기능 여부]
로그인 기능: ${safeInput.hasLogin ? "있음" : "없음"}
관리자 페이지: ${safeInput.hasAdminPage ? "있음" : "없음"}
QR 입장권 기능: ${safeInput.hasQrTicket ? "있음" : "없음"}
결제 기능: ${safeInput.hasPayment ? "있음" : "없음"}
파일 업로드 기능: ${safeInput.hasFileUpload ? "있음" : "없음"}

[개인정보 수집 동의문]
${safeInput.privacyPolicyText || "입력 없음"}

분석 시 주의:
- 개인정보 항목에 카드번호, 주민등록번호, 여권번호, 건강정보 등이 없으면 민감정보 수집이라고 단정하지 마.
- 결제 기능이 있어도 PG사를 통한 결제일 수 있으므로 카드정보 직접 저장이라고 단정하지 마.
- 개인정보 동의문이 비어 있으면 "동의문 확인 필요"로 판단해.
- 외부 제공/위탁 문구가 없으면 협력사 공유 리스크를 단정하지 마.
`.trim(),
        },
      ],
      text: {
        format: zodTextFormat(SecurityReportSchema, "security_report"),
      },
    });

    const report = response.output_parsed as SecurityReport | null;

    if (!report) {
      return NextResponse.json(
        { message: "AI 분석 결과를 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(report);
   } catch (error) {
    console.error("ANALYZE_API_ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 서버 오류가 발생했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
