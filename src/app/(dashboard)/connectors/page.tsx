"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Loader2, CircleCheck, CircleDot, ArrowUpFromLine,
  Clock, Settings, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TimestampCell } from "@/components/common/timestamp-cell";
import { toast } from "sonner";

interface ISettings {
  figmaPersonalAccessToken?: string;
  figmaFileKey?: string;
  storybookGithubToken?: string;
  storybookRepoUrl?: string;
  storybookBranch?: string;
  storybookTokenPath?: string;
  lastFigmaSync?: string;
  lastStorybookSync?: string;
}

interface ITheme {
  _id: string;
  name: string;
}

function maskToken(token?: string) {
  if (!token || token.length < 8) return "••••••••";
  return `••••••${token.slice(-4)}`;
}

function ConnectorSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <Skeleton className="h-8 w-40" />
      </CardContent>
    </Card>
  );
}

export default function ConnectorsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<ISettings | null | undefined>(undefined);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [figmaPushing, setFigmaPushing] = useState(false);
  const [storybookPushing, setStorybookPushing] = useState(false);

  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/themes").then((r) => r.json()),
    ]).then(([s, t]) => {
      setSettings(s.data ?? null);
      setThemes(t.data ?? []);
    });
  }, []);

  async function pushToFigma() {
    setFigmaPushing(true);
    try {
      const res = await fetch("/api/figma/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: selectedTheme === "all" ? undefined : selectedTheme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(data.message);
      setSettings((prev) => prev ? { ...prev, lastFigmaSync: new Date().toISOString() } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Figma push failed");
    } finally {
      setFigmaPushing(false);
    }
  }

  async function pushToStorybook() {
    setStorybookPushing(true);
    try {
      const res = await fetch("/api/storybook/push", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(data.message);
      setSettings((prev) => prev ? { ...prev, lastStorybookSync: new Date().toISOString() } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Storybook push failed");
    } finally {
      setStorybookPushing(false);
    }
  }

  const figmaConfigured = !!(settings?.figmaPersonalAccessToken && settings?.figmaFileKey);
  const storybookConfigured = !!(settings?.storybookGithubToken && settings?.storybookRepoUrl);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Connectors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sync your design tokens to external tools in one click.
        </p>
      </div>

      {settings === undefined ? (
        <div className="space-y-4">
          <ConnectorSkeleton />
          <ConnectorSkeleton />
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Figma Variables ── */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl shrink-0">
                    ◈
                  </div>
                  <div>
                    <CardTitle className="text-base">Figma Variables</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Push tokens as native Figma Variables into your design file.
                    </CardDescription>
                  </div>
                </div>
                {figmaConfigured ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 shrink-0 pt-0.5">
                    <CircleCheck className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pt-0.5">
                    <CircleDot className="h-3.5 w-3.5" />
                    Not configured
                  </span>
                )}
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-4 space-y-4">
              {!figmaConfigured ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add your Figma access token and file key to get started.
                  </p>
                  <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                    <Link href="/settings">
                      <Settings className="h-3.5 w-3.5" />
                      Configure
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                      {maskToken(settings?.figmaPersonalAccessToken)}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>File: <span className="">{settings?.figmaFileKey}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="Select theme…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All tokens</SelectItem>
                        {themes.map((t) => (
                          <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={pushToFigma} disabled={figmaPushing} className="gap-1.5">
                      {figmaPushing
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                      Push to Figma
                    </Button>
                    {settings?.lastFigmaSync && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="h-3 w-3 shrink-0" />
                        <TimestampCell date={settings.lastFigmaSync} className="inline" />
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Storybook ── */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl shrink-0">
                    ◉
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Storybook</CardTitle>
                      {!isAdmin && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">Admin only</Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Commit a token file to your GitHub repo so Storybook picks it up automatically.
                    </CardDescription>
                  </div>
                </div>
                {storybookConfigured ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 shrink-0 pt-0.5">
                    <CircleCheck className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pt-0.5">
                    <CircleDot className="h-3.5 w-3.5" />
                    Not configured
                  </span>
                )}
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-4 space-y-4">
              {!storybookConfigured ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add your GitHub token and repository URL to get started.
                  </p>
                  <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                    <Link href="/settings">
                      <Settings className="h-3.5 w-3.5" />
                      Configure
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  {settings?.storybookRepoUrl && (
                    <a
                      href={settings.storybookRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted px-2 py-1 rounded"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {settings.storybookRepoUrl.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={pushToStorybook}
                      disabled={storybookPushing || !isAdmin}
                      className="gap-1.5"
                    >
                      {storybookPushing
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                      Push to Storybook
                    </Button>
                    {settings?.lastStorybookSync && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="h-3 w-3 shrink-0" />
                        <TimestampCell date={settings.lastStorybookSync} className="inline" />
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
