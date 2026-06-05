import type { EventSecurityInput } from "@/types/report";

type SecurityInputFormProps = {
  form: EventSecurityInput;
  loading: boolean;
  onChange: <K extends keyof EventSecurityInput>(
    key: K,
    value: EventSecurityInput[K]
  ) => void;
  onAnalyze: () => void;
};

type BooleanField =
  | "hasLogin"
  | "hasAdminPage"
  | "hasQrTicket"
  | "hasPayment"
  | "hasFileUpload";

const checkboxItems: {
  key: BooleanField;
  label: string;
}[] = [
  { key: "hasLogin", label: "로그인 기능 있음" },
  { key: "hasAdminPage", label: "관리자 페이지 있음" },
  { key: "hasQrTicket", label: "QR 입장권 기능 있음" },
  { key: "hasPayment", label: "결제 기능 있음" },
  { key: "hasFileUpload", label: "파일 업로드 기능 있음" },
];

export default function SecurityInputForm({
  form,
  loading,
  onChange,
  onAnalyze,
}: SecurityInputFormProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-bold">서비스 정보 입력</h2>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">행사명</span>
        <input
          className="w-full rounded-lg border p-3"
          value={form.serviceName}
          onChange={(e) => onChange("serviceName", e.target.value)}
          placeholder="예: 대한OO학회 춘계학술대회"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">서비스 URL</span>
        <input
          className="w-full rounded-lg border p-3"
          value={form.serviceUrl}
          onChange={(e) => onChange("serviceUrl", e.target.value)}
          placeholder="https://example.com"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">
          수집 개인정보 항목
        </span>
        <textarea
          className="h-24 w-full rounded-lg border p-3"
          value={form.personalDataItems}
          onChange={(e) => onChange("personalDataItems", e.target.value)}
          placeholder="이름, 이메일, 휴대폰번호, 소속, 직함, 결제 여부 등"
        />
      </label>

      <div className="mb-4 space-y-2">
        {checkboxItems.map((item) => (
          <label key={item.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(form[item.key])}
              onChange={(e) => onChange(item.key, e.target.checked)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">
          개인정보 수집 동의문
        </span>
        <textarea
          className="h-28 w-full rounded-lg border p-3"
          value={form.privacyPolicyText}
          onChange={(e) => onChange("privacyPolicyText", e.target.value)}
          placeholder="개인정보 수집 및 이용 동의문을 붙여넣어 주세요."
        />
      </label>

      <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
        실제 참가자 명단, 비밀번호, 결제정보, 주민등록번호 등 민감정보는
        입력하지 마세요.
      </p>

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white disabled:bg-slate-400"
      >
        {loading ? "분석 중..." : "보안 리스크 분석하기"}
      </button>
    </section>
  );
}