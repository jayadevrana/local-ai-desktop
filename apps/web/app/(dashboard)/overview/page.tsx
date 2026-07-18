import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { StatCard } from '../../../components/stat-card';
import { safeApiFetch } from '../../../lib/api';

export default async function OverviewPage() {
  const summary = await safeApiFetch<{
    accounts: number;
    signals24h: number;
    activeNodes: number;
    activeMembers: number;
    failedJobs: number;
    recentSignals: Array<{ id: string; sourceLabel: string; status: string; receivedAt: string }>;
  }>('/organizations/current/summary');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control Plane"
        title="Execution overview"
        description="A real-time tenant view over account provisioning, signal throughput, node capacity, and failure pressure."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Accounts" value={summary?.accounts ?? 0} hint="Provisioned MT5 accounts" />
        <StatCard label="Signals / 24h" value={summary?.signals24h ?? 0} hint="Ingress volume across all webhook endpoints" />
        <StatCard label="Healthy nodes" value={summary?.activeNodes ?? 0} hint="Nodes reporting ACTIVE or DEGRADED" />
        <StatCard label="Team members" value={summary?.activeMembers ?? 0} hint="Scoped users inside this organization" />
        <StatCard label="Failed jobs" value={summary?.failedJobs ?? 0} hint="Jobs needing replay or diagnosis" />
      </div>
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Recent signals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signal</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summary?.recentSignals ?? []).map((signal) => (
                <TableRow key={signal.id}>
                  <TableCell className="font-mono text-xs">{signal.id}</TableCell>
                  <TableCell>{signal.sourceLabel}</TableCell>
                  <TableCell>{signal.status}</TableCell>
                  <TableCell>{new Date(signal.receivedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
