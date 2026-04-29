import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/user.model";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_SIZE = 1 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (session.user.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json(
      { error: "Invalid file type. Only PNG, JPG, JPEG are allowed." },
      { status: 400 }
    );
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large. Maximum size is 1MB." }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const avatarsDir = join(process.cwd(), "public", "avatars");

  await mkdir(avatarsDir, { recursive: true });
  await writeFile(join(avatarsDir, filename), Buffer.from(await file.arrayBuffer()));

  const avatarUrl = `/avatars/${filename}`;

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const existing = await User.findById(id).lean();
  if (existing?.avatarUrl?.startsWith("/avatars/")) {
    await unlink(join(process.cwd(), "public", existing.avatarUrl)).catch(() => {});
  }

  await User.findByIdAndUpdate(id, { avatarUrl });
  return NextResponse.json({ data: { avatarUrl } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (session.user.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();

  const user = await User.findById(id).lean();
  if (user?.avatarUrl?.startsWith("/avatars/")) {
    await unlink(join(process.cwd(), "public", user.avatarUrl)).catch(() => {});
  }

  await User.findByIdAndUpdate(id, { $unset: { avatarUrl: 1 } });
  return NextResponse.json({ message: "Avatar removed" });
}
