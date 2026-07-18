import { Card, CardContent, CardHeader, CardTitle } from '@tradebridge/ui';

const docs = [
  'docs/architecture.md',
  'docs/execution-flow.md',
  'docs/security.md',
  'docs/windows-agent.md',
  'docs/webhook-format.md',
  'docs/runbook.md',
  'docs/future-ea-bridge.md',
];

export default function DocsAppPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>TradeBridge operational docs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {docs.map((doc) => (
            <div key={doc}>{doc}</div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
