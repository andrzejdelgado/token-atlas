"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, Loader2, Trash2, KeyRound, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface IInvite {
  _id: string;
  email: string;
  token: string;
  expiresAt: string;
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button type="button" variant="ghost" size="icon" onClick={copy} className="h-7 w-7 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: IUser;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleReset() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Password reset for ${user.name ?? user.email}`);
      onOpenChange(false);
      setNewPassword("");
      setConfirm("");
    } else {
      toast.error("Failed to reset password");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-medium">{user.name ?? user.email}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                tabIndex={-1}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirm password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReset} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [settings, setSettings] = useState<ISettings>({});
  const [users, setUsers] = useState<IUser[]>([]);
  const [invites, setInvites] = useState<IInvite[]>([]);
  const [savingFigma, setSavingFigma] = useState(false);
  const [savingStorybook, setSavingStorybook] = useState(false);
  const [testingFigma, setTestingFigma] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<IUser | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.data ?? {}));
    if (isAdmin) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setUsers(d.data ?? []));
      fetch("/api/invites")
        .then((r) => r.json())
        .then((d) => setInvites(d.data ?? []));
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

  async function generateInvite() {
    if (!inviteEmail.trim()) return;
    setGeneratingInvite(true);
    setGeneratedLink(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate invite");
        return;
      }
      const link = `${window.location.origin}/register?token=${data.data.token}`;
      setGeneratedLink(link);
      setInviteEmail("");
      setInvites((prev) => [data.data, ...prev]);
    } catch {
      toast.error("Failed to generate invite");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function revokeInvite(token: string) {
    const res = await fetch(`/api/invites/${token}`, { method: "DELETE" });
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.token !== token));
      toast.success("Invite revoked");
    } else {
      toast.error("Failed to revoke invite");
    }
  }

  const defaultTab = isAdmin ? "team" : "profile";

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* ── Team tab (admin only) ── */}
        {isAdmin && (
          <TabsContent value="team" className="mt-6 space-y-6">
            {/* Invite */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite member</CardTitle>
                <CardDescription>
                  Generate an invite link for a teammate. Links expire after 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="teammate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generateInvite()}
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={generateInvite}
                    disabled={generatingInvite || !inviteEmail.trim()}
                  >
                    {generatingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate invite
                  </Button>
                </div>

                {generatedLink && (
                  <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
                    <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
                      {generatedLink}
                    </span>
                    <CopyButton text={generatedLink} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setGeneratedLink(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {invites.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">Pending invites</p>
                    {invites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex items-center gap-2 rounded-md px-0 py-1"
                      >
                        <span className="text-foreground min-w-0 flex-1 truncate text-sm">
                          {invite.email}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          expires <TimestampCell date={invite.expiresAt} className="inline" />
                        </span>
                        <CopyButton
                          text={`${typeof window !== "undefined" ? window.location.origin : ""}/register?token=${invite.token}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
                          onClick={() => revokeInvite(invite.token)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members</CardTitle>
                <CardDescription>Manage workspace members and their roles.</CardDescription>
              </CardHeader>
              {users.length > 0 && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.email}
                          </TableCell>
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
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground h-7 w-7"
                                onClick={() => setResetTarget(user)}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
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
                                        <span className="font-medium">
                                          {user.name ?? user.email}
                                        </span>{" "}
                                        from the workspace. This action cannot be undone.
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        )}

        {/* ── Workspace tab ── */}
        <TabsContent value="workspace" className="mt-6 space-y-6">
          {/* Figma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>◈</span> Figma
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
                  <span>◉</span> Storybook
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
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, storybookRepoUrl: e.target.value }))
                    }
                    placeholder="https://github.com/org/repo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Branch</Label>
                    <Input
                      value={settings.storybookBranch ?? "main"}
                      onChange={(e) =>
                        setSettings((p) => ({ ...p, storybookBranch: e.target.value }))
                      }
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
        </TabsContent>

        {/* ── Profile tab ── */}
        <TabsContent value="profile" className="mt-6">
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
        </TabsContent>
      </Tabs>

      {/* Reset password dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          open={!!resetTarget}
          onOpenChange={(v) => !v && setResetTarget(null)}
        />
      )}
    </div>
  );
}
