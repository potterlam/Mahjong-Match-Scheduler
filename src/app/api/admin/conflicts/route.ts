import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

// GET /api/admin/conflicts — list all conflict pairs
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const conflicts = await prisma.userConflict.findMany({
    include: {
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
    },
    orderBy: { userAId: "asc" },
  });

  return NextResponse.json(conflicts);
}

// POST /api/admin/conflicts — add a conflict pair
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  try {
    const { userAId, userBId, reason } = await req.json();

    if (!userAId || !userBId) {
      return NextResponse.json({ error: "請選擇兩位用戶" }, { status: 400 });
    }

    if (userAId === userBId) {
      return NextResponse.json({ error: "不能自己同自己衝突" }, { status: 400 });
    }

    // Always store with smaller ID first to avoid duplicates
    const [smallerId, largerId] = [userAId, userBId].sort();

    const existing = await prisma.userConflict.findFirst({
      where: {
        OR: [
          { userAId: smallerId, userBId: largerId },
          { userAId: largerId, userBId: smallerId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "此衝突關係已存在" }, { status: 400 });
    }

    const conflict = await prisma.userConflict.create({
      data: {
        userAId: smallerId,
        userBId: largerId,
        reason: reason || "",
      },
      include: {
        userA: { select: { id: true, name: true } },
        userB: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(conflict);
  } catch {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }
}

// DELETE /api/admin/conflicts?id=xxx — remove a conflict pair
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }

  await prisma.userConflict.delete({ where: { id } });
  return NextResponse.json({ message: "已刪除" });
}
