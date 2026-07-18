import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function TeamPage() {
  const members = await safeApiFetch<Array<{ id: string; role: string; user: { email: string; fullName: string; status: string } }>>('/organizations/current/members');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access"
        title="Team members and roles"
        description="Every resource is tenant-scoped and role-gated in the API. Use owner/admin roles for operational changes and trader/viewer for limited access."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members ?? []).map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.user.fullName}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.user.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
