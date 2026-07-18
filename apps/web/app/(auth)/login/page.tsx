import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@tradebridge/ui';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg rounded-[32px]">
        <CardHeader>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">TradeBridge Cloud</div>
          <CardTitle className="text-3xl">Sign in to your execution workspace</CardTitle>
          <CardDescription>Email/password, magic link, and TOTP-backed sign-in are supported by the API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`} className="space-y-4" method="post">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" />
            </div>
            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </form>
          <p className="text-sm text-slate-600">
            Need an account?{' '}
            <Link className="font-medium text-sky-700" href="/register">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
