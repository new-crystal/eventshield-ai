import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}

function isBlockedHostname(hostname: string) {
  const lowerHostname = hostname.toLowerCase();

  if (
    lowerHostname === "localhost" ||
    lowerHostname === "127.0.0.1" ||
    lowerHostname === "::1"
  ) {
    return true;
  }

  if (
    lowerHostname.startsWith("10.") ||
    lowerHostname.startsWith("192.168.") ||
    lowerHostname.startsWith("172.16.") ||
    lowerHostname.startsWith("172.17.") ||
    lowerHostname.startsWith("172.18.") ||
    lowerHostname.startsWith("172.19.") ||
    lowerHostname.startsWith("172.20.") ||
    lowerHostname.startsWith("172.21.") ||
    lowerHostname.startsWith("172.22.") ||
    lowerHostname.startsWith("172.23.") ||
    lowerHostname.startsWith("172.24.") ||
    lowerHostname.startsWith("172.25.") ||
    lowerHostname.startsWith("172.26.") ||
    lowerHostname.startsWith("172.27.") ||
    lowerHostname.startsWith("172.28.") ||
    lowerHostname.startsWith("172.29.") ||
    lowerHostname.startsWith("172.30.") ||
    lowerHostname.startsWith("172.31.")
  ) {
    return true;
  }

  return false;
}

function validateUrl(url: string) {
  const parsedUrl = new URL(url);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("http 또는 https URL만 입력할 수 있습니다.");
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new Error("공개 홈페이지 URL만 분석할 수 있습니다.");
  }

  return parsedUrl.toString();
}

function resolveUrl(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function includesAny(text: string, keywords: string[]) {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "EventShieldAI/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`페이지 요청 실패: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType && !contentType.includes("text/html")) {
    throw new Error("HTML 페이지가 아닙니다.");
  }

  return response.text();
}

function extractReadableText(html: string) {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg").remove();

  return $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

function findPrivacyPolicyLink($: CheerioAPI, baseUrl: string) {
  const privacyKeywords = [
    "개인정보처리방침",
    "개인정보 처리방침",
    "개인정보 보호정책",
    "개인정보보호정책",
    "개인정보",
    "privacy policy",
    "privacy",
    "personal information",
    "policy/privacy",
    "privacy_policy",
    "privacy-policy",
  ];

  const candidates: {
    text: string;
    href: string;
    url: string;
    score: number;
  }[] = [];

  $("a").each((_, el) => {
    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).attr("href") || "";

    if (!href) return;
    if (href.startsWith("#")) return;
    if (href.startsWith("javascript:")) return;
    if (href.startsWith("mailto:")) return;
    if (href.startsWith("tel:")) return;

    const absoluteUrl = resolveUrl(baseUrl, href);
    if (!absoluteUrl) return;

    const targetText = `${linkText} ${href} ${absoluteUrl}`.toLowerCase();

    let score = 0;

    privacyKeywords.forEach((keyword) => {
      if (targetText.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });

    if (targetText.includes("개인정보")) score += 20;
    if (targetText.includes("privacy")) score += 20;
    if (targetText.includes("policy")) score += 5;

    if (score > 0) {
      candidates.push({
        text: linkText || href,
        href,
        url: absoluteUrl,
        score,
      });
    }
  });

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];

  return {
    text: best?.text || "",
    url: best?.url || "",
    candidates,
  };
}

async function findPrivacyPolicyByCommonPaths(baseUrl: string) {
  const origin = new URL(baseUrl).origin;

  const commonPaths = [
    "/main/signup.php",
    "/signup.php",
    "/signup",
    "/join.php",
    "/join",
    "/member/signup.php",
    "/member/join.php",

    "/privacy",
    "/privacy.html",
    "/privacy.php",
    "/privacy_policy",
    "/privacy_policy.php",
    "/privacy-policy",
    "/policy/privacy",
    "/policy/privacy.php",
    "/member/privacy",
    "/member/privacy.php",
    "/terms/privacy",
    "/terms/privacy.php",
    "/etc/privacy",
    "/etc/privacy.php",
    "/ko/privacy",
    "/ko/privacy.php",
  ];

  for (const path of commonPaths) {
    const url = `${origin}${path}`;

    try {
      const html = await fetchHtml(url);
      const text = extractReadableText(html);
      const privacySection = extractPrivacySectionFromText(text);

      if (privacySection) {
        return {
          url,
          text: privacySection,
        };
      }

      if (text.includes("개인정보") || text.toLowerCase().includes("privacy")) {
        return {
          url,
          text: text.slice(0, 4000),
        };
      }
    } catch {
      // 해당 경로가 없으면 다음 경로 계속 확인
    }
  }

  return {
    url: "",
    text: "",
  };
}

