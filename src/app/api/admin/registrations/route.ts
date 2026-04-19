import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import bcrypt from "bcryptjs";

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
    const { userId, date, timeSlotId, locationId, foodIds, notes, responderName, responderEmail } = await req.json();

    if (!date || !timeSlotId || !locationId) {
      return NextResponse.json({ error: "請填寫所有必要欄位" }, { status: 400 });
    }

    let finalUserId = userId;

    // If no userId but has responderName, auto-create a user account
    if (!finalUserId && responderName) {
      const name = responderName.trim();
      // Generate a unique username from name
      const baseUsername = name.toLowerCase().replace(/\s+/g, "");
      let username = baseUsername;
      let suffix = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }
      // Use responder email or generate a placeholder
      const email = responderEmail?.trim() || `${username}@guest.local`;
      // Check if email already exists — if so, use that user
      const existingByEmail = email !== `${username}@guest.local`
        ? await prisma.user.findUnique({ where: { email } })
        : null;
      if (existingByEmail) {
        finalUserId = existingByEmail.id;
      } else {
        const passwordHash = await bcrypt.hash(`welcome${Date.now()}`, 10);
        const newUser = await prisma.user.create({
          data: { username, name, email, passwordHash },
        });
        finalUserId = newUser.id;
      }
    }

    if (!finalUserId) {
      return NextResponse.json({ error: "請選擇用戶" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: finalUserId } });
    if (!user) {
      return NextResponse.json({ error: "找不到此用戶" }, { status: 404 });
    }

    const registration = await prisma.registration.create({
      data: {
        userId: finalUserId,
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

// PATCH /api/admin/registrations — admin edits or approves/rejects registration
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  try {
    const { id, timeSlotId, locationId, foodIds, notes, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "缺少報名 ID" }, { status: 400 });
    }

    const existing = await prisma.registration.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        timeSlot: true,
        location: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "找不到此報名" }, { status: 404 });
    }

    // If status change (approve/reject), handle email notification
    if (status && (status === "approved" || status === "rejected")) {
      const updated = await prisma.registration.update({
        where: { id },
        data: { status },
        include: {
          user: { select: { id: true, name: true, email: true } },
          timeSlot: true,
          location: true,
          foods: { include: { foodOption: true } },
        },
      });

      // Send email notification
      try {
        const dateStr = format(new Date(existing.date), "yyyy年M月d日（EEEE）", { locale: zhTW });
        if (status === "approved") {
          await sendApprovalEmail(existing.user.email, existing.user.name, dateStr, existing.timeSlot.label, existing.location.name);
        } else {
          await sendRejectionEmail(existing.user.email, existing.user.name, dateStr, existing.timeSlot.label);
        }
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
        // Don't fail the request if email fails
      }

      return NextResponse.json(updated);
    }

    // Otherwise, edit registration fields
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
