import type { ReactNode } from "react";
import type { CrawlSummary, EventSecurityInput } from "@/types/report";

type SecurityInputFormProps = {
  form: EventSecurityInput;
  loading: boolean;
  crawlSummary: CrawlSummary | null;
  onChange: <K extends keyof EventSecurityInput>(
    key: K,
    value: EventSecurityInput[K]
  ) => void;
  onAnalyze: () => void;
  onCrawlHomepage: () => void;
};

type InfoRowProps = {
  label: string;
  children: ReactNode;
};

function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div>
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

function CheckStatus({ checked }: { checked: boolean }) {
  return (
    <b className={checked ? "text-blue-700" : "text-orange-600"}>
      {checked ? "확인됨" : "확인 필요"}
    </b>
  );
}

function DetectedStatus({ checked }: { checked: boolean }) {
  return (
    <b className={checked ? "text-blue-700" : "text-slate-500"}>
      {checked ? "탐지됨" : "탐지 안 됨"}
    </b>
  );
}

function getDetectedFeatures(form: EventSecurityInput) {
  return [
    form.hasLogin && "로그인",
    form.hasAdminPage && "관리자 페이지",
    form.hasQrTicket && "QR 입장권",
    form.hasPayment && "결제",
    form.hasFileUpload && "파일 업로드",
  ].filter(Boolean) as string[];
}

function TechnicalChecksPanel({
  crawlSummary,
}: {
  crawlSummary: CrawlSummary | null;
}) {
  if (!crawlSummary?.technicalChecks) return null;

  const checks = crawlSummary.technicalChecks;

  return (
    <div className="mt-4 rounded-lg bg-white p-3">
      <h4 className="mb-2 font-semibold text-slate-700">기본 기술 점검</h4>

      <ul className="space-y-1 text-sm text-slate-800">
        <li>
          HTTPS 적용:{" "}
          <b className={checks.usesHttps ? "text-blue-700" : "text-orange-600"}>
            {checks.usesHttps ? "적용됨" : "확인 필요"}
          </b>
        </li>
        <li>
          Form 개수: <b>{checks.formCount}개</b>
        </li>
        <li>
          Input/Select/Textarea 개수: <b>{checks.inputCount}개</b>
        </li>
        <li>
          개인정보 관련 문구 탐지:{" "}
          <DetectedStatus checked={checks.privacyPolicyFound} />
        </li>
      </ul>
    </div>
  );
}

function PrivacyPolicyChecklistPanel({
  crawlSummary,
}: {
  crawlSummary: CrawlSummary | null;
}) {
  if (!crawlSummary?.privacyPolicyChecklist) return null;

  const checklist = crawlSummary.privacyPolicyChecklist;

  return (
    <div className="mt-4 rounded-lg bg-white p-3">
      <h4 className="mb-2 font-semibold text-slate-700">
        개인정보 처리방침 체크리스트
      </h4>

      <ul className="space-y-1 text-sm text-slate-800">
        <li>
          수집 목적 명시: <CheckStatus checked={checklist.hasPurpose} />
        </li>
        <li>
          수집 항목 명시: <CheckStatus checked={checklist.hasCollectedItems} />
        </li>
        <li>
          보유 및 이용기간 명시:{" "}
          <CheckStatus checked={checklist.hasRetentionPeriod} />
        </li>
        <li>
          제3자 제공 문구:{" "}
          <CheckStatus checked={checklist.hasThirdPartyProvision} />
        </li>
        <li>
          위탁 처리 문구: <CheckStatus checked={checklist.hasConsignment} />
        </li>
        <li>
          문의처/책임자 문구: <CheckStatus checked={checklist.hasContact} />
        </li>
        <li>
          동의 문구: <CheckStatus checked={checklist.hasConsent} />
        </li>
      </ul>
    </div>
  );
}

