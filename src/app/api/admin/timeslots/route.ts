import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

// GET all time slots
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const slots = await prisma.timeSlot.findMany({ orderBy: { startTime: "asc" } });
  return NextResponse.json(slots);
}

// POST new time slot
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { label, startTime, endTime } = await req.json();
  if (!label || !startTime || !endTime) {
    return NextResponse.json({ error: "請填寫所有欄位" }, { status: 400 });
  }

  const slot = await prisma.timeSlot.create({
    data: { label, startTime, endTime },
  });
  return NextResponse.json(slot);
}

// PATCH update time slot
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { id, label, startTime, endTime } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

  const data: Record<string, string> = {};
  if (label !== undefined) data.label = label;
  if (startTime !== undefined) data.startTime = startTime;
  if (endTime !== undefined) data.endTime = endTime;

  const slot = await prisma.timeSlot.update({ where: { id }, data });
  return NextResponse.json(slot);
}

// DELETE time slot
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

  const usageCount = await prisma.registration.count({ where: { timeSlotId: id } });
  if (usageCount > 0) {
    return NextResponse.json({ error: "此時段已有報名記錄，無法刪除" }, { status: 400 });
  }

  await prisma.timeSlot.delete({ where: { id } });
  return NextResponse.json({ message: "已刪除" });
}
