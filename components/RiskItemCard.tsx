import type { RiskItem } from "@/types/report";

type RiskItemCardProps = {
  item: RiskItem;
};

const riskLevelColor = {
  낮음: "bg-green-100 text-green-700",
  보통: "bg-yellow-100 text-yellow-700",
  높음: "bg-red-100 text-red-700",
};

export default function RiskItemCard({ item }: RiskItemCardProps) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-bold">{item.category}</h3>

        <span
          className={`rounded-full px-3 py-1 text-sm ${
            riskLevelColor[item.riskLevel]
          }`}
        >
          {item.riskLevel}
        </span>
      </div>

      {"evidence" in item && item.evidence && (
        <p className="mb-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          <b>판단 근거:</b> {item.evidence}
        </p>
      )}

      <p className="mb-2 text-sm text-slate-700">{item.reason}</p>

      <p className="mb-2 text-sm">
        <b>운영자 안내:</b> {item.operatorGuide}
      </p>

      <p className="text-sm">
        <b>개발자 조치:</b> {item.developerAction}
      </p>
    </div>
  );
}