async function findPrivacyTextFromRelatedLinks($: CheerioAPI, baseUrl: string) {
  const relatedKeywords = [
    "sign up",
    "signup",
    "join",
    "register",
    "registration",
    "pre-registration",
    "회원가입",
    "가입",
    "등록",
    "사전등록",
  ];

  const candidates: string[] = [];

  $("a").each((_, el) => {
    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).attr("href") || "";

    if (!href) return;
    if (href.startsWith("#")) return;
    if (href.startsWith("javascript:")) return;
    if (href.startsWith("mailto:")) return;
    if (href.startsWith("tel:")) return;

    const targetText = `${linkText} ${href}`.toLowerCase();

    if (relatedKeywords.some((keyword) => targetText.includes(keyword))) {
      const absoluteUrl = resolveUrl(baseUrl, href);

      if (absoluteUrl) {
        candidates.push(absoluteUrl);
      }
    }
  });

  const uniqueCandidates = Array.from(new Set(candidates)).slice(0, 10);

  for (const url of uniqueCandidates) {
    try {
      const html = await fetchHtml(url);
      const text = extractReadableText(html);
      const privacySection = extractPrivacySectionFromText(text);

      if (privacySection) {
        return {
          url,
          text: privacySection,
        };
      }
    } catch {
      // 실패하면 다음 후보 확인
    }
  }

  return {
    url: "",
    text: "",
  };
}

function extractInlinePrivacyText($: CheerioAPI) {
  const texts: string[] = [];

  $("body *").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();

    if (!text) return;
    if (text.length < 30) return;
    if (text.length > 2000) return;

    const lowerText = text.toLowerCase();

    const isPrivacyText =
      text.includes("개인정보") ||
      lowerText.includes("privacy") ||
      lowerText.includes("personal information");

    const hasPolicyWords =
      text.includes("수집") ||
      text.includes("이용") ||
      text.includes("보유") ||
      text.includes("처리") ||
      text.includes("동의") ||
      lowerText.includes("collect") ||
      lowerText.includes("process");

    if (isPrivacyText && hasPolicyWords) {
      texts.push(text);
    }
  });

  return Array.from(new Set(texts)).slice(0, 5).join("\n\n").slice(0, 4000);
}

function getMatchedKeywords(text: string, keywords: string[]) {
  const lowerText = text.toLowerCase();

  return Array.from(
    new Set(
      keywords.filter((keyword) =>
        lowerText.includes(keyword.toLowerCase())
      )
    )
  );
}

function analyzePrivacyPolicyText(text: string) {
  const targetText = text || "";

  return {
    hasPurpose: includesAny(targetText, [
      "목적",
      "이용 목적",
      "수집 목적",
      "purpose",
    ]),
    hasCollectedItems: includesAny(targetText, [
      "수집 항목",
      "수집하는 개인정보",
      "항목",
      "personal information",
      "collected items",
    ]),
    hasRetentionPeriod: includesAny(targetText, [
      "보유",
      "이용기간",
      "보관",
      "파기",
      "retention",
      "destroy",
    ]),
    hasThirdPartyProvision: includesAny(targetText, [
      "제3자",
      "제 3자",
      "third party",
      "제공",
    ]),
    hasConsignment: includesAny(targetText, [
      "위탁",
      "처리위탁",
      "수탁",
      "consignment",
      "entrust",
    ]),
    hasContact: includesAny(targetText, [
      "책임자",
      "담당자",
      "문의",
      "연락처",
      "contact",
      "email",
    ]),
    hasConsent: includesAny(targetText, [
      "동의",
      "consent",
      "agree",
    ]),
  };
}

