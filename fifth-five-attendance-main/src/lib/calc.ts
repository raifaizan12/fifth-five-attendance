export type StatusCounts = {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
};

// Present and Late count toward "attended"; Absent does not; Leave is excluded from the denominator
// (a common, fair convention — adjust here if your department uses a different rule).
export function computePercentage(counts: StatusCounts): number {
  const denom = counts.present + counts.absent + counts.late;
  if (denom === 0) return 0;
  return Math.round(((counts.present + counts.late) / denom) * 1000) / 10;
}

export function emptyCounts(): StatusCounts {
  return { total: 0, present: 0, absent: 0, late: 0, leave: 0 };
}

export function tallyRecords(records: { status: string }[]): StatusCounts {
  const c = emptyCounts();
  for (const r of records) {
    c.total += 1;
    if (r.status === "PRESENT") c.present += 1;
    else if (r.status === "ABSENT") c.absent += 1;
    else if (r.status === "LATE") c.late += 1;
    else if (r.status === "LEAVE") c.leave += 1;
  }
  return c;
}