function DetectionEvidencePanel({
  crawlSummary,
}: {
  crawlSummary: CrawlSummary | null;
}) {
  if (!crawlSummary?.detectionEvidence) return null;

  const { personalData, features } = crawlSummary.detectionEvidence;

  return (
    <div className="mt-4 rounded-lg bg-white p-3">
      <h4 className="mb-2 font-semibold text-slate-700">탐지 근거</h4>

      <div className="mb-3">
        <p className="mb-1 text-sm font-semibold text-slate-600">
          개인정보 항목
        </p>

        {personalData.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-800">
            {personalData.map((item) => (
              <li key={item.label}>
                <b>{item.label}</b>: {item.evidence.join(", ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">탐지된 근거 없음</p>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-slate-600">기능 탐지</p>

        {features.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-800">
            {features.map((item) => (
              <li key={item.label}>
                <b>{item.label}</b>: {item.evidence.join(", ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">탐지된 근거 없음</p>
        )}
      </div>
    </div>
  );
}

function AutoCollectedInfo({
  form,
  crawlSummary,
}: {
  form: EventSecurityInput;
  crawlSummary: CrawlSummary | null;
}) {
  const detectedFeatures = getDetectedFeatures(form);

  return (
    <div className="mb-4 rounded-xl border bg-slate-50 p-4">
      <h3 className="mb-3 font-bold text-slate-800">자동 수집된 정보</h3>

      <dl className="space-y-2 text-sm">
        <InfoRow label="서비스명">{form.serviceName || "-"}</InfoRow>

        <InfoRow label="수집 개인정보 항목">
          {form.personalDataItems || "탐지된 항목 없음"}
        </InfoRow>

        <InfoRow label="탐지된 기능">
          {detectedFeatures.length > 0
            ? detectedFeatures.join(", ")
            : "탐지된 기능 없음"}
        </InfoRow>

        <InfoRow label="개인정보 처리방침 링크">
          {form.privacyPolicyUrl ? (
            <a
              href={form.privacyPolicyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              {form.privacyPolicyUrl}
            </a>
          ) : (
            "탐지된 링크 없음"
          )}
        </InfoRow>

        <InfoRow label="개인정보 관련 문구">
          <div className="max-h-40 overflow-y-auto rounded-lg bg-white p-3 whitespace-pre-wrap">
            {form.privacyPolicyText ||
              "개인정보 처리방침을 자동으로 찾지 못했습니다. 사이트가 JavaScript로 렌더링되거나 별도 팝업으로 제공될 수 있습니다."}
          </div>
        </InfoRow>
      </dl>

      <TechnicalChecksPanel crawlSummary={crawlSummary} />
      <PrivacyPolicyChecklistPanel crawlSummary={crawlSummary} />
      <DetectionEvidencePanel crawlSummary={crawlSummary} />
    </div>
  );
}

export default function SecurityInputForm({
  form,
  loading,
  crawlSummary,
  onChange,
  onAnalyze,
  onCrawlHomepage,
}: SecurityInputFormProps) {
  const hasCollectedData = Boolean(
    form.serviceName ||
      form.personalDataItems ||
      form.hasLogin ||
      form.hasAdminPage ||
      form.hasQrTicket ||
      form.hasPayment ||
      form.hasFileUpload ||
      form.privacyPolicyText ||
      crawlSummary
  );

  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-bold">홈페이지 자동 분석</h2>

      <p className="mb-4 text-sm text-slate-600">
        분석할 학회·행사 홈페이지 URL을 입력하면 공개 페이지에서 개인정보 수집
        항목과 주요 기능을 자동으로 추출합니다.
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">서비스 URL</span>
        <input
          className="w-full rounded-lg border p-3"
          value={form.serviceUrl}
          onChange={(e) => onChange("serviceUrl", e.target.value)}
          placeholder="https://example.com"
        />
      </label>

      <button
        type="button"
        onClick={onCrawlHomepage}
        disabled={loading || !form.serviceUrl.trim()}
        className="mb-4 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-700 disabled:bg-slate-100 disabled:text-slate-400"
      >
        {loading ? "홈페이지 수집 중..." : "홈페이지에서 자동 수집하기"}
      </button>

      {hasCollectedData && (
        <AutoCollectedInfo form={form} crawlSummary={crawlSummary} />
      )}

      <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
        EventShield AI는 공개 페이지에서 확인 가능한 정보만 수집합니다. 로그인
        우회, 숨겨진 관리자 경로 탐색, 공격성 스캔은 수행하지 않습니다.
      </p>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={loading || !form.serviceUrl.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white disabled:bg-slate-400"
      >
        {loading ? "분석 중..." : "보안 리스크 분석하기"}
      </button>
    </section>
  );
}