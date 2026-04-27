import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { Theme } from "@/lib/db/models/theme.model";
import { Group } from "@/lib/db/models/group.model";
import { Settings, type ISettingsDoc } from "@/lib/db/models/settings.model";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TimestampCell } from "@/components/common/timestamp-cell";
import {
  Coins, Palette, Flag,
  CircleCheck, CircleDot, Clock, Settings as SettingsIcon, ExternalLink, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TypeCount {
  _id: string;
  count: number;
}

async function getDashboardData() {
  if (!process.env.MONGODB_URI) {
    return {
      totalTokens: 0, totalThemes: 0, flaggedCount: 0,
      groupCount: 0, typeCounts: [] as TypeCount[], settings: null,
    };
  }
  await connectToDatabase();
  const [totalTokens, totalThemes, flaggedCount, groupCount, typeCounts, settings] = await Promise.all([
    Token.countDocuments(),
    Theme.countDocuments(),
    Token.countDocuments({ flagged: true }),
    Group.countDocuments(),
    Token.aggregate<TypeCount>([
      { $group: { _id: "$tokenType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Settings.findOne({}).lean<ISettingsDoc>(),
  ]);
  return { totalTokens, totalThemes, flaggedCount, groupCount, typeCounts, settings };
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
  await auth();
  const {
    totalTokens, totalThemes, flaggedCount,
    groupCount, typeCounts, settings,
  } = await getDashboardData();

  const figmaConfigured = !!(settings?.figmaPersonalAccessToken && settings?.figmaFileKey);
  const storybookConfigured = !!(settings?.storybookGithubToken && settings?.storybookRepoUrl);

  const sortedTypeCounts = [...typeCounts].sort(
    (a, b) => TYPE_ORDER.indexOf(a._id) - TYPE_ORDER.indexOf(b._id)
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your token library at a glance.
        </p>
      </div>

      {/* Key metrics */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Coins className="h-4 w-4 text-muted-foreground" />}
            label="Total Tokens"
            value={totalTokens.toLocaleString()}
          />
          <StatCard
            icon={<Layers className="h-4 w-4 text-muted-foreground" />}
            label="Groups"
            value={groupCount.toLocaleString()}
          />
          <StatCard
            icon={<Flag className="h-4 w-4 text-muted-foreground" />}
            label="Flagged"
            value={flaggedCount.toLocaleString()}
            href={flaggedCount > 0 ? "/tokens?flagged=true" : undefined}
            warning={flaggedCount > 0}
            warningLabel="Needs review"
          />
          <StatCard
            icon={<Palette className="h-4 w-4 text-muted-foreground" />}
            label="Themes"
            value={totalThemes.toLocaleString()}
          />
        </div>

        {/* Token composition */}
        {totalTokens > 0 && sortedTypeCounts.length > 0 && (
          <CompositionCard typeCounts={sortedTypeCounts} total={totalTokens} />
        )}
      </div>

      {/* Connectors */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Connectors</h2>
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
    <Card className={cn(
      "transition-colors",
      isWarning && "border-amber-300 dark:border-amber-800",
      href && isWarning && "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-3xl font-bold tabular-nums",
          isWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground",
        )}>
          {value}
        </div>
        {isWarning && warningLabel && (
          <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5 font-medium">
            {warningLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href && isWarning) {
    return <Link href={href} className="block">{card}</Link>;
  }
  return card;
}

function CompositionCard({
  typeCounts,
  total,
}: {
  typeCounts: TypeCount[];
  total: number;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Token types</p>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted gap-px">
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
                <span className={cn("h-2 w-2 rounded-full shrink-0", TYPE_DOT[_id] ?? "bg-muted-foreground")} />
                <span className="text-xs text-muted-foreground">{_id}</span>
                <span className={cn("text-xs font-semibold tabular-nums", TYPE_VALUE[_id] ?? "text-foreground")}>
                  {count}
                </span>
                <span className="text-[11px] text-muted-foreground/60 tabular-nums">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl shrink-0">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          {configured ? (
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

      <CardContent className="pt-4">
        {!configured ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Set up this connector to start syncing.</p>
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
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted px-2 py-1 rounded"
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
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
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
