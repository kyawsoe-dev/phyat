'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Shield, Bell, Settings as SettingsIcon, Eye, EyeOff, Loader2, Save, Check, Pencil, BadgeCheck, CalendarDays,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'security' | 'notifications';

interface AdminData {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
  isAdmin: boolean;
  admin2faEnabled?: boolean;
}

export function AdminSettingsClient({ admin: initialAdmin }: { admin: AdminData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [admin, setAdmin] = useState(initialAdmin);

  // Profile state (exactly like user dashboard settings)
  const [name, setName] = useState(initialAdmin.name || '');
  const [editing, setEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Sync local name when admin data updates from server
  useEffect(() => {
    setName(initialAdmin.name || '');
    setEditing(false);
  }, [initialAdmin.name]);

  // Security - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // Admin 2FA (full flow like user settings)
  const [twofaEnabled, setTwofaEnabled] = useState(!!admin.admin2faEnabled);
  const [twofaSecret, setTwofaSecret] = useState('');
  const [twofaOtpauthUrl, setTwofaOtpauthUrl] = useState('');
  const [twofaQrDataUrl, setTwofaQrDataUrl] = useState('');
  const [twofaToken, setTwofaToken] = useState('');
  const [twofaError, setTwofaError] = useState('');
  const [twofaLoading, setTwofaLoading] = useState(false);
  const [twofaSetupMode, setTwofaSetupMode] = useState(false);
  const [twofaDisablePassword, setTwofaDisablePassword] = useState('');
  const [twofaDisableError, setTwofaDisableError] = useState('');
  const [twofaDisabling, setTwofaDisabling] = useState(false);

  // Notifications (localStorage like user settings)
  const defaultPrefs = { clicks: true, weekly: true, security: true, updates: false };
  const [prefs, setPrefs] = useState(() => {
    if (typeof window === 'undefined') return defaultPrefs;
    const saved = localStorage.getItem('phyat_admin_notification_prefs');
    return saved ? JSON.parse(saved) : defaultPrefs;
  });

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  // Save name
  async function saveName() {
    if (!admin.id) return;
    setSavingName(true);
    setProfileMsg('');
    try {
      const res = await fetch(`/api/admin/users/${admin.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setProfileMsg('Name updated successfully.');
        setAdmin((prev) => ({ ...prev, name }));
        setEditing(false);
        setTimeout(() => setProfileMsg(''), 2000);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setProfileMsg(data.message || 'Failed to update name.');
      }
    } catch {
      setProfileMsg('Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }

  // Change password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPwSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        setPwError(data.message || 'Failed to change password.');
      }
    } catch {
      setPwError('Failed to change password.');
    }
    setChangingPw(false);
  }

  // 2FA functions (admin endpoints)
  async function startAdmin2faSetup() {
    setTwofaError('');
    setTwofaSetupMode(true);
    try {
      const res = await fetch('/api/admin/2fa/setup');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to start setup');
      const data = await res.json();
      setTwofaSecret(data.secret);
      setTwofaOtpauthUrl(data.otpauthUrl);
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(data.otpauthUrl, { width: 200, margin: 2 });
      setTwofaQrDataUrl(url);
    } catch (err: any) {
      setTwofaError(err.message || 'Failed to start setup');
    }
  }

  async function verifyAdmin2faSetup() {
    setTwofaError('');
    setTwofaLoading(true);
    try {
      const res = await fetch('/api/admin/2fa/verify-setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: twofaToken }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Invalid code');
      setTwofaEnabled(true);
      setTwofaSetupMode(false);
      setTwofaToken('');
      router.refresh();
    } catch (err: any) {
      setTwofaError(err.message || 'Verification failed');
    } finally {
      setTwofaLoading(false);
    }
  }

  async function disableAdmin2fa() {
    setTwofaDisableError('');
    setTwofaDisabling(true);
    try {
      const res = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: twofaDisablePassword }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to disable 2FA');
      setTwofaEnabled(false);
      setTwofaDisablePassword('');
      router.refresh();
    } catch (err: any) {
      setTwofaDisableError(err.message || 'Failed to disable');
    } finally {
      setTwofaDisabling(false);
    }
  }

  function toggleNotification(key: keyof typeof defaultPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('phyat_admin_notification_prefs', JSON.stringify(next));
  }

  const notificationToggles = [
    { key: 'clicks' as const, label: 'Click alerts', desc: 'Get notified when links receive clicks' },
    { key: 'weekly' as const, label: 'Weekly digest', desc: 'Receive a weekly summary of platform activity' },
    { key: 'security' as const, label: 'Security alerts', desc: 'Important security notifications for admin accounts' },
    { key: 'updates' as const, label: 'Product updates', desc: 'New features and improvements' },
  ];

  return (
    <div className="space-y-6">
      {/* Header - exactly like user settings */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your admin account, security, and preferences
        </p>
      </div>

      {/* Tab Navigation - identical styling to user dashboard settings */}
      <div className="flex gap-1 rounded-xl border border-border bg-background p-1 shadow-sm overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              tab === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB - EXACT same structure as user dashboard settings ProfileSection */}
      {tab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Header - copied exactly from user settings */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                      {admin.name
                        ? admin.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : admin.email.slice(0, 2).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm"
                      title="Change avatar"
                      onClick={() => alert("Avatar upload coming soon for admin accounts")}
                    >
                      <Pencil size={10} />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{admin.name || "Admin"}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span>{admin.email}</span>
                      <BadgeCheck size={14} className="text-primary shrink-0" />
                    </div>
                  </div>
                </div>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setTimeout(() => {
                    const input = document.getElementById("admin-name-input") as HTMLInputElement;
                    if (input) {
                      input.focus();
                      input.select();
                    }
                  }, 50);
                }}
                className="mt-3 sm:mt-0 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
              </div>

              {/* Status Badges - exactly like user settings */}
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active Account
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Administrator
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays size={12} />
                  {Math.floor((Date.now() - new Date(admin.createdAt).getTime()) / (1000 * 60 * 60 * 24))} member day
                  {Math.floor((Date.now() - new Date(admin.createdAt).getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information - exactly like user dashboard settings (labels by default, inputs only when editing) */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-4">Personal Information</h3>

              <div className="max-w-lg space-y-5">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name</label>
                  {!editing ? (
                    <div className="text-base font-medium py-1">{name || "—"}</div>
                  ) : (
                    <Input
                      id="admin-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1"
                      placeholder="Your full name"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
                  <div className="text-base font-medium py-1 text-muted-foreground">{admin.email}</div>
                </div>

                {editing && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={saveName}
                      disabled={savingName || name === (admin.name || "")}
                    >
                      {savingName ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setName(admin.name || "");
                        setEditing(false);
                        setProfileMsg("");
                      }}
                      disabled={savingName}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {profileMsg && <p className="text-sm text-emerald-600">{profileMsg}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB - full admin 2FA + password like user security section */}
      {tab === 'security' && (
        <div className="space-y-6">
          {/* Password Change */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-muted-foreground" />
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>

              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Current password</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">New password</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Confirm new password</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={showPasswords} onChange={() => setShowPasswords(!showPasswords)} />
                  {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />} Show passwords
                </label>

                {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                {pwSuccess && <p className="text-sm text-emerald-600">Password changed successfully.</p>}

                <Button type="submit" disabled={changingPw}>
                  Change Password
                </Button>
              </form>
            </div>
          </div>

          {/* Admin 2FA - full inline experience */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-muted-foreground" />
                <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Protect your admin account with an authenticator app.</p>

              {twofaEnabled && !twofaSetupMode ? (
                <div className="max-w-sm space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <Check size={16} /> Two-factor authentication is enabled
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Enter your password to disable 2FA</label>
                    <Input
                      type="password"
                      value={twofaDisablePassword}
                      onChange={(e) => setTwofaDisablePassword(e.target.value)}
                      placeholder="Current password"
                      className="mt-1"
                    />
                    {twofaDisableError && <p className="text-sm text-red-600 mt-1">{twofaDisableError}</p>}
                    <Button
                      variant="destructive"
                      className="mt-3"
                      onClick={disableAdmin2fa}
                      disabled={!twofaDisablePassword || twofaDisabling}
                    >
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              ) : twofaSetupMode ? (
                <div className="max-w-sm space-y-4">
                  <p className="text-sm text-muted-foreground">Scan the QR code, then enter the 6-digit code.</p>

                  {twofaQrDataUrl && (
                    <div className="flex justify-center">
                      <div className="rounded-xl border border-border bg-white p-3">
                        <Image src={twofaQrDataUrl} alt="2FA QR" width={180} height={180} unoptimized />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Manual key</p>
                    <p className="font-mono text-sm tracking-wider break-all">{twofaSecret}</p>
                  </div>

                  <Input
                    value={twofaToken}
                    onChange={(e) => setTwofaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-lg tracking-[6px] font-mono"
                    maxLength={6}
                  />

                  {twofaError && <p className="text-sm text-red-600">{twofaError}</p>}

                  <div className="flex gap-2">
                    <Button onClick={verifyAdmin2faSetup} disabled={twofaToken.length !== 6 || twofaLoading}>
                      Verify &amp; Enable
                    </Button>
                    <Button variant="secondary" onClick={() => setTwofaSetupMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={startAdmin2faSetup}>Set up Two-Factor Authentication</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB - same style as user dashboard settings */}
      {tab === 'notifications' && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-muted-foreground" />
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Choose what notifications you receive as an admin.</p>

            <div className="space-y-4 max-w-lg">
              {notificationToggles.map((item) => (
                <div key={item.key} className="flex items-start justify-between rounded-lg border border-border p-4">
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs[item.key]}
                      onChange={() => toggleNotification(item.key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Preferences are saved locally in your browser.</p>
          </div>
        </div>
      )}
    </div>
  );
}
