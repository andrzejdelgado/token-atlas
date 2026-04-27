"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileJson, AlertTriangle, CheckCircle2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Stage = "idle" | "previewing" | "importing" | "done";

interface PreviewData {
  fileName: string;
  rawTokens: unknown;
  count: number;
  conflicts: string[];
}

function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        toast.error("Please upload a .json file");
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/40"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleChange}
        className="sr-only"
      />

      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-full transition-colors",
        dragging ? "bg-primary/10" : "bg-muted"
      )}>
        <Upload className={cn("h-7 w-7 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
      </div>

      <div className="space-y-1">
        <p className="text-base font-medium">
          {dragging ? "Release to upload" : "Drop your JSON file here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or{" "}
          <span className="text-primary underline underline-offset-2 hover:no-underline">
            browse to choose a file
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileJson className="h-3.5 w-3.5" />
        <span>W3C Design Token Format (.json)</span>
      </div>
    </div>
  );
}

function PreviewPanel({
  preview,
  importing,
  onConfirm,
  onReset,
}: {
  preview: PreviewData;
  importing: boolean;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const newCount = preview.count - preview.conflicts.length;

  return (
    <div className="space-y-5">
      {/* File info bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <FileJson className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">{preview.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {preview.count} token{preview.count !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="rounded p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Choose a different file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{newCount}</p>
            <p className="text-xs text-muted-foreground">New tokens will be created</p>
          </div>
        </div>
        <div className={cn(
          "rounded-lg border px-4 py-3 flex items-start gap-3",
          preview.conflicts.length > 0
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-muted/30"
        )}>
          <AlertTriangle className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            preview.conflicts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )} />
          <div>
            <p className={cn(
              "text-sm font-semibold",
              preview.conflicts.length > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
            )}>{preview.conflicts.length}</p>
            <p className="text-xs text-muted-foreground">
              Existing tokens will be updated
            </p>
          </div>
        </div>
      </div>

      {/* Conflicts list */}
      {preview.conflicts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Conflicts</p>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {preview.conflicts.length}
            </Badge>
            <p className="text-xs text-muted-foreground">— these tokens already exist and their values will be overwritten</p>
          </div>
          <ScrollArea className="h-40 rounded-lg border bg-muted/20">
            <div className="p-3 space-y-1">
              {preview.conflicts.map((name) => (
                <div key={name} className="flex items-center gap-2 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs text-foreground">{name}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={onReset} disabled={importing}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Choose different file
        </Button>
        <Button onClick={onConfirm} disabled={importing || preview.count === 0}>
          {importing ? (
            <>
              <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
              Importing…
            </>
          ) : (
            <>Import {preview.count} token{preview.count !== 1 ? "s" : ""}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function DonePanel({ count, onReset }: { count: number; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Import complete</p>
        <p className="text-sm text-muted-foreground">
          {count} token{count !== 1 ? "s" : ""} imported successfully
        </p>
      </div>
      <Button variant="outline" onClick={onReset}>
        <Upload className="mr-2 h-4 w-4" />
        Import another file
      </Button>
    </div>
  );
}

export default function ImportPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  async function handleFile(file: File) {
    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      toast.error("Invalid JSON file — could not parse");
      return;
    }

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: parsed, confirm: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to parse tokens");
      setPreview({
        fileName: file.name,
        rawTokens: parsed,
        count: json.count,
        conflicts: json.conflicts ?? [],
      });
      setStage("previewing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to preview import");
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setStage("importing");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: preview.rawTokens, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setDoneCount(json.count);
      setStage("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
      setStage("previewing");
    }
  }

  function handleReset() {
    setStage("idle");
    setPreview(null);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import Tokens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import design tokens from a W3C Design Token Format JSON file. New tokens are added to the Foundations collection; existing tokens with the same name are updated.
        </p>
      </div>

      {stage === "idle" && <DropZone onFile={handleFile} />}

      {(stage === "previewing" || stage === "importing") && preview && (
        <PreviewPanel
          preview={preview}
          importing={stage === "importing"}
          onConfirm={handleConfirm}
          onReset={handleReset}
        />
      )}

      {stage === "done" && (
        <DonePanel count={doneCount} onReset={handleReset} />
      )}

      {/* Format guide */}
      {stage === "idle" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected format</p>
          <pre className="text-xs text-foreground/80 overflow-x-auto">{`{
  "color": {
    "primary": { "$value": "#0066cc", "$type": "color" },
    "secondary": { "$value": "#6b7280", "$type": "color" }
  },
  "spacing": {
    "sm": { "$value": 8, "$type": "number" }
  }
}`}</pre>
        </div>
      )}
    </div>
  );
}
