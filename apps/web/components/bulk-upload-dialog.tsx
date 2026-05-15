"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function BulkUploadDialog({
  onCreate,
}: {
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const entries = (formData.get("entries") as string).trim();
    if (!entries) {
      setError("Please enter at least one entry.");
      setPending(false);
      return;
    }
    try {
      await onCreate(formData);
      setOpen(false);
    } catch {
      setError("Unable to bulk create.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload size={16} /> Bulk Upload
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Entries
              </label>
              <p className="text-xs text-muted-foreground">
                One per line. Format: <code>destination, title, customAlias</code>
              </p>
              <textarea
                name="entries"
                rows={8}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
                placeholder={`https://example.com/page1, Campaign 1, my-alias1\nhttps://example.com/page2, Campaign 2, my-alias2`}
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
                <Upload size={16} />{" "}
                {pending ? "Creating..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
