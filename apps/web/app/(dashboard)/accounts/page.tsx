import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function AccountsPage() {
  const accounts = await safeApiFetch<Array<{
    id: string;
    nickname: string;
    brokerName: string;
    serverName: string;
    login: string;
    status: string;
    assignedNode?: { nodeName: string };
    terminalInstance?: { status: string };
  }>>('/mt5-accounts');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounts"
        title="MT5 account inventory"
        description="Each account carries isolated credentials, symbol mappings, parser templates, and a routed terminal instance."
        actions={
          <Button asChild>
            <Link href="/accounts/new">Add account</Link>
          </Button>
        }
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nickname</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Terminal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(accounts ?? []).map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.nickname}</TableCell>
                  <TableCell>{account.brokerName}</TableCell>
                  <TableCell>{account.serverName}</TableCell>
                  <TableCell className="font-mono">{account.login}</TableCell>
                  <TableCell>{account.status}</TableCell>
                  <TableCell>{account.assignedNode?.nodeName ?? 'Unassigned'}</TableCell>
                  <TableCell>{account.terminalInstance?.status ?? 'Not provisioned'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
