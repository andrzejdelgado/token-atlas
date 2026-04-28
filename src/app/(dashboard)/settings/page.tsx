"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimestampCell } from "@/components/common/timestamp-cell";
import { toast } from "sonner";

interface ISettings {
  figmaPersonalAccessToken?: string;
  figmaFileKey?: string;
  storybookGithubToken?: string;
  storybookRepoUrl?: string;
  storybookBranch?: string;
  storybookTokenPath?: string;
}

interface IUser {
  _id: string;
  name?: string;
  email: string;
  role: string;
  createdAt: string;
}

interface ITheme {
  _id: string;
  name: string;
  slug: string;
  isBase: boolean;
}

function MaskedInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setShow(!show)}
        disabled={disabled}
        className="shrink-0"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [settings, setSettings] = useState<ISettings>({});
  const [users, setUsers] = useState<IUser[]>([]);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [togglingTheme, setTogglingTheme] = useState<string | null>(null);
  const [savingFigma, setSavingFigma] = useState(false);
  const [savingStorybook, setSavingStorybook] = useState(false);
  const [testingFigma, setTestingFigma] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.data ?? {}));
    if (isAdmin) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setUsers(d.data ?? []));
      fetch("/api/themes")
        .then((r) => r.json())
        .then((d) => setThemes(d.data ?? []));
    }
    setProfileName(session?.user?.name ?? "");
  }, [isAdmin, session]);

  async function saveFigmaSettings() {
    setSavingFigma(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaPersonalAccessToken: settings.figmaPersonalAccessToken,
          figmaFileKey: settings.figmaFileKey,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Figma settings saved");
    } catch {
      toast.error("Failed to save Figma settings");
    } finally {
      setSavingFigma(false);
    }
  }

  async function testFigmaConnection() {
    if (!settings.figmaPersonalAccessToken || !settings.figmaFileKey) {
      toast.error("Enter PAT and file key first");
      return;
    }
    setTestingFigma(true);
    try {
      const res = await fetch(
        `https://api.figma.com/v1/files/${settings.figmaFileKey}/variables/local`,
        { headers: { "X-Figma-Token": settings.figmaPersonalAccessToken } }
      );
      if (res.ok) toast.success("Connected to Figma successfully");
      else toast.error("Figma connection failed — check your credentials");
    } catch {
      toast.error("Failed to reach Figma API");
    } finally {
      setTestingFigma(false);
    }
  }

  async function saveStorybookSettings() {
    setSavingStorybook(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storybookGithubToken: settings.storybookGithubToken,
          storybookRepoUrl: settings.storybookRepoUrl,
          storybookBranch: settings.storybookBranch,
          storybookTokenPath: settings.storybookTokenPath,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Storybook settings saved");
    } catch {
      toast.error("Failed to save Storybook settings");
    } finally {
      setSavingStorybook(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
      toast.success("Role updated");
    } else {
      toast.error("Failed to update role");
    }
  }

  async function removeUser(userId: string) {
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success("User removed");
    } else {
      toast.error("Failed to remove user");
    }
  }

  async function toggleThemeIsBase(themeId: string, newIsBase: boolean) {
    setTogglingTheme(themeId);
    try {
      const res = await fetch(`/api/themes/${themeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBase: newIsBase }),
      });
      if (!res.ok) throw new Error();
      setThemes((prev) => prev.map((t) => (t._id === themeId ? { ...t, isBase: newIsBase } : t)));
      toast.success(`Theme marked as ${newIsBase ? "base" : "modifier"}`);
    } catch {
      toast.error("Failed to update theme");
    } finally {
      setTogglingTheme(null);
    }
  }

  async function saveProfile() {
    if (!session?.user?.id) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Settings" />

      {/* Figma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="">◈</span> Figma
          </CardTitle>
          {!isAdmin && (
            <CardDescription>You have read-only access to these settings.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Personal Access Token</Label>
            <MaskedInput
              value={settings.figmaPersonalAccessToken ?? ""}
              onChange={(v) => setSettings((p) => ({ ...p, figmaPersonalAccessToken: v }))}
              placeholder="figd_…"
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-1.5">
            <Label>File key</Label>
            <Input
              value={settings.figmaFileKey ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, figmaFileKey: e.target.value }))}
              placeholder="Paste your Figma file key"
              disabled={!isAdmin}
            />
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={testFigmaConnection} disabled={testingFigma}>
                {testingFigma && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test connection
              </Button>
              <Button onClick={saveFigmaSettings} disabled={savingFigma}>
                {savingFigma && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storybook */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="">◉</span> Storybook
              <Badge variant="outline" className="ml-1 text-xs">
                Admin only
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>GitHub token</Label>
              <MaskedInput
                value={settings.storybookGithubToken ?? ""}
                onChange={(v) => setSettings((p) => ({ ...p, storybookGithubToken: v }))}
                placeholder="ghp_…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repository URL</Label>
              <Input
                value={settings.storybookRepoUrl ?? ""}
                onChange={(e) => setSettings((p) => ({ ...p, storybookRepoUrl: e.target.value }))}
                placeholder="https://github.com/org/repo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Input
                  value={settings.storybookBranch ?? "main"}
                  onChange={(e) => setSettings((p) => ({ ...p, storybookBranch: e.target.value }))}
                  placeholder="main"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Token file path</Label>
                <Input
                  value={settings.storybookTokenPath ?? "tokens/tokens.json"}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, storybookTokenPath: e.target.value }))
                  }
                  placeholder="tokens/tokens.json"
                />
              </div>
            </div>
            <Button onClick={saveStorybookSettings} disabled={savingStorybook}>
              {savingStorybook && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Themes */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Themes</CardTitle>
            <CardDescription>
              Mark a theme as <strong>Base</strong> to give it its own full set of token values.
              Mark it as <strong>Modifier</strong> to let it override specific tokens on top of a
              base theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-24 text-right">Base theme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {themes.map((theme) => (
                  <TableRow key={theme._id}>
                    <TableCell className="font-medium">{theme.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {theme.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={theme.isBase ? "default" : "secondary"} className="text-xs">
                        {theme.isBase ? "Base" : "Modifier"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={theme.isBase}
                        disabled={togglingTheme === theme._id}
                        onCheckedChange={(v) => toggleThemeIsBase(theme._id, v)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Management</CardTitle>
            <CardDescription>Manage workspace members and their roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(role) => changeRole(user._id, role)}
                        disabled={user._id === session?.user?.id}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TimestampCell date={user.createdAt} />
                    </TableCell>
                    <TableCell>
                      {user._id !== session?.user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive h-7 w-7"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove{" "}
                                <span className="font-medium">{user.name ?? user.email}</span> from
                                the workspace. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => removeUser(user._id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={session?.user?.email ?? ""} disabled />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} size="sm">
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
