import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Token } from "@/lib/db/models/token.model";
import { AuditLog } from "@/lib/db/models/audit-log.model";
import { applyBulkRename } from "@/lib/utils/token-names";
import type { BulkRenameOptions } from "@/types/token";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  await connectToDatabase();
  const { action, tokenIds, payload } = await req.json();

  if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
    return NextResponse.json({ error: "tokenIds required" }, { status: 400 });
  }

  const userId = session.user.id;

  switch (action) {
    case "rename": {
      const options = payload as BulkRenameOptions;
      const tokens = await Token.find({ _id: { $in: tokenIds } }).lean();
      const updates = tokens.map((t) => ({
        id: t._id.toString(),
        oldName: t.name,
        newName: applyBulkRename(t.name, options),
      }));
      await Promise.all(
        updates.map(({ id, newName, oldName }) =>
          Token.findByIdAndUpdate(id, { name: newName, updatedBy: userId }).then(() =>
            AuditLog.create({
              tokenId: id,
              userId,
              action: "renamed",
              before: { name: oldName },
              after: { name: newName },
              timestamp: new Date(),
            })
          )
        )
      );
      return NextResponse.json({ message: `Renamed ${tokenIds.length} tokens` });
    }

    case "move": {
      const { groupId } = payload;
      await Token.updateMany({ _id: { $in: tokenIds } }, { group: groupId, updatedBy: userId });
      await AuditLog.insertMany(
        tokenIds.map((id: string) => ({
          tokenId: id,
          userId,
          action: "moved",
          after: { group: groupId },
          timestamp: new Date(),
        }))
      );
      return NextResponse.json({ message: `Moved ${tokenIds.length} tokens` });
    }

    case "flag": {
      const { flagged } = payload;
      await Token.updateMany({ _id: { $in: tokenIds } }, { flagged, updatedBy: userId });
      await AuditLog.insertMany(
        tokenIds.map((id: string) => ({
          tokenId: id,
          userId,
          action: flagged ? "flagged" : "unflagged",
          after: { flagged },
          timestamp: new Date(),
        }))
      );
      return NextResponse.json({ message: `Flagged ${tokenIds.length} tokens` });
    }

    case "label": {
      const { labels } = payload;
      await Token.updateMany(
        { _id: { $in: tokenIds } },
        { $addToSet: { labels: { $each: labels } }, updatedBy: userId }
      );
      await AuditLog.insertMany(
        tokenIds.map((id: string) => ({
          tokenId: id,
          userId,
          action: "labeled",
          after: { labels },
          timestamp: new Date(),
        }))
      );
      return NextResponse.json({ message: `Labeled ${tokenIds.length} tokens` });
    }

    case "delete": {
      const tokens = await Token.find({ _id: { $in: tokenIds } }).lean();
      await Token.deleteMany({ _id: { $in: tokenIds } });
      await AuditLog.insertMany(
        tokens.map((t) => ({
          tokenId: t._id.toString(),
          userId,
          action: "deleted",
          before: JSON.parse(JSON.stringify(t)),
          timestamp: new Date(),
        }))
      );
      return NextResponse.json({ message: `Deleted ${tokenIds.length} tokens` });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