function detectPersonalDataWithEvidence(inputText: string, pageText: string) {
  const rules = [
    {
      label: "이름",
      keywords: ["name", "first_name", "last_name", "성명", "이름"],
    },
    {
      label: "이메일",
      keywords: ["email", "e-mail", "메일"],
    },
    {
      label: "휴대폰번호",
      keywords: ["phone", "mobile", "tel", "전화", "연락처"],
    },
    {
      label: "소속",
      keywords: ["affiliation", "organization", "institution", "소속"],
    },
    {
      label: "부서",
      keywords: ["department", "부서"],
    },
    {
      label: "직함/직군",
      keywords: ["position", "title", "occupation", "직함", "직군", "직책"],
    },
    {
      label: "국가",
      keywords: ["country", "nation", "국가"],
    },
    {
      label: "생년월일",
      keywords: ["birth", "birthday", "date_of_birth", "생년월일"],
    },
    {
      label: "면허번호",
      keywords: ["license", "licence", "면허"],
    },
    {
      label: "여권번호",
      keywords: ["passport", "여권"],
    },
  ];

  const items: string[] = [];
  const evidence: { label: string; evidence: string[] }[] = [];

  rules.forEach((rule) => {
    const inputMatches = getMatchedKeywords(inputText, rule.keywords);
    const pageMatches = getMatchedKeywords(pageText, rule.keywords);

    const mergedMatches = Array.from(new Set([...inputMatches, ...pageMatches]));

    if (mergedMatches.length > 0) {
      items.push(rule.label);

      evidence.push({
        label: rule.label,
        evidence: mergedMatches.map((keyword) => `"${keyword}" 키워드 발견`),
      });
    }
  });

  return {
    items: Array.from(new Set(items)),
    evidence,
  };
}

