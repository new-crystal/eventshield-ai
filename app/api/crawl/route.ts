import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

function normalizeUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }

  return url;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { message: "URL을 입력해 주세요." },
        { status: 400 }
      );
    }

    const targetUrl = normalizeUrl(url);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "EventShieldAI/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "홈페이지 정보를 가져오지 못했습니다." },
        { status: 500 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("title").text().trim();

    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    const inputNames: string[] = [];

    $("input, textarea, select").each((_, el) => {
      const name = $(el).attr("name") || "";
      const id = $(el).attr("id") || "";
      const placeholder = $(el).attr("placeholder") || "";
      const type = $(el).attr("type") || "";
      const label = `${name} ${id} ${placeholder} ${type}`.trim();

      if (label) {
        inputNames.push(label);
      }
    });

    const inputText = inputNames.join(" ").toLowerCase();

    const detectedPersonalData: string[] = [];

    const personalDataRules = [
      { label: "이름", keywords: ["name", "first_name", "last_name", "성명", "이름"] },
      { label: "이메일", keywords: ["email", "e-mail", "메일"] },
      { label: "휴대폰번호", keywords: ["phone", "mobile", "tel", "전화", "연락처"] },
      { label: "소속", keywords: ["affiliation", "organization", "institution", "소속"] },
      { label: "부서", keywords: ["department", "부서"] },
      { label: "직함/직군", keywords: ["position", "title", "occupation", "직함", "직군"] },
      { label: "국가", keywords: ["country", "nation", "국가"] },
      { label: "생년월일", keywords: ["birth", "birthday", "date_of_birth", "생년월일"] },
      { label: "면허번호", keywords: ["license", "licence", "면허"] },
      { label: "여권번호", keywords: ["passport", "여권"] },
    ];

    personalDataRules.forEach((rule) => {
      if (includesAny(inputText, rule.keywords) || includesAny(bodyText, rule.keywords)) {
        detectedPersonalData.push(rule.label);
      }
    });

    const hasLogin = includesAny(bodyText + inputText, [
      "login",
      "sign in",
      "로그인",
      "password",
      "비밀번호",
    ]);

    const hasAdminPage = includesAny(bodyText, [
      "admin",
      "administrator",
      "관리자",
    ]);

    const hasQrTicket = includesAny(bodyText, [
      "qr",
      "qrcode",
      "입장권",
      "check-in",
      "checkin",
      "출석",
    ]);

    const hasPayment = includesAny(bodyText + inputText, [
      "payment",
      "pay",
      "card",
      "결제",
      "등록비",
      "fee",
      "bank transfer",
      "credit card",
    ]);

    const hasFileUpload = $("input[type='file']").length > 0;

    let privacyPolicyText = "";

    const privacyLink = $("a")
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr("href")?.toLowerCase() || "";

        return (
          text.includes("privacy") ||
          text.includes("개인정보") ||
          href.includes("privacy")
        );
      })
      .first();

    if (privacyLink.length > 0) {
      privacyPolicyText = `개인정보 처리방침 또는 개인정보 관련 링크가 발견되었습니다: ${
        privacyLink.text().trim() || privacyLink.attr("href")
      }`;
    }

    return NextResponse.json({
      serviceName: title || "",
      serviceUrl: targetUrl,
      personalDataItems:
        detectedPersonalData.length > 0
          ? detectedPersonalData.join(", ")
          : "",
      hasLogin,
      hasAdminPage,
      hasQrTicket,
      hasPayment,
      hasFileUpload,
      privacyPolicyText,
      crawlSummary: {
        title,
        inputCount: inputNames.length,
        detectedFields: inputNames.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("CRAWL_API_ERROR:", error);

    return NextResponse.json(
      { message: "홈페이지 자동 수집 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}