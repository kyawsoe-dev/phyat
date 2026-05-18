"use client";

import { useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Campaign = { id: string; name: string };
type Domain = { id: string; domain: string; verified: boolean };

export function CreateLinkForm({
  createLink,
}: {
  createLink: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/campaigns")
        .then((r) => r.ok && r.json())
        .then((data) => setCampaigns(data ?? []))
        .catch(() => {});
      fetch("/api/domains")
        .then((r) => r.ok && r.json())
        .then((data) =>
          setDomains(data?.filter((d: Domain) => d.verified) ?? []),
        )
        .catch(() => {});
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await createLink(formData);
      setOpen(false);
    } catch {
      setError("Unable to create link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Shorten URL
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Create short link</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            {/* Always-visible fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium" htmlFor="destination">
                    Destination URL
                  </label>
                  <Input
                    id="destination"
                    name="destination"
                    placeholder="https://example.com"
                    required
                    type="url"
                    autoFocus
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="title">
                    Title
                  </label>
                  <Input id="title" name="title" placeholder="Campaign title" className="h-9" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="customAlias">
                    Custom back-half
                  </label>
                  <Input
                    id="customAlias"
                    name="customAlias"
                    placeholder="your-custom-slug"
                    pattern="[a-zA-Z0-9_-]{3,48}"
                    className="h-9"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {showAdvanced ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {showAdvanced ? "Hide" : "Show"} advanced options
              </button>

              {/* Advanced fields */}
              {showAdvanced && (
                <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="notes">Notes</label>
                      <Input id="notes" name="notes" placeholder="Internal note" className="h-9" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="tags">Tags</label>
                      <Input id="tags" name="tags" placeholder="social, spring-sale" className="h-9" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">UTM params</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input id="utmSource" name="utmSource" placeholder="Source" className="h-9" />
                      <Input id="utmMedium" name="utmMedium" placeholder="Medium" className="h-9" />
                      <Input id="utmCampaign" name="utmCampaign" placeholder="Campaign" className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="redirectType">
                        Redirect
                      </label>
                      <select
                        id="redirectType"
                        name="redirectType"
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="TEMPORARY">302 temporary</option>
                        <option value="PERMANENT">301 permanent</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="expiresAt">
                        Expiration
                      </label>
                      <Input
                        id="expiresAt"
                        name="expiresAt"
                        type="datetime-local"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="password">
                        Password
                      </label>
                      <Input
                        id="password"
                        name="password"
                        placeholder="Optional"
                        type="password"
                        minLength={6}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="campaignId">
                        Campaign
                      </label>
                      <select
                        id="campaignId"
                        name="campaignId"
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">No campaign</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {domains.length > 0 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium" htmlFor="domainId">
                        Domain
                      </label>
                      <select
                        id="domainId"
                        name="domainId"
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Default domain</option>
                        {domains.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.domain}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="generateQR"
                      defaultChecked
                      className="rounded border-border"
                    />
                    Generate QR code
                  </label>
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="h-9">
                <Plus size={14} />{" "}
                {pending ? "Creating..." : "Shorten URL"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
