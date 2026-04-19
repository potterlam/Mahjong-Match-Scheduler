import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET event by slug (public - no auth)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "缺少活動連結" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { slug },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });

  if (!event || !event.isActive) {
    return NextResponse.json({ error: "找不到此活動或已關閉" }, { status: 404 });
  }

  return NextResponse.json(event);
}

// POST submit response (public - no auth)
export async function POST(req: NextRequest) {
  const { slug, name, joining, notes, email } = await req.json();

  if (!slug || !name?.trim()) {
    return NextResponse.json({ error: "請輸入你的名字" }, { status: 400 });
  }
  if (typeof joining !== "boolean") {
    return NextResponse.json({ error: "請選擇是否參加" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !event.isActive) {
    return NextResponse.json({ error: "找不到此活動或已關閉" }, { status: 404 });
  }

  // Upsert: if same name already responded, update (reset status to pending)
  const response = await prisma.eventResponse.upsert({
    where: { eventId_name: { eventId: event.id, name: name.trim() } },
    update: { joining, notes: notes || "", email: email || "", status: "pending" },
    create: {
      eventId: event.id,
      name: name.trim(),
      email: email || "",
      joining,
      status: "pending",
      notes: notes || "",
    },
  });

  return NextResponse.json(response);
}
