import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [timeSlots, locations, foodOptions] = await Promise.all([
    prisma.timeSlot.findMany(),
    prisma.location.findMany({ where: { isActive: true } }),
    prisma.foodOption.findMany({ where: { isActive: true } }),
  ]);

  return NextResponse.json({ timeSlots, locations, foodOptions });
}
