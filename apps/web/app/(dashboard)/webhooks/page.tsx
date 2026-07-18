import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function WebhooksPage() {
  const accounts = await safeApiFetch<Array<{ id: string; nickname: string; webhooks: Array<{ id: string; sourceLabel: string; status: string; lastUsedAt?: string }> }>>(
    '/mt5-accounts',
  );

  const rows = (accounts ?? []).flatMap((account) =>
    (account.webhooks ?? []).map((webhook) => ({
      account: account.nickname,
      ...webhook,
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Webhooks"
        title="TradingView endpoints"
        description="Monitor endpoint activity, rotation state, and source labels. Tokens and secrets are only shown at creation or rotation time."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Webhook endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.account}</TableCell>
                  <TableCell>{row.sourceLabel}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : 'Never'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
