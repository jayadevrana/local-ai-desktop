import { Card, CardContent, CardHeader, CardTitle } from '@tradebridge/ui';

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
        <p className="mt-2 text-sm text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}
