import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function SignalsPage() {
  const signals = await safeApiFetch<Array<{ id: string; sourceLabel: string; strategyId?: string; status: string; receivedAt: string; mt5Account: { nickname: string } }>>(
    '/signals',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Signal log"
        description="Raw ingress events are persisted before execution and stay searchable for dedupe, replay, and support investigations."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(signals ?? []).map((signal) => (
                <TableRow key={signal.id}>
                  <TableCell className="font-mono text-xs">{signal.id}</TableCell>
                  <TableCell>{signal.mt5Account.nickname}</TableCell>
                  <TableCell>{signal.sourceLabel}</TableCell>
                  <TableCell>{signal.strategyId ?? '-'}</TableCell>
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
