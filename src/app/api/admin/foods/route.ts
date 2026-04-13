import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

// GET all food options (including inactive)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const foods = await prisma.foodOption.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(foods);
}

// POST new food option
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "請輸入名稱" }, { status: 400 });

  const food = await prisma.foodOption.create({ data: { name } });
  return NextResponse.json(food);
}

// PATCH toggle active
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { id, isActive } = await req.json();
  const food = await prisma.foodOption.update({
    where: { id },
    data: { isActive },
  });
  return NextResponse.json(food);
}
