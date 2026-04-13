import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // format: "2026-04"

  if (!month) {
    return NextResponse.json({ error: "請提供月份" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0); // last day of month

  const registrations = await prisma.registration.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      timeSlot: true,
      location: true,
      foods: { include: { foodOption: true } },
    },
    orderBy: [{ date: "asc" }, { timeSlotId: "asc" }],
  });

  return NextResponse.json(registrations);
}
