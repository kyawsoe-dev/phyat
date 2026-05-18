'use client';

import { useEffect, useState } from 'react';
import {
  User, KeyRound, Bell, Shield, Code2, Eye, EyeOff,
  Copy, Check, Trash2, Plus, ExternalLink, Save, Pencil,
  Link2, QrCode, Megaphone, Globe2, BarChart3, ArrowRight, BadgeCheck,
  CalendarDays, LayoutDashboard, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UserData = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  tier: { code: string; name: string; maxLinks: number | null };
};

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt?: string | null;
};

type Stats = {
  linkCount: number;
  qrCount: number;
  campaignCount: number;
  domainCount: number;
};

type UsageInfo = { usage: Record<string, number>; limits: Record<string, number | null>; month: string } | null;

type Tab = 'profile' | 'developer' | 'notifications' | 'security';

export function SettingsClient({
  user,
  stats,
  initialApiKeys,
}: {
  user: UserData;
  stats: Stats;
  initialApiKeys: ApiKey[];
}) {
  const [tab, setTab] = useState<Tab>('profile');
  const [usage, setUsage] = useState<UsageInfo>(null);

  useEffect(() => {
    fetch('/api/usage/current').then((r) => (r.ok ? r.json() : null)).then(setUsage).catch(() => setUsage(null));
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'developer', label: 'Developer API', icon: Code2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, API keys, and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-border bg-background p-1 shadow-sm overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileSection user={user} stats={stats} usage={usage} />}
      {tab === 'developer' && <DeveloperApiSection initialKeys={initialApiKeys} />}
      {tab === 'notifications' && <NotificationsSection />}
      {tab === 'security' && <SecuritySection user={user} />}
    </div>
  );
}

