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

// GET /api/admin/registrations?date=2026-04-13
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const where = date ? { date: new Date(date) } : {};

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      timeSlot: true,
      location: true,
      foods: { include: { foodOption: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json(registrations);
}

// POST /api/admin/registrations — admin creates registration on behalf of a user
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  try {
    const { userId, date, timeSlotId, locationId, foodIds, notes } = await req.json();

    if (!userId || !date || !timeSlotId || !locationId) {
      return NextResponse.json({ error: "請填寫所有必要欄位" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "找不到此用戶" }, { status: 404 });
    }

    const registration = await prisma.registration.create({
      data: {
        userId,
        date: new Date(date),
        timeSlotId,
        locationId,
        notes: notes || "",
        foods: {
          create: (foodIds || []).map((foodOptionId: string) => ({
            foodOptionId,
            quantity: 1,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        timeSlot: true,
        location: true,
        foods: { include: { foodOption: true } },
      },
    });

    return NextResponse.json(registration);
  } catch {
    return NextResponse.json({ error: "新增失敗，請稍後再試" }, { status: 500 });
  }
}

// PATCH /api/admin/registrations — admin edits any registration
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  try {
    const { id, timeSlotId, locationId, foodIds, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "缺少報名 ID" }, { status: 400 });
    }

    const existing = await prisma.registration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "找不到此報名" }, { status: 404 });
    }

    // Delete old foods and update registration
    await prisma.registrationFood.deleteMany({
      where: { registrationId: id },
    });

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        ...(timeSlotId && { timeSlotId }),
        ...(locationId && { locationId }),
        ...(notes !== undefined && { notes }),
        foods: {
          create: (foodIds || []).map((foodOptionId: string) => ({
            foodOptionId,
            quantity: 1,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        timeSlot: true,
        location: true,
        foods: { include: { foodOption: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "更新失敗，請稍後再試" }, { status: 500 });
  }
}

// DELETE /api/admin/registrations?id=xxx — admin removes any registration
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

  const existing = await prisma.registration.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "找不到此報名" }, { status: 404 });
  }

  await prisma.registration.delete({ where: { id } });
  return NextResponse.json({ message: "已刪除" });
}
