'use client';

import { useState, useTransition } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@tradebridge/ui';

type AccountFormState = {
  nickname: string;
  brokerName: string;
  serverName: string;
  login: string;
  password: string;
  accountCurrency: string;
};

const initialState: AccountFormState = {
  nickname: '',
  brokerName: '',
  serverName: '',
  login: '',
  password: '',
  accountCurrency: 'USD',
};

export function AccountForm() {
  const [state, setState] = useState<AccountFormState>(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (key: keyof AccountFormState, value: string) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/mt5-accounts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        setMessage('Unable to create MT5 account. Check API auth and validation.');
        return;
      }

      const data = await response.json();
      setMessage(`Account created. Save this webhook secret now: ${data.webhook.webhookSecret}`);
      setState(initialState);
    });
  };

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Create MT5 Account</CardTitle>
        <CardDescription>Provision a tenant-scoped account, encrypted credentials, terminal slot, and TradingView webhook.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {[
          ['nickname', 'Account nickname'],
          ['brokerName', 'Broker name'],
          ['serverName', 'Server name'],
          ['login', 'MT5 login'],
          ['password', 'MT5 password'],
          ['accountCurrency', 'Currency'],
        ].map(([key, label]) => (
          <div className="space-y-2" key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type={key === 'password' ? 'password' : 'text'}
              value={state[key as keyof AccountFormState]}
              onChange={(event) => onChange(key as keyof AccountFormState, event.target.value)}
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <Button disabled={pending} onClick={submit}>
            {pending ? 'Creating...' : 'Create Account'}
          </Button>
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
