import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function ExecutionsPage() {
  const jobs = await safeApiFetch<Array<{ id: string; status: string; mt5Account: { nickname: string }; assignedNode?: { nodeName: string }; executionResults: Array<{ message: string }> }>>(
    '/execution-jobs',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Execution"
        title="Execution jobs"
        description="Inspect dispatch state, assigned nodes, and the latest adapter feedback without leaving the customer dashboard."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Latest message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobs ?? []).map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">{job.id}</TableCell>
                  <TableCell>{job.mt5Account.nickname}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.assignedNode?.nodeName ?? 'Pending'}</TableCell>
                  <TableCell>{job.executionResults[0]?.message ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
