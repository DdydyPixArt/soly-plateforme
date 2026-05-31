import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SolvencyGaugeProps {
  score: number;
  size?: "sm" | "md";
}

export default function SolvencyGauge({ score, size = "md" }: SolvencyGaugeProps) {
  const pct = score / 1000;
  let color = "#ef4444";
  if (score >= 750) color = "#10b981";
  else if (score >= 600) color = "#f59e0b";
  else if (score >= 400) color = "#f97316";

  const data = [{ value: pct, color }, { value: 1 - pct, color: "#f1f5f9" }];
  const needleAngle = -90 + pct * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const isSm = size === "sm";

  const label = score >= 750 ? "Excellent" : score >= 600 ? "Bon" : score >= 400 ? "Moyen" : "Faible";

  return (
    <div className="flex flex-col items-center">
      <div className={`relative overflow-hidden ${isSm ? "w-40 h-22" : "w-52 h-28"}`}
        style={{ height: isSm ? 88 : 112 }}>
        <ResponsiveContainer width="100%" height={isSm ? 176 : 220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={isSm ? 42 : 55}
              outerRadius={isSm ? 60 : 80}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${isSm ? 160 : 200} ${isSm ? 88 : 110}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1={isSm ? 80 : 100} y1={isSm ? 80 : 100}
            x2={(isSm ? 80 : 100) + (isSm ? 46 : 60) * Math.cos(needleRad)}
            y2={(isSm ? 80 : 100) + (isSm ? 46 : 60) * Math.sin(needleRad)}
            stroke="#1e293b" strokeWidth={isSm ? 2.5 : 3} strokeLinecap="round"
          />
          <circle cx={isSm ? 80 : 100} cy={isSm ? 80 : 100} r={isSm ? 4 : 5} fill="#1e293b" />
        </svg>
      </div>
      <div className="text-center -mt-1">
        <p className={`font-bold ${isSm ? "text-2xl" : "text-3xl"}`} style={{ color }}>{score}</p>
        <p className={`text-slate-500 mt-0.5 ${isSm ? "text-xs" : "text-xs"}`}>/ 1000 — {label}</p>
      </div>
    </div>
  );
}
