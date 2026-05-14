"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function CreateLinkForm({
  createLink,
}: {
  createLink: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create short link</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="title">
                Title
              </label>
              <Input id="title" name="title" placeholder="Campaign title" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="destination">
                Destination URL
              </label>
              <Input
                id="destination"
                name="destination"
                placeholder="https://example.com/very/long/url"
                required
                type="url"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="customAlias">
                Custom back-half
              </label>
              <Input
                id="customAlias"
                name="customAlias"
                placeholder="Custom back-half"
                pattern="[a-zA-Z0-9_-]{3,48}"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="expiresAt">
                Expiration
              </label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                Password (optional)
              </label>
              <Input
                id="password"
                name="password"
                placeholder="Optional password"
                type="password"
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                <Plus size={16} />{" "}
                {pending ? "Creating..." : "Shorten URL"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
