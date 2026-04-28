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
  Palette,
  Flag,
  CircleCheck,
  CircleDot,
  Clock,
  Settings as SettingsIcon,
  ExternalLink,
  Layers,
  Coins,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { NotificationsCard } from "@/components/common/notifications-card";
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
      inReviewThemes: 0,
      lastModified: null as Date | null,
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

  const [
    totalTokens,
    totalThemes,
    flaggedCount,
    groupCount,
    inReviewThemes,
    lastModifiedToken,
    typeCounts,
    settings,
    notifications,
  ] = await Promise.all([
    Token.countDocuments(),
    Theme.countDocuments(),
    Token.countDocuments({ flagged: true }),
    Group.countDocuments(),
    Theme.countDocuments({ status: "draft", reviewerId: { $exists: true, $ne: null } }),
    Token.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1 }).lean(),
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
    inReviewThemes,
    lastModified: (lastModifiedToken as { updatedAt?: Date } | null)?.updatedAt ?? null,
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
    inReviewThemes,
    lastModified,
    typeCounts,
    settings,
    notifications,
  } = await getDashboardData(userId);

  const figmaConfigured = !!(settings?.figmaPersonalAccessToken && settings?.figmaFileKey);
  const storybookConfigured = !!(settings?.storybookGithubToken && settings?.storybookRepoUrl);

  const sortedTypeCounts = [...typeCounts].sort(
    (a, b) => TYPE_ORDER.indexOf(a._id) - TYPE_ORDER.indexOf(b._id)
  );

  const actionItems = [
    flaggedCount > 0 && {
      key: "flagged",
      icon: <Flag className="h-4 w-4" />,
      count: flaggedCount,
      label: flaggedCount === 1 ? "flagged token" : "flagged tokens",
      description: "Tokens marked for review by your team",
      cta: "Review",
      href: "/tokens?flagged=true",
      color: "purple" as const,
    },
    inReviewThemes > 0 && {
      key: "review",
      icon: <ClipboardCheck className="h-4 w-4" />,
      count: inReviewThemes,
      label: inReviewThemes === 1 ? "theme in review" : "themes in review",
      description: "Awaiting approval before going to production",
      cta: "Open",
      href: "/themes",
      color: "blue" as const,
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ReactNode;
    count: number;
    label: string;
    description: string;
    cta: string;
    href: string;
    color: "purple" | "blue";
  }[];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your token library at a glance.</p>
      </div>

      {/* Zone 1: Action items */}
      {actionItems.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Needs attention
          </h2>
          <div className="flex flex-col gap-3">
            {actionItems.map((item) => (
              <ActionCard key={item.key} {...item} />
            ))}
          </div>
        </div>
      ) : totalTokens > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Everything looks good — no items need your attention.
          </p>
        </div>
      ) : null}

      {/* Zone 2: Library stats */}
      {totalTokens > 0 && (
        <div className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Library
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LibraryStat
              icon={<Coins className="h-3.5 w-3.5" />}
              label="Tokens"
              value={totalTokens.toLocaleString()}
              href="/tokens"
            />
            <LibraryStat
              icon={<Layers className="h-3.5 w-3.5" />}
              label="Groups"
              value={groupCount.toLocaleString()}
            />
            <LibraryStat
              icon={<Palette className="h-3.5 w-3.5" />}
              label="Themes"
              value={totalThemes.toLocaleString()}
              href="/themes"
            />
            <LibraryStat
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Last modified"
              value={null}
              date={lastModified}
            />
          </div>

          {sortedTypeCounts.length > 0 && (
            <CompositionCard typeCounts={sortedTypeCounts} total={totalTokens} />
          )}
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && <NotificationsCard initialNotifications={notifications} />}

      {/* Sync */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sync</h2>
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

function ActionCard({
  icon,
  count,
  label,
  description,
  cta,
  href,
  color,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  description: string;
  cta: string;
  href: string;
  color: "purple" | "blue";
}) {
  const styles = {
    purple: {
      border: "border-purple-200 dark:border-purple-900",
      bg: "bg-purple-50/60 dark:bg-purple-950/20",
      iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-400",
      count: "text-purple-700 dark:text-purple-400",
      desc: "text-purple-700/70 dark:text-purple-400/60",
    },
    blue: {
      border: "border-blue-200 dark:border-blue-900",
      bg: "bg-blue-50/60 dark:bg-blue-950/20",
      iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-400",
      count: "text-blue-700 dark:text-blue-400",
      desc: "text-blue-700/70 dark:text-blue-400/60",
    },
  }[color];

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border px-4 py-3.5",
        styles.border,
        styles.bg
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          styles.iconBg
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold tabular-nums", styles.count)}>
          {count} {label}
        </p>
        <p className={cn("mt-0.5 text-xs", styles.desc)}>{description}</p>
      </div>
      <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
        <Link href={href}>
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function LibraryStat({
  icon,
  label,
  value,
  href,
  date,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
  date?: Date | string | null;
}) {
  const inner = (
    <div
      className={cn(
        "bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2.5",
        href && "hover:bg-muted/70 cursor-pointer transition-colors"
      )}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] leading-none">{label}</p>
        <p className="text-foreground mt-1 text-sm font-semibold tabular-nums">
          {value ?? <TimestampCell date={date ?? null} className="inline text-sm font-semibold" />}
        </p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function CompositionCard({ typeCounts, total }: { typeCounts: TypeCount[]; total: number }) {
  return (
    <Card className="py-2">
      <CardContent className="py-2">
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
