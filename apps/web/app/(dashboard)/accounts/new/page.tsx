import { AccountForm } from '../../../../components/account-form';
import { PageHeader } from '../../../../components/page-header';

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="Provision a new MT5 account"
        description="This flow creates encrypted credentials, a default terminal slot, and an account-specific TradingView webhook."
      />
      <AccountForm />
    </div>
  );
}
