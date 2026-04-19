import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEventApprovalEmail, sendEventRejectionEmail } from "@/lib/email";
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

// PATCH update event or approve/reject response (admin only)
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const body = await req.json();

  // If responseId is present, this is an approve/reject action on a response
  if (body.responseId) {
    const { responseId, status } = body;
    if (!status || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json({ error: "無效狀態" }, { status: 400 });
    }

    const response = await prisma.eventResponse.findUnique({
      where: { id: responseId },
      include: { event: true },
    });
    if (!response) return NextResponse.json({ error: "找不到此回覆" }, { status: 404 });

    const updated = await prisma.eventResponse.update({
      where: { id: responseId },
      data: { status },
    });

    // Send email notification if email is provided
    if (response.email) {
      try {
        if (status === "approved") {
          await sendEventApprovalEmail(response.email, response.name, response.event.title, response.event.date, response.event.time, response.event.location);
        } else {
          await sendEventRejectionEmail(response.email, response.name, response.event.title);
        }
      } catch (emailErr) {
        console.error("Failed to send event email:", emailErr);
      }
    }

    return NextResponse.json(updated);
  }

  // Otherwise, update the event itself
  const { id, title, description, date, time, location, isActive } = body;
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
