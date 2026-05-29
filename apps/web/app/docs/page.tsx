import type { Metadata } from 'next';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Globe2,
  KeyRound,
  ShieldCheck,
  Webhook,
  Zap,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingFooter } from '@/components/landing-footer';
import { DocsNavClient } from './docs-nav-client';

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'Comprehensive API documentation for Phyat URL shortener — authentication, shorten endpoint, webhooks, and code examples.',
};

export default async function DocsPage() {
  const baseUrl = 'https://phyat-api.vercel.app';

  return (
    <div className="min-h-screen bg-background">
      <DocsNavClient>
        <main className="min-w-0 flex-1 py-10 md:pl-10">
          <h1 className="text-3xl font-bold tracking-tight">Phyat API Documentation</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Build, automate, and integrate your link management workflows with the Phyat API.
          </p>

          <section id="introduction" className="mt-12 scroll-mt-24">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">Introduction</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              The Phyat API lets you programmatically create short links, manage webhooks, generate QR codes, and retrieve analytics. It follows RESTful conventions and uses API keys for authentication.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {([
                [Code2, 'RESTful API', 'JSON request and response bodies with standard HTTP methods and status codes.'],
                [KeyRound, 'API Key Auth', 'Bearer tokens or PH-API-KEY header for all authenticated requests.'],
                [Zap, 'Fast Redirects', 'Sub-millisecond link resolution with Prisma findUnique on B-tree indexed slugs.'],
              ] as const).map(([Icon, title, desc]) => (
                <div key={title} className="rounded-lg border border-border bg-card p-4">
                  <Icon size={18} className="text-primary" />
                  <h3 className="mt-2 font-semibold text-sm">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium">Base URL</p>
              <code className="mt-2 block rounded-md border border-border bg-background px-4 py-3 font-mono text-sm">
                {baseUrl}
              </code>
              <p className="mt-2 text-xs text-muted-foreground">
                All API requests should be made to this base URL. The API is also accessible through <span className="font-mono">/api/*</span> proxy routes on the Phyat web app.
              </p>
            </div>
          </section>

          <section id="authentication" className="mt-16 scroll-mt-24">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">Authentication</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              All API requests require authentication via an API key. Generate keys from the Settings page in your dashboard. API keys are available on <strong className="text-foreground">Pro</strong> and <strong className="text-foreground">Developer</strong> plans.
            </p>

            <h3 className="mt-8 text-lg font-semibold">Bearer Token</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Include your API key in the <span className="font-mono text-foreground">Authorization</span> header as a Bearer token:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`Authorization: Bearer phyat_live_your_key_here`}
              </code>
            </pre>

            <h3 className="mt-8 text-lg font-semibold">PH-API-KEY Header</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Alternatively, use the <span className="font-mono text-foreground">PH-API-KEY</span> header:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`PH-API-KEY: phyat_live_your_key_here`}
              </code>
            </pre>

            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <KeyRound size={18} className="mt-0.5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Getting your API key</p>
                  <p className="mt-1 text-muted-foreground">
                    Navigate to <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">Settings → Developer API</Link> in your dashboard to create and manage API keys. The full key is shown only once at creation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="shorten-api" className="mt-16 scroll-mt-24">
            <div className="flex items-center gap-2">
              <Globe2 size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">Shorten API</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Create short links programmatically using the <span className="font-mono text-foreground">/api/v1/shorten</span> endpoint.
            </p>

            <h3 className="mt-8 text-lg font-semibold">Create a short link</h3>
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</span>
                /api/v1/shorten
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-6">
                <code>
{`curl -X POST ${baseUrl}/api/v1/shorten \\
  -H "Authorization: Bearer phyat_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "https://example.com/launch",
    "title": "Launch page",
    "customAlias": "launch",
    "generateQR": true,
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }'`}
                </code>
              </pre>
            </div>

            <h4 className="mt-8 font-semibold text-sm">Request body</h4>
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Parameter</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Required</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {[
                    ['destination', 'string', 'Yes', 'The long URL to shorten'],
                    ['title', 'string', 'No', 'A title or label for the link'],
                    ['customAlias', 'string', 'No', 'Custom back-half slug (e.g. "my-link")'],
                    ['generateQR', 'boolean', 'No', 'Generate a QR code for the link'],
                    ['expiresAt', 'string (ISO)', 'No', 'Link expiration date and time'],
                  ].map(([param, type, required, desc]) => (
                    <tr key={param}>
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{param}</td>
                      <td className="px-4 py-2.5 text-xs">{type}</td>
                      <td className="px-4 py-2.5 text-xs">{required}</td>
                      <td className="px-4 py-2.5 text-xs">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="mt-8 font-semibold text-sm">Response</h4>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`{
  "id": "clx...",
  "slug": "launch",
  "shortUrl": "https://phyat-web.vercel.app/launch",
  "destination": "https://example.com/launch",
  "title": "Launch page",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "createdAt": "2025-06-15T10:30:00.000Z"
}`}
              </code>
            </pre>
          </section>

          <section id="webhooks" className="mt-16 scroll-mt-24">
            <div className="flex items-center gap-2">
              <Webhook size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">Webhooks</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Receive real-time HTTP callbacks when events occur in your account. Webhooks are available on the <strong className="text-foreground">Developer</strong> plan.
            </p>

            <h3 className="mt-8 text-lg font-semibold">Manage webhooks</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Webhook endpoints are managed via the following API endpoints:
            </p>

            <div className="mt-4 space-y-2">
              {([
                ['GET', '/api/webhooks', 'List all webhook endpoints'],
                ['POST', '/api/webhooks', 'Create a new webhook'],
                ['PUT', '/api/webhooks/:id', 'Update a webhook'],
                ['DELETE', '/api/webhooks/:id', 'Delete a webhook'],
                ['POST', '/api/webhooks/:id/test', 'Send a test event'],
              ] as const).map(([method, path, desc]) => (
                <div key={`${method}-${path}`} className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    method === 'PUT' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {method}
                  </span>
                  <code className="font-mono text-xs text-foreground">{path}</code>
                  <span className="ml-auto text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>

            <h3 className="mt-8 text-lg font-semibold">Create a webhook</h3>
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</span>
                /api/webhooks
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-6">
                <code>
{`curl -X POST ${baseUrl}/webhooks \\
  -H "Authorization: Bearer phyat_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Webhook",
    "url": "https://your-server.com/webhook-endpoint",
    "events": ["LINK_CREATED", "LINK_CLICKED"]
  }'`}
                </code>
              </pre>
            </div>

            <h4 className="mt-8 font-semibold text-sm">Request body</h4>
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Parameter</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Required</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {([
                    ['name', 'string', 'Yes', 'A name for the webhook endpoint'],
                    ['url', 'string', 'Yes', 'HTTPS URL that receives webhook payloads'],
                    ['events', 'array', 'Yes', 'Array of event types to subscribe to'],
                  ] as const).map(([param, type, required, desc]) => (
                    <tr key={param}>
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{param}</td>
                      <td className="px-4 py-2.5 text-xs">{type}</td>
                      <td className="px-4 py-2.5 text-xs">{required}</td>
                      <td className="px-4 py-2.5 text-xs">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-8 text-lg font-semibold">Event types</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([
                ['LINK_CREATED', 'A new short link was created'],
                ['LINK_UPDATED', 'A short link was modified'],
                ['LINK_DELETED', 'A short link was deleted'],
                ['LINK_CLICKED', 'A short link received a click'],
                ['QR_CREATED', 'A QR code was generated'],
                ['QR_SCANNED', 'A QR code was scanned'],
              ] as const).map(([event, desc]) => (
                <div key={event} className="rounded-md border border-border bg-card p-3">
                  <code className="text-xs font-mono text-foreground">{event}</code>
                  <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-8 text-lg font-semibold">Payload format</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Each webhook request is an HTTP POST with a JSON body and signed headers:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`Headers:
  Content-Type: application/json
  x-phyat-event: LINK_CLICKED
  x-phyat-signature: <hmac-sha256-signature>

Body:
{
  "event": "LINK_CLICKED",
  "payload": {
    "slug": "my-link",
    "destination": "https://example.com",
    "ip": "203.0.113.42",
    "userAgent": "Mozilla/5.0 ...",
    "timestamp": "2025-06-15T10:30:00.000Z"
  },
  "createdAt": "2025-06-15T10:30:00.000Z"
}`}
              </code>
            </pre>

            <h3 className="mt-8 text-lg font-semibold">Signature verification</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Each webhook payload includes a <span className="font-mono text-foreground">x-phyat-signature</span> header. Verify it using the webhook secret returned when the webhook was created:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`// Node.js
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`}
              </code>
            </pre>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`# Python
import hmac
import hashlib

def verify_webhook_signature(body, signature, secret):
    expected = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`}
              </code>
            </pre>
          </section>

          <section id="qr-codes" className="mt-16 scroll-mt-24">
            <div className="flex items-center gap-2">
              <QrCode size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">QR Codes</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Generate QR codes for your short links. Enable QR generation by setting <span className="font-mono text-foreground">generateQR: true</span> when creating a link via the Shorten API, or generate them from the dashboard.
            </p>
            <div className="mt-6 overflow-hidden rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</span>
                /api/v1/shorten
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-6">
                <code>
{`curl -X POST ${baseUrl}/api/v1/shorten \\
  -H "Authorization: Bearer phyat_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "https://example.com",
    "generateQR": true
  }'`}
                </code>
              </pre>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The response includes a <span className="font-mono text-foreground">qrCodeDataUrl</span> field with a base64-encoded PNG image of the QR code.
            </p>
          </section>

          <section id="rate-limits" className="mt-16 scroll-mt-24">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">Rate Limits</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Rate limits vary by plan. Exceeding the limit returns a <span className="font-mono text-foreground">429 Too Many Requests</span> response.
            </p>
            <div className="mt-6 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Plan</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">API Rate Limit</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Links / Month</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Webhooks</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">API Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {([
                    ['Free', '—', '5', '—', '—'],
                    ['Pro', '30 req/min', 'Unlimited', '—', '5'],
                    ['Developer', '120 req/min', 'Unlimited', '10', '20'],
                  ] as const).map(([plan, rate, links, webhooks, keys]) => (
                    <tr key={plan}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{plan}</td>
                      <td className="px-4 py-2.5 text-xs">{rate}</td>
                      <td className="px-4 py-2.5 text-xs">{links}</td>
                      <td className="px-4 py-2.5 text-xs">{webhooks}</td>
                      <td className="px-4 py-2.5 text-xs">{keys}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="examples" className="mt-16 scroll-mt-24">
            <div className="flex items-center gap-2">
              <Code2 size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">Code Examples</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Ready-to-use code snippets for common languages and use cases.
            </p>

            <h3 className="mt-8 text-lg font-semibold">cURL</h3>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`# Shorten a link
curl -X POST ${baseUrl}/api/v1/shorten \\
  -H "Authorization: Bearer phyat_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"destination":"https://example.com"}'

# Create a webhook
curl -X POST ${baseUrl}/webhooks \\
  -H "Authorization: Bearer phyat_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production",
    "url": "https://myserver.com/webhooks",
    "events": ["LINK_CREATED", "LINK_CLICKED"]
  }'

# List webhooks
curl ${baseUrl}/webhooks \\
  -H "Authorization: Bearer phyat_live_your_key_here"`}
              </code>
            </pre>

            <h3 className="mt-8 text-lg font-semibold">Node.js</h3>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`const API_KEY = 'phyat_live_your_key_here';
const BASE = '${baseUrl}';

async function shortenLink(destination, options = {}) {
  const res = await fetch(\`\${BASE}/api/v1/shorten\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination,
      title: options.title,
      customAlias: options.alias,
      generateQR: options.qr ?? false,
    }),
  });
  return res.json();
}

// Usage
shortenLink('https://example.com', { title: 'My Link', qr: true })
  .then(console.log)
  .catch(console.error);`}
              </code>
            </pre>

            <h3 className="mt-8 text-lg font-semibold">Python</h3>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-6">
              <code>
{`import requests

API_KEY = "phyat_live_your_key_here"
BASE = "${baseUrl}"

def shorten_link(destination, title=None, alias=None, qr=False):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"destination": destination}
    if title:
        payload["title"] = title
    if alias:
        payload["customAlias"] = alias
    if qr:
        payload["generateQR"] = True

    res = requests.post(f"{BASE}/api/v1/shorten",
                        json=payload, headers=headers)
    return res.json()

# Usage
result = shorten_link("https://example.com",
                      title="My Link", qr=True)
print(result)`}
              </code>
            </pre>
          </section>

          <div className="mt-16 border-t border-border pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to get started?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Generate your first API key and start building.</p>
              </div>
              <Button asChild>
                <Link href="/dashboard/settings">
                  Get API Key <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </DocsNavClient>

      <LandingFooter />
    </div>
  );
}
