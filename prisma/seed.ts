import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashSync } from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  console.log("Connecting to:", connectionString.substring(0, 50));
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  // Create time slots
  const afternoon = await prisma.timeSlot.upsert({
    where: { id: "afternoon" },
    update: {},
    create: {
      id: "afternoon",
      label: "午場 12:00–18:00",
      startTime: "12:00",
      endTime: "18:00",
    },
  });

  const evening = await prisma.timeSlot.upsert({
    where: { id: "evening" },
    update: {},
    create: {
      id: "evening",
      label: "晚場 18:30–24:00",
      startTime: "18:30",
      endTime: "24:00",
    },
  });

  // Create default location
  const location = await prisma.location.upsert({
    where: { id: "cindy-house" },
    update: {},
    create: {
      id: "cindy-house",
      name: "Cindy 家",
      address: "Cindy's house",
      isActive: true,
    },
  });

  // Create food options
  const foods = [
    { id: "bread", name: "麵包" },
    { id: "cookie", name: "曲奇餅" },
    { id: "sandwich", name: "三文治" },
    { id: "noodle", name: "麵食" },
    { id: "fruit", name: "水果" },
    { id: "drink", name: "飲品" },
  ];

  for (const food of foods) {
    await prisma.foodOption.upsert({
      where: { id: food.id },
      update: {},
      create: {
        id: food.id,
        name: food.name,
        isActive: true,
      },
    });
  }

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@mahjong.com" },
    update: {},
    create: {
      username: "cindy",
      name: "Cindy",
      email: "admin@mahjong.com",
      passwordHash: hashSync("55267822", 10),
      role: "admin",
    },
  });

  console.log("Seed data created:", {
    timeSlots: [afternoon.label, evening.label],
    location: location.name,
    foods: foods.map((f) => f.name),
    admin: admin.email,
  });

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
