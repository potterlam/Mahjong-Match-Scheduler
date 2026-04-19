import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

function generateSlug() {
  return crypto.randomBytes(6).toString("hex");
}

// GET all events (admin only)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const events = await prisma.event.findMany({
    include: { responses: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events);
}

// POST create event (admin only)
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { title, description, date, time, location } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "請輸入活動名稱" }, { status: 400 });

  const event = await prisma.event.create({
    data: {
      slug: generateSlug(),
      title: title.trim(),
      description: description || "",
      date: date || "",
      time: time || "",
      location: location || "",
    },
    include: { responses: true },
  });
  return NextResponse.json(event);
}

// PATCH update event (admin only)
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { id, title, description, date, time, location, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (date !== undefined) data.date = date;
  if (time !== undefined) data.time = time;
  if (location !== undefined) data.location = location;
  if (isActive !== undefined) data.isActive = isActive;

  const event = await prisma.event.update({
    where: { id },
    data,
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(event);
}

// DELETE event (admin only)
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ message: "已刪除" });
}