function ProfileSection({ user, stats, usage }: { user: UserData; stats: Stats; usage: UsageInfo }) {
  const [name, setName] = useState(user.name ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name || null }),
    });
    if (res.ok) {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  const memberDays = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {initials}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm"
                  title="Change avatar"
                >
                  <Pencil size={10} />
                </button>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{user.name || 'User'}</h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>{user.email}</span>
                  <BadgeCheck size={14} className="text-primary shrink-0" />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="mt-3 sm:mt-0 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil size={14} />
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Status Badges */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Active Account
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Plan: {user.tier.name}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarDays size={12} />
              {memberDays} member day{memberDays !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-sm font-semibold">Personal Information</h3>
          {editing ? (
            <form onSubmit={handleSave} className="mt-4 space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input value={user.email} disabled className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saved ? <Check size={16} /> : <Save size={16} />}
                  {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setEditing(false); setName(user.name ?? ''); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium">{user.name || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {usage && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-sm font-semibold">Monthly Usage</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(['LINKS', 'QR_CODES', 'CUSTOM_DOMAINS', 'API_KEYS'] as const).map((key) => {
                const value = usage.usage[key] ?? 0;
                const limit = usage.limits[key];
                const pct = limit ? Math.min(100, Math.round((value / limit) * 100)) : 0;
                return (
                  <div key={key} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{key.replace('_', ' ')}</span>
                      <span>{limit == null ? `${value} / Unlimited` : `${value} / ${limit}`}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: limit == null ? '100%' : `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Account Stats */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-sm font-semibold">Account Stats</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <Link2 size={18} className="mx-auto text-primary" />
              <p className="mt-1.5 text-xl font-bold">{stats.linkCount}</p>
              <p className="text-xs text-muted-foreground">Links</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <QrCode size={18} className="mx-auto text-muted-foreground" />
              <p className="mt-1.5 text-xl font-bold">{stats.qrCount}</p>
              <p className="text-xs text-muted-foreground">QR Codes</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Megaphone size={18} className="mx-auto text-muted-foreground" />
              <p className="mt-1.5 text-xl font-bold">{stats.campaignCount}</p>
              <p className="text-xs text-muted-foreground">Campaigns</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Globe2 size={18} className="mx-auto text-muted-foreground" />
              <p className="mt-1.5 text-xl font-bold">{stats.domainCount}</p>
              <p className="text-xs text-muted-foreground">Domains</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <LayoutDashboard size={16} className="shrink-0" />
              Dashboard
            </a>
            <a
              href="/dashboard/links"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <Link2 size={16} className="shrink-0" />
              Links
            </a>
            <a
              href="/dashboard/qr"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <QrCode size={16} className="shrink-0" />
              QR Codes
            </a>
            <a
              href="/dashboard/analytics"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <BarChart3 size={16} className="shrink-0" />
              Analytics
            </a>
            <a
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <Megaphone size={16} className="shrink-0" />
              Campaigns
            </a>
            <a
              href="/dashboard/domains"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <Globe2 size={16} className="shrink-0" />
              Domains
            </a>
            <a
              href="/dashboard/plans"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <CreditCard size={16} className="shrink-0" />
              Plans
            </a>
            <a
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted hover:border-primary/50 transition-colors"
            >
              <User size={16} className="shrink-0" />
              Settings
            </a>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Current Plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You are on the <span className="font-medium text-foreground">{user.tier.name}</span> plan.
              {user.tier.maxLinks !== null && (
                <> You can create up to {user.tier.maxLinks} links per month.</>
              )}
            </p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <a href="/dashboard/plans">
              Upgrade <ArrowRight size={14} className="ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeveloperApiSection({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setCreating(true);
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name || 'Default API key' }),
    });
    if (res.ok) {
      const created = await res.json();
      setSecret(created.secret);
      setKeys((prev) => [created, ...prev]);
      setName('');
    }
    setCreating(false);
  }

  async function revoke(id: string) {
    await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setSecret(null);
  }

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Use API keys to authenticate requests to the Phyat API.
        </p>

        {/* Create */}
        <div className="mt-5 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. Production)"
            className="flex-1"
          />
          <Button onClick={generate} disabled={creating}>
            <Plus size={16} /> Create Key
          </Button>
        </div>

        {/* Secret Reveal */}
        {secret && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">Key created successfully</p>
            <p className="text-xs text-muted-foreground">Copy this key now. You will not be able to see it again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded border border-border bg-background px-3 py-2 text-xs font-mono">
                {secret}
              </code>
              <button
                type="button"
                onClick={copySecret}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Copy"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Key List */}
        {keys.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {keys.length} active key{keys.length !== 1 ? 's' : ''}
            </p>
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.prefix}_****{key.lastFour}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ' · Never used'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(key.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors shrink-0 ml-2"
                  title="Revoke key"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Documentation */}
        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <h4 className="text-sm font-semibold">API Usage</h4>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>Include your API key in the Authorization header:</p>
            <code className="block rounded border border-border bg-background px-3 py-2 font-mono">
              Authorization: Bearer phyat_live_your_key_here
            </code>
            <p className="mt-2">Example:</p>
            <code className="block rounded border border-border bg-background px-3 py-2 font-mono">
              curl -H &quot;Authorization: Bearer phyat_live_your_key_here&quot; \<br />
              &nbsp;&nbsp;{typeof window !== 'undefined' ? window.location.origin : ''}/api/links
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState(() => {
    if (typeof window === 'undefined') return defaultPrefs;
    const saved = localStorage.getItem('phyat_notification_prefs');
    return saved ? JSON.parse(saved) : defaultPrefs;
  });

  const toggles: { key: keyof typeof defaultPrefs; label: string; desc: string }[] = [
    { key: 'clicks', label: 'Click alerts', desc: 'Get notified when your links receive clicks' },
    { key: 'weekly', label: 'Weekly digest', desc: 'Receive a weekly summary of your link performance' },
    { key: 'security', label: 'Security alerts', desc: 'Important security notifications about your account' },
    { key: 'updates', label: 'Product updates', desc: 'New features, improvements, and tips' },
  ];

  function toggle(key: keyof typeof defaultPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('phyat_notification_prefs', JSON.stringify(next));
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what notifications you receive.
        </p>
        <div className="mt-5 space-y-3">
          {toggles.map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  prefs[key] ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    prefs[key] ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={prefs[key]}
                  onChange={() => toggle(key)}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

const defaultPrefs = {
  clicks: true,
  weekly: false,
  security: true,
  updates: true,
};

function SecuritySection({ user }: { user: UserData }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setChanging(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      const data = await res.json();
      setError(data.message || 'Failed to change password.');
    }
    setChanging(false);
  }

  return (
    <div className="space-y-6">
      {/* Password */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="mt-5 max-w-md space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Current password</label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">New password</label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm new password</label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={() => setShowPasswords(!showPasswords)}
                className="rounded"
              />
              {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
              Show passwords
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">Password changed successfully.</p>}
            <Button type="submit" disabled={changing}>
              <Shield size={16} />
              {changing ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-sm font-semibold">Account Security</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">Verified</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-xs text-muted-foreground">Last changed: {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">Set</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
