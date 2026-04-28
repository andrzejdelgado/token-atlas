import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Theme } from "@/lib/db/models/theme.model";
import { Group } from "@/lib/db/models/group.model";
import { Settings, type ISettingsDoc } from "@/lib/db/models/settings.model";
import { Notification, type INotificationDoc } from "@/lib/db/models/notification.model";
import mongoose from "mongoose";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TimestampCell } from "@/components/common/timestamp-cell";
import {
  Coins,
  Palette,
  Flag,
  CircleCheck,
  CircleDot,
  Clock,
  Settings as SettingsIcon,
  ExternalLink,
  Layers,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TypeCount {
  _id: string;
  count: number;
}

async function getDashboardData(userId?: string) {
  if (!process.env.MONGODB_URI) {
    return {
      totalTokens: 0,
      totalThemes: 0,
      flaggedCount: 0,
      groupCount: 0,
      typeCounts: [] as TypeCount[],
      settings: null,
      notifications: [] as INotificationDoc[],
    };
  }
  await connectToDatabase();
  const notifQuery =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? Notification.find({ userId, read: false }).sort({ createdAt: -1 }).limit(10).lean()
      : Promise.resolve([]);

  const [totalTokens, totalThemes, flaggedCount, groupCount, typeCounts, settings, notifications] =
    await Promise.all([
      Token.countDocuments(),
      Theme.countDocuments(),
      Token.countDocuments({ flagged: true }),
      Group.countDocuments(),
      Token.aggregate<TypeCount>([
        { $group: { _id: "$tokenType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Settings.findOne({}).lean<ISettingsDoc>(),
      notifQuery,
    ]);
  return {
    totalTokens,
    totalThemes,
    flaggedCount,
    groupCount,
    typeCounts,
    settings,
    notifications: JSON.parse(JSON.stringify(notifications)) as INotificationDoc[],
  };
}

// Stable order so bar segments don't jump on re-render
const TYPE_ORDER = ["Color", "Number", "String", "Boolean"];

const TYPE_BAR: Record<string, string> = {
  Color: "bg-blue-500",
  Number: "bg-emerald-500",
  String: "bg-amber-500",
  Boolean: "bg-purple-500",
};

const TYPE_DOT: Record<string, string> = {
  Color: "bg-blue-500",
  Number: "bg-emerald-500",
  String: "bg-amber-500",
  Boolean: "bg-purple-500",
};

const TYPE_VALUE: Record<string, string> = {
  Color: "text-blue-600 dark:text-blue-400",
  Number: "text-emerald-600 dark:text-emerald-400",
  String: "text-amber-600 dark:text-amber-400",
  Boolean: "text-purple-600 dark:text-purple-400",
};

export default async function HomePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const {
    totalTokens,
    totalThemes,
    flaggedCount,
    groupCount,
    typeCounts,
    settings,
    notifications,
  } = await getDashboardData(userId);

  const figmaConfigured = !!(settings?.figmaPersonalAccessToken && settings?.figmaFileKey);
  const storybookConfigured = !!(settings?.storybookGithubToken && settings?.storybookRepoUrl);

  const sortedTypeCounts = [...typeCounts].sort(
    (a, b) => TYPE_ORDER.indexOf(a._id) - TYPE_ORDER.indexOf(b._id)
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your token library at a glance.</p>
      </div>

      {/* Key metrics */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Coins className="text-muted-foreground h-4 w-4" />}
            label="Total Tokens"
            value={totalTokens.toLocaleString()}
          />
          <StatCard
            icon={<Layers className="text-muted-foreground h-4 w-4" />}
            label="Groups"
            value={groupCount.toLocaleString()}
          />
          <StatCard
            icon={<Flag className="text-muted-foreground h-4 w-4" />}
            label="Flagged"
            value={flaggedCount.toLocaleString()}
            href={flaggedCount > 0 ? "/tokens?flagged=true" : undefined}
            warning={flaggedCount > 0}
            warningLabel="Needs review"
          />
          <StatCard
            icon={<Palette className="text-muted-foreground h-4 w-4" />}
            label="Themes"
            value={totalThemes.toLocaleString()}
          />
        </div>

        {/* Token composition */}
        {totalTokens > 0 && sortedTypeCounts.length > 0 && (
          <CompositionCard typeCounts={sortedTypeCounts} total={totalTokens} />
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-medium">Notifications</h2>
          <Card>
            <CardContent className="divide-border divide-y p-0">
              {notifications.map((n) => (
                <div key={n._id.toString()} className="flex items-start gap-3 px-4 py-3">
                  <Bell className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm">{n.message}</p>
                    {typeof n.metadata?.themeId === "string" && (
                      <Link
                        href={`/themes/${n.metadata.themeId}/review`}
                        className="text-primary mt-0.5 inline-block text-xs hover:underline"
                      >
                        Review theme →
                      </Link>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    <TimestampCell date={n.createdAt} className="inline" />
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connectors */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Connectors</h2>
        <div className="flex flex-col gap-4">
          <ConnectorCard
            name="Figma Variables"
            description="Push tokens as native Figma Variables into your design file."
            icon="◈"
            configured={figmaConfigured}
            lastSync={settings?.lastFigmaSync ?? null}
            configureHref="/connectors"
          />
          <ConnectorCard
            name="Storybook"
            description="Commit a token file to your GitHub repo so Storybook picks it up."
            icon="◉"
            configured={storybookConfigured}
            lastSync={settings?.lastStorybookSync ?? null}
            configureHref="/connectors"
            repoUrl={settings?.storybookRepoUrl}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  warning,
  warningLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  warning?: boolean;
  warningLabel?: string;
}) {
  const isWarning = warning && value !== "0";
  const card = (
    <Card
      className={cn(
        "transition-colors",
        isWarning && "border-amber-300 dark:border-amber-800",
        href && isWarning && "hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-muted-foreground text-xs font-medium">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-bold tabular-nums",
            isWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}
        >
          {value}
        </div>
        {isWarning && warningLabel && (
          <p className="mt-0.5 text-[11px] font-medium text-amber-600/70 dark:text-amber-400/70">
            {warningLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href && isWarning) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}

function CompositionCard({ typeCounts, total }: { typeCounts: TypeCount[]; total: number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-medium">Token types</p>
          <div className="bg-muted flex h-1.5 gap-px overflow-hidden rounded-full">
            {typeCounts.map(({ _id, count }) => (
              <div
                key={_id}
                className={cn("h-full transition-all", TYPE_BAR[_id] ?? "bg-muted-foreground/40")}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${_id}: ${count} (${Math.round((count / total) * 100)}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {typeCounts.map(({ _id, count }) => (
              <div key={_id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    TYPE_DOT[_id] ?? "bg-muted-foreground"
                  )}
                />
                <span className="text-muted-foreground text-xs">{_id}</span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    TYPE_VALUE[_id] ?? "text-foreground"
                  )}
                >
                  {count}
                </span>
                <span className="text-muted-foreground/60 text-[11px] tabular-nums">
                  {Math.round((count / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectorCard({
  name,
  description,
  icon,
  configured,
  lastSync,
  configureHref,
  repoUrl,
}: {
  name: string;
  description: string;
  icon: string;
  configured: boolean;
  lastSync: Date | string | null;
  configureHref: string;
  repoUrl?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
            </div>
          </div>
          {configured ? (
            <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              <CircleCheck className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 pt-0.5 text-xs">
              <CircleDot className="h-3.5 w-3.5" />
              Not configured
            </span>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        {!configured ? (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Set up this connector to start syncing.</p>
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
              <Link href={configureHref}>
                <SettingsIcon className="h-3.5 w-3.5" />
                Configure
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground bg-muted inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {repoUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href={configureHref}>
                  <SettingsIcon className="h-3.5 w-3.5" />
                  Manage
                </Link>
              </Button>
            )}
            {lastSync && (
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 shrink-0" />
                <TimestampCell date={lastSync} className="inline" />
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
