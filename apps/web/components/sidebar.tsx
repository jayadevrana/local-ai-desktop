import Link from 'next/link';
import { Activity, Briefcase, Cable, CreditCard, LayoutDashboard, Shield, Signal, Users, Wallet } from 'lucide-react';

const navItems = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/accounts', label: 'MT5 Accounts', icon: Briefcase },
  { href: '/webhooks', label: 'Webhooks', icon: Cable },
  { href: '/signals', label: 'Signal Log', icon: Signal },
  { href: '/executions', label: 'Executions', icon: Activity },
  { href: '/nodes', label: 'Nodes', icon: Shield },
  { href: '/risk', label: 'Risk Profiles', icon: Wallet },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin', label: 'Admin Ops', icon: Shield },
];

export function Sidebar() {
  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-8 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="text-xs uppercase tracking-[0.2em] text-sky-200">TradeBridge</div>
        <div className="mt-2 text-xl font-semibold">Execution Cloud</div>
        <p className="mt-2 text-sm text-slate-300">Tenant-isolated signal ingestion, routing, and MT5 execution control.</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4 text-slate-500" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
