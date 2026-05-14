'use client';

import { useState, useTransition } from 'react';
import { Code2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt?: string | null;
};

export function DeveloperApiPanel({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const [name, setName] = useState('');
  const [keys, setKeys] = useState(apiKeys);
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name || 'Dashboard key' }),
      });

      if (!response.ok) return;
      const created = (await response.json()) as ApiKeyRow & { secret: string };
      setSecret(created.secret);
      setKeys((current) => [created, ...current]);
      setName('');
    });
  }

  return (
    <section className="rounded-md border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound size={18} />
        <h2 className="text-lg font-semibold">Developer API</h2>
      </div>
      <div className="space-y-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="API key name" />
        <Button className="w-full" disabled={pending} onClick={generate} type="button" variant="secondary">
          <Code2 size={16} /> Generate PH_API_KEY
        </Button>
      </div>
      {secret && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Copy this key now. It will not be shown again.</p>
          <code className="mt-2 block overflow-x-auto rounded-sm bg-white px-2 py-2 text-xs">{secret}</code>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {keys.map((key) => (
          <div key={key.id} className="rounded-md bg-muted px-3 py-2 text-sm">
            <p className="font-medium">{key.name}</p>
            <p className="text-muted-foreground">{key.prefix}_****{key.lastFour}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
