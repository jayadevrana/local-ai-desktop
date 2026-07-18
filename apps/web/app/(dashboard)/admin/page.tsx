import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function AdminPage() {
  const [organizations, jobs] = await Promise.all([
    safeApiFetch<Array<{ id: string; name: string; slug: string; isSuspended: boolean }>>('/admin/organizations'),
    safeApiFetch<Array<{ id: string; status: string; mt5Account: { nickname: string } }>>('/admin/jobs'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Operations cockpit"
        description="Internal operations can inspect tenants, replay failed jobs, and watch fleet health from a protected role-gated surface."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Suspended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(organizations ?? []).map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>{organization.name}</TableCell>
                    <TableCell>{organization.slug}</TableCell>
                    <TableCell>{organization.isSuspended ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jobs ?? []).map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.id}</TableCell>
                    <TableCell>{job.mt5Account.nickname}</TableCell>
                    <TableCell>{job.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
