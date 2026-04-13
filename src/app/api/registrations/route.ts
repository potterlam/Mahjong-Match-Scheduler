import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "請提供日期" }, { status: 400 });
  }

  const registration = await prisma.registration.findFirst({
    where: {
      userId: session.user.id,
      date: new Date(date),
    },
    include: {
      timeSlot: true,
      location: true,
      foods: { include: { foodOption: true } },
    },
  });

  return NextResponse.json(registration);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  try {
    const { date, timeSlotId, locationId, foodIds, notes } = await req.json();

    if (!date || !timeSlotId || !locationId) {
      return NextResponse.json(
        { error: "請填寫所有必要欄位" },
        { status: 400 }
      );
    }

    // Upsert registration
    const existing = await prisma.registration.findFirst({
      where: {
        userId: session.user.id,
        date: new Date(date),
      },
    });

    if (existing) {
      // Update existing — reset to pending if changing
      await prisma.registrationFood.deleteMany({
        where: { registrationId: existing.id },
      });

      const updated = await prisma.registration.update({
        where: { id: existing.id },
        data: {
          timeSlotId,
          locationId,
          notes: notes || "",
          status: "pending",
          foods: {
            create: (foodIds || []).map((foodOptionId: string) => ({
              foodOptionId,
              quantity: 1,
            })),
          },
        },
        include: {
          timeSlot: true,
          location: true,
          foods: { include: { foodOption: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // Create new
    const registration = await prisma.registration.create({
      data: {
        userId: session.user.id,
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
        timeSlot: true,
        location: true,
        foods: { include: { foodOption: true } },
      },
    });

    return NextResponse.json(registration);
  } catch {
    return NextResponse.json(
      { error: "提交失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({ where: { id } });
  if (!registration || registration.userId !== session.user.id) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  await prisma.registration.delete({ where: { id } });
  return NextResponse.json({ message: "已取消" });
}