function extractPrivacySectionFromText(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  const startKeywords = [
    "개인정보 수집 및 이용에 대한 동의 안내",
    "개인정보 취급 방침",
    "개인정보 처리방침",
    "개인정보의 수집",
    "개인정보 수집",
    "Privacy Policy",
    "Personal Information",
  ];

  let startIndex = -1;

  for (const keyword of startKeywords) {
    const index = normalizedText
      .toLowerCase()
      .indexOf(keyword.toLowerCase());

    if (index !== -1) {
      startIndex = index;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  return normalizedText.slice(startIndex, startIndex + 4000);
}

function detectPersonalDataItems(inputText: string, pageText: string) {
  const detectedPersonalData: string[] = [];

  const personalDataRules = [
    {
      label: "이름",
      keywords: ["name", "first_name", "last_name", "성명", "이름"],
    },
    {
      label: "이메일",
      keywords: ["email", "e-mail", "메일"],
    },
    {
      label: "휴대폰번호",
      keywords: ["phone", "mobile", "tel", "전화", "연락처"],
    },
    {
      label: "소속",
      keywords: ["affiliation", "organization", "institution", "소속"],
    },
    {
      label: "부서",
      keywords: ["department", "부서"],
    },
    {
      label: "직함/직군",
      keywords: ["position", "title", "occupation", "직함", "직군", "직책"],
    },
    {
      label: "국가",
      keywords: ["country", "nation", "국가"],
    },
    {
      label: "생년월일",
      keywords: ["birth", "birthday", "date_of_birth", "생년월일"],
    },
    {
      label: "면허번호",
      keywords: ["license", "licence", "면허"],
    },
    {
      label: "여권번호",
      keywords: ["passport", "여권"],
    },
  ];

  personalDataRules.forEach((rule) => {
    if (includesAny(inputText, rule.keywords) || includesAny(pageText, rule.keywords)) {
      detectedPersonalData.push(rule.label);
    }
  });

  return Array.from(new Set(detectedPersonalData));
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

    const normalizedUrl = normalizeUrl(url);
    const targetUrl = validateUrl(normalizedUrl);

    const html = await fetchHtml(targetUrl);
    const $ = cheerio.load(html);

    $("script, style, noscript, svg").remove();

    const title = $("title").text().replace(/\s+/g, " ").trim();

    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const inputNames: string[] = [];

    $("input, textarea, select").each((_, el) => {
      const name = $(el).attr("name") || "";
      const id = $(el).attr("id") || "";
      const placeholder = $(el).attr("placeholder") || "";
      const type = $(el).attr("type") || "";
      const ariaLabel = $(el).attr("aria-label") || "";
      const parentText = $(el)
        .closest("label, div, li, tr, p")
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);

      const fieldText =
        `${name} ${id} ${placeholder} ${type} ${ariaLabel} ${parentText}`.trim();

      if (fieldText) {
        inputNames.push(fieldText);
      }
    });

    const linkTexts: string[] = [];

    $("a").each((_, el) => {
      const linkText = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") || "";

      if (linkText || href) {
        linkTexts.push(`${linkText} ${href}`.trim());
      }
    });

    const inputText = inputNames.join(" ");
    const linkText = linkTexts.join(" ");
    const pageSearchText = `${bodyText} ${inputText} ${linkText}`;

    const personalDataDetection = detectPersonalDataWithEvidence(
        inputText,
        pageSearchText
    );

    const detectedPersonalData = personalDataDetection.items;

   const loginKeywords = ["login", "sign in", "로그인", "password", "비밀번호"];
    const adminKeywords = ["admin", "administrator", "관리자"];
    const qrKeywords = ["qr", "qrcode", "입장권", "check-in", "checkin", "출석"];
    const paymentKeywords = [
    "payment",
    "pay",
    "card",
    "결제",
    "등록비",
    "fee",
    "bank transfer",
    "credit card",
    ];

    const loginEvidence = getMatchedKeywords(pageSearchText, loginKeywords);
    const adminEvidence = getMatchedKeywords(pageSearchText, adminKeywords);
    const qrEvidence = getMatchedKeywords(pageSearchText, qrKeywords);
    const paymentEvidence = getMatchedKeywords(pageSearchText, paymentKeywords);

    const fileInputCount = $("input[type='file']").length;

    const hasLogin = loginEvidence.length > 0;
    const hasAdminPage = adminEvidence.length > 0;
    const hasQrTicket = qrEvidence.length > 0;
    const hasPayment = paymentEvidence.length > 0;
    const hasFileUpload = fileInputCount > 0;

    const featureEvidence = [
    hasLogin && {
        label: "로그인",
        evidence: loginEvidence.map((keyword) => `"${keyword}" 키워드 발견`),
    },
    hasAdminPage && {
        label: "관리자 페이지",
        evidence: adminEvidence.map((keyword) => `"${keyword}" 키워드 발견`),
    },
    hasQrTicket && {
        label: "QR 입장권",
        evidence: qrEvidence.map((keyword) => `"${keyword}" 키워드 발견`),
    },
    hasPayment && {
        label: "결제",
        evidence: paymentEvidence.map((keyword) => `"${keyword}" 키워드 발견`),
    },
    hasFileUpload && {
        label: "파일 업로드",
        evidence: [`input[type="file"] ${fileInputCount}개 발견`],
    },
    ].filter(Boolean) as { label: string; evidence: string[] }[];

    const privacyLink = findPrivacyPolicyLink($, targetUrl);

    let privacyPolicyText = "";
    let privacyPolicyUrl = "";

    // 1차: a 태그에서 개인정보 처리방침 링크 찾기
    if (privacyLink.url) {
      privacyPolicyUrl = privacyLink.url;

      try {
        const privacyHtml = await fetchHtml(privacyLink.url);
        const fullPrivacyText = extractReadableText(privacyHtml);

        privacyPolicyText = fullPrivacyText.slice(0, 4000);
      } catch {
        privacyPolicyText = `개인정보 처리방침 링크는 발견했지만 내용을 가져오지 못했습니다. 링크: ${privacyLink.url}`;
      }
    }

   // 2차: 메인 페이지 본문 안에 개인정보 관련 문구가 직접 있는지 확인
    if (!privacyPolicyText) {
    const inlinePrivacyText =
        extractPrivacySectionFromText(bodyText) || extractInlinePrivacyText($);

    if (inlinePrivacyText) {
        privacyPolicyText = inlinePrivacyText;
    }
    }

    // 3차: Sign up, Register, Join 같은 관련 링크를 따라가서 개인정보 문구 확인
    if (!privacyPolicyText) {
    const relatedPagePrivacy = await findPrivacyTextFromRelatedLinks($, targetUrl);

    if (relatedPagePrivacy.text) {
        privacyPolicyUrl = relatedPagePrivacy.url;
        privacyPolicyText = relatedPagePrivacy.text;
    }
    }

    // 4차: 흔한 개인정보 처리방침/회원가입 경로 자동 시도
    if (!privacyPolicyText) {
    const commonPathPrivacy = await findPrivacyPolicyByCommonPaths(targetUrl);

    if (commonPathPrivacy.text) {
        privacyPolicyUrl = commonPathPrivacy.url;
        privacyPolicyText = commonPathPrivacy.text;
    }
    }

    const privacyPolicyChecklist = analyzePrivacyPolicyText(privacyPolicyText);

    const technicalChecks = {
        usesHttps: new URL(targetUrl).protocol === "https:",
        formCount: $("form").length,
        inputCount: inputNames.length,
        privacyPolicyFound: Boolean(privacyPolicyText),
        privacyPolicyUrl,
    };

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
      privacyPolicyUrl,
      privacyPolicyText,
      crawlSummary: {
        title,
        detectedFields: inputNames.slice(0, 30),
        privacyPolicyChecklist,
        technicalChecks,
        detectionEvidence: {
            personalData: personalDataDetection.evidence,
            features: featureEvidence,
            },
        },
    });
  } catch (error) {
    console.error("CRAWL_API_ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "홈페이지 자동 수집 중 오류가 발생했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}