import type { SecurityReport } from "@/types/report";
import RiskItemCard from "@/components/RiskItemCard";

type ReportResultProps = {
  report: SecurityReport | null;
  error: string | null;
};

export default function ReportResult({ report, error }: ReportResultProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-bold">AI 보안 리포트</h2>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!report && !error && (
        <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
          분석 결과가 여기에 표시됩니다.
        </div>
      )}

      {report && (
        <div>
          <div className="mb-5 rounded-xl bg-slate-900 p-5 text-white">
            <p className="text-sm text-slate-300">전체 위험도</p>
            <p className="mt-1 text-4xl font-bold">{report.totalScore}점</p>
            <p className="mt-3 text-sm text-slate-200">{report.summary}</p>
          </div>

          <div className="space-y-4">
            {report.riskItems.map((item, index) => (
              <RiskItemCard key={`${item.category}-${index}`} item={item} />
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
  );
}