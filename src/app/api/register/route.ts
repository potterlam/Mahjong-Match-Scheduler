import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { username, name, email, password } = await req.json();

    if (!username || !name || !email || !password) {
      return NextResponse.json(
        { error: "請填寫所有欄位" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密碼至少需要 6 個字元" },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json(
        { error: "此用戶名已被使用" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "此電郵已被註冊" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        name,
        email,
        passwordHash: hashSync(password, 10),
      },
    });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch {
    return NextResponse.json(
      { error: "註冊失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
