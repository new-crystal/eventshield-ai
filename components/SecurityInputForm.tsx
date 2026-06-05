import type { EventSecurityInput } from "@/types/report";

type SecurityInputFormProps = {
  form: EventSecurityInput;
  loading: boolean;
  onChange: <K extends keyof EventSecurityInput>(
    key: K,
    value: EventSecurityInput[K]
  ) => void;
  onAnalyze: () => void;
  onCrawlHomepage: () => void;
};

export default function SecurityInputForm({
  form,
  loading,
  onChange,
  onAnalyze,
  onCrawlHomepage,
}: SecurityInputFormProps) {
  const hasCollectedData =
    form.serviceName ||
    form.personalDataItems ||
    form.hasLogin ||
    form.hasAdminPage ||
    form.hasQrTicket ||
    form.hasPayment ||
    form.hasFileUpload ||
    form.privacyPolicyText;

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
        <div className="mb-4 rounded-xl border bg-slate-50 p-4">
          <h3 className="mb-3 font-bold text-slate-800">자동 수집된 정보</h3>

          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-semibold text-slate-600">서비스명</dt>
              <dd className="text-slate-800">{form.serviceName || "-"}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-600">
                수집 개인정보 항목
              </dt>
              <dd className="text-slate-800">
                {form.personalDataItems || "탐지된 항목 없음"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-600">탐지된 기능</dt>
              <dd className="text-slate-800">
                {[
                  form.hasLogin && "로그인",
                  form.hasAdminPage && "관리자 페이지",
                  form.hasQrTicket && "QR 입장권",
                  form.hasPayment && "결제",
                  form.hasFileUpload && "파일 업로드",
                ]
                  .filter(Boolean)
                  .join(", ") || "탐지된 기능 없음"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-600">
                개인정보 관련 문구
              </dt>
              <dd className="text-slate-800">
                {form.privacyPolicyText || "탐지된 문구 없음"}
              </dd>
            </div>
          </dl>
        </div>
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