import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';
import { safeApiFetch } from '../../../lib/api';

export default async function RiskPage() {
  const profiles = await safeApiFetch<Array<{ id: string; name: string; defaultVolumeMode: string; defaultVolumeValue: string; maxLotCap?: string; minLot?: string }>>(
    '/mt5-accounts/risk-profiles/all',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Risk"
        title="Risk profiles"
        description="Lot sizing rules are deterministic and shared between services so percent-risk calculations stay testable and auditable."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Configured profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Max lot</TableHead>
                <TableHead>Min lot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles ?? []).map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.name}</TableCell>
                  <TableCell>{profile.defaultVolumeMode}</TableCell>
                  <TableCell>{profile.defaultVolumeValue}</TableCell>
                  <TableCell>{profile.maxLotCap ?? '-'}</TableCell>
                  <TableCell>{profile.minLot ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
