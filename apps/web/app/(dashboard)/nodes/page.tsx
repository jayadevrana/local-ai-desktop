import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function NodesPage() {
  const nodes = await safeApiFetch<Array<{ id: string; nodeName: string; hostname: string; status: string; lastHeartbeatAt?: string; terminalInstances?: Array<{ id: string }> }>>(
    '/admin/nodes',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet"
        title="Node and terminal status"
        description="Execution nodes stay observable through heartbeat status, terminal counts, and tenant routing pressure."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Windows nodes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last heartbeat</TableHead>
                <TableHead>Terminals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(nodes ?? []).map((node) => (
                <TableRow key={node.id}>
                  <TableCell>{node.nodeName}</TableCell>
                  <TableCell>{node.hostname}</TableCell>
                  <TableCell>{node.status}</TableCell>
                  <TableCell>{node.lastHeartbeatAt ? new Date(node.lastHeartbeatAt).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>{node.terminalInstances?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
