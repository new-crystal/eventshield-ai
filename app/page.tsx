"use client";

import { useState } from "react";
import type { EventSecurityInput, SecurityReport } from "@/types/report";

const initialForm: EventSecurityInput = {
  serviceName: "",
  serviceUrl: "",
  personalDataItems: "",
  hasLogin: false,
  hasAdminPage: false,
  hasQrTicket: false,
  hasPayment: false,
  hasFileUpload: false,
  privacyPolicyText: "",
};

export default function Home() {
  const [form, setForm] = useState<EventSecurityInput>(initialForm);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateText = (
    key: keyof EventSecurityInput,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const analyze = async () => {
    setLoading(true);
    setReport(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "보안 리스크 분석 중 오류가 발생했습니다.");
      }

      if (!Array.isArray(data.riskItems)) {
        console.log("잘못된 API 응답:", data);
        throw new Error("AI 분석 결과 형식이 올바르지 않습니다.");
      }

      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <section className="mb-8">
          <p className="mb-2 text-sm font-semibold text-blue-600">
            EventShield AI
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            학회·행사 앱 보안 점검 AI 어시스턴트
          </h1>
          <p className="mt-3 text-slate-600">
            행사 서비스 정보를 입력하면 개인정보, 관리자 페이지, QR 입장,
            결제, 파일 업로드 리스크를 분석합니다.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">서비스 정보 입력</h2>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">행사명</span>
              <input
                className="w-full rounded-lg border p-3"
                value={form.serviceName}
                onChange={(e) => updateText("serviceName", e.target.value)}
                placeholder="예: 대한OO학회 춘계학술대회"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">서비스 URL</span>
              <input
                className="w-full rounded-lg border p-3"
                value={form.serviceUrl}
                onChange={(e) => updateText("serviceUrl", e.target.value)}
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
                onChange={(e) =>
                  updateText("personalDataItems", e.target.value)
                }
                placeholder="이름, 이메일, 휴대폰번호, 소속, 직함, 결제 여부 등"
              />
            </label>

            <div className="mb-4 space-y-2">
              {[
                ["hasLogin", "로그인 기능 있음"],
                ["hasAdminPage", "관리자 페이지 있음"],
                ["hasQrTicket", "QR 입장권 기능 있음"],
                ["hasPayment", "결제 기능 있음"],
                ["hasFileUpload", "파일 업로드 기능 있음"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form[key as keyof EventSecurityInput] as boolean}
                    onChange={(e) =>
                      updateText(
                        key as keyof EventSecurityInput,
                        e.target.checked
                      )
                    }
                  />
                  <span>{label}</span>
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
                onChange={(e) =>
                  updateText("privacyPolicyText", e.target.value)
                }
                placeholder="개인정보 수집 및 이용 동의문을 붙여넣어 주세요."
              />
            </label>

            <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              실제 참가자 명단, 비밀번호, 결제정보, 주민등록번호 등 민감정보는
              입력하지 마세요.
            </p>

            <button
              onClick={analyze}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white disabled:bg-slate-400"
            >
              {loading ? "분석 중..." : "보안 리스크 분석하기"}
            </button>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">AI 보안 리포트</h2>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

            {!report && (
              <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
                분석 결과가 여기에 표시됩니다.
              </div>
            )}

            {report && (
              <div>
                <div className="mb-5 rounded-xl bg-slate-900 p-5 text-white">
                  <p className="text-sm text-slate-300">전체 위험도</p>
                  <p className="mt-1 text-4xl font-bold">
                    {report.totalScore}점
                  </p>
                  <p className="mt-3 text-sm text-slate-200">
                    {report.summary}
                  </p>
                </div>

                <div className="space-y-4">
                  {report.riskItems?.map((item, index) => (
                    <div key={index} className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-bold">{item.category}</h3>
                        <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                          {item.riskLevel}
                        </span>
                      </div>
                      <p className="mb-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                        <b>판단 근거:</b> {item.evidence}
                      </p>
                      <p className="mb-2 text-sm text-slate-700">
                        {item.reason}
                      </p>
                      <p className="mb-2 text-sm">
                        <b>운영자 안내:</b> {item.operatorGuide}
                      </p>
                      <p className="text-sm">
                        <b>개발자 조치:</b> {item.developerAction}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-blue-50 p-4">
                  <h3 className="mb-2 font-bold">우선 조치사항</h3>
                  <ul className="list-inside list-disc text-sm">
                    {report.priorityActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}