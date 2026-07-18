import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@tradebridge/ui';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-2xl rounded-[32px]">
        <CardHeader>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Launch</div>
          <CardTitle className="text-3xl">Create your tenant workspace</CardTitle>
          <CardDescription>Provision an organization, owner session, and billing-ready subscription record.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <form action={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`} className="contents" method="post">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization</Label>
              <Input id="organizationName" name="organizationName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create Workspace</Button>
            </div>
          </form>
          <div className="md:col-span-2 text-sm text-slate-600">
            Existing customer?{' '}
            <Link className="font-medium text-sky-700" href="/login">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
