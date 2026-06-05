export type EventSecurityInput = {
  serviceName: string;
  serviceUrl: string;
  personalDataItems: string;
  hasLogin: boolean;
  hasAdminPage: boolean;
  hasQrTicket: boolean;
  hasPayment: boolean;
  hasFileUpload: boolean;
  privacyPolicyText: string;
  privacyPolicyUrl?: string;
};

export type RiskItem = {
  category:
    | "개인정보 수집"
    | "개인정보 동의문"
    | "인증/로그인"
    | "관리자 페이지"
    | "QR 입장권"
    | "결제"
    | "파일 업로드"
    | "운영 보안";

  riskLevel: "낮음" | "보통" | "높음";
  evidence: string;
  reason: string;
  operatorGuide: string;
  developerAction: string;
};

export type SecurityReport = {
  totalScore: number;
  summary: string;
  riskItems: RiskItem[];
  priorityActions: string[];
};

export type PrivacyPolicyChecklist = {
  hasPurpose: boolean;
  hasCollectedItems: boolean;
  hasRetentionPeriod: boolean;
  hasThirdPartyProvision: boolean;
  hasConsignment: boolean;
  hasContact: boolean;
  hasConsent: boolean;
};

export type TechnicalChecks = {
  usesHttps: boolean;
  formCount: number;
  inputCount: number;
  privacyPolicyFound: boolean;
  privacyPolicyUrl: string;
};

export type DetectionEvidence = {
  label: string;
  evidence: string[];
};

export type CrawlSummary = {
  title: string;
  detectedFields: string[];
  privacyPolicyChecklist: PrivacyPolicyChecklist;
  technicalChecks: TechnicalChecks;
  detectionEvidence: {
    personalData: DetectionEvidence[];
    features: DetectionEvidence[];
  };
};