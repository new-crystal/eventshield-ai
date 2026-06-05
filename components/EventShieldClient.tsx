"use client";

import { useState } from "react";
import type { EventSecurityInput, SecurityReport } from "@/types/report";
import HeroSection from "@/components/HeroSection";
import SecurityInputForm from "@/components/SecurityInputForm";
import ReportResult from "@/components/ReportResult";

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

export default function EventShieldClient() {
  const [form, setForm] = useState<EventSecurityInput>(initialForm);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = <K extends keyof EventSecurityInput>(
    key: K,
    value: EventSecurityInput[K]
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
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <HeroSection />

        <div className="grid gap-6 md:grid-cols-2">
          <SecurityInputForm
            form={form}
            loading={loading}
            onChange={updateForm}
            onAnalyze={analyze}
          />

          <ReportResult report={report} error={error} />
        </div>
      </div>
    </main>
  );
}