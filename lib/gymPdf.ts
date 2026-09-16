import { bodyPartLabel } from "./gym";
import type { GymWeekStats, LiftSeries } from "./gymStats";
import { formatCompact } from "./time";

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function objectsToPdf(objects: string[]): Blob {
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }
  const xrefAt = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(
    xref,
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`,
  );
  return new Blob(chunks, { type: "application/pdf" });
}

function drawSeries(
  series: LiftSeries,
  box: { x: number; y: number; w: number; h: number },
): string {
  const points = series.points;
  if (points.length === 0) return "";
  const ys = [...points.map((point) => point.y), ...series.ema];
  const minY = Math.min(...ys) * 0.92;
  const maxY = Math.max(...ys) * 1.08 || 1;
  const minX = points[0].t;
  const maxX = points[points.length - 1].t;
  const spanX = Math.max(1, maxX - minX);
  const xOf = (t: number) => box.x + ((t - minX) / spanX) * box.w;
  const yOf = (y: number) => box.y + ((y - minY) / (maxY - minY)) * box.h;
  const ops: string[] = [];
  ops.push("0.7 0.7 0.75 RG 0.6 w");
  ops.push(`${box.x} ${box.y} m ${box.x + box.w} ${box.y} l ${box.x} ${box.y} m ${box.x} ${box.y + box.h} l S`);
  if (points.length > 1) {
    ops.push("0.24 0.53 0.77 RG 1.4 w");
    points.forEach((point, index) => {
      ops.push(`${index === 0 ? `${xOf(point.t)} ${yOf(point.y)} m` : `${xOf(point.t)} ${yOf(point.y)} l`}`);
    });
    ops.push("S");
  }
  if (series.ema.length > 1) {
    ops.push("0.75 0.35 0.16 RG 1 w [4 3] 0 d");
    series.ema.forEach((value, index) => {
      const point = points[index];
      ops.push(
        `${index === 0 ? `${xOf(point.t)} ${yOf(value)} m` : `${xOf(point.t)} ${yOf(value)} l`}`,
      );
    });
    ops.push("S [] 0 d");
  }
  points.forEach((point) => {
    const x = xOf(point.t);
    const y = yOf(point.y);
    ops.push("0.24 0.53 0.77 rg");
    ops.push(`${(x - 2).toFixed(1)} ${(y - 2).toFixed(1)} 4 4 re f`);
  });
  return ops.join("\n");
}

export function downloadGymPdf(stats: GymWeekStats, series: LiftSeries[]): void {
  const lines = [
    `Gym report  ${stats.rangeLabel}`,
    stats.insight,
    `Workout days: ${stats.workoutDays}    Sets: ${stats.totalSets}    Lifts: ${stats.liftCount}`,
    `Gym time: ${formatCompact(stats.totalGymMs)}    Avg / workout: ${stats.workoutDays ? formatCompact(stats.averageGymMs) : "-"}`,
    "",
    "Body-part sets",
    ...Object.entries(stats.bodyPartSets)
      .filter(([, count]) => count > 0)
      .map(([part, count]) => `  ${bodyPartLabel(part as never)}: ${count}`),
    "",
    "Best lifts (Epley e1RM)",
    ...stats.topLifts.map(
      (lift) => `  ${lift.label}: ${lift.setLabel}  (${lift.e1rm.toFixed(1)} lb)`,
    ),
  ];

  const textOps = lines
    .map((line, index) => {
      const y = 760 - index * 16;
      return `BT /F1 ${index === 0 ? 16 : 11} Tf 48 ${y} Td (${pdfEscape(line)}) Tj ET`;
    })
    .join("\n");

  const chart = series[0]
    ? drawSeries(series[0], { x: 48, y: 80, w: 516, h: 160 })
    : "";

  const content = `${textOps}\n${chart}`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const blob = objectsToPdf(objects);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gym-report-${stats.weekStart.toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
