import { Card, CardContent, CardHeader, CardTitle } from '@tradebridge/ui';

import { PageHeader } from '../../../components/page-header';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Subscription and plan gating"
        description="The backend is Stripe-ready with subscription plan records and usage-aware gating points, while checkout/customer portal wiring can be added per environment."
      />
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Plan abstraction</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Subscription plans, limits, and provider identifiers already exist in the database schema and seed data for staging rollout.
        </CardContent>
      </Card>
    </div>
  );
}
