import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Workspace settings"
        description="Session security, TOTP enrollment, webhook rotation, and secret management should be operated here. The backend already exposes the core endpoints."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Security posture</CardTitle>
          <CardDescription>Use `/auth/totp/setup`, `/auth/totp/verify`, and webhook rotation endpoints to complete the operator workflow.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Sensitive secrets are encrypted at rest, redacted from logs, and only surfaced at creation or rotation time.
        </CardContent>
      </Card>
    </div>
  );
}
