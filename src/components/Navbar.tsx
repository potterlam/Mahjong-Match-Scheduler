"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-red-700 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          🀄 麻雀約局
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link
                href="/calendar"
                className="hover:underline text-lg"
              >
                📅 日曆
              </Link>
              {session.user.role === "admin" && (
                <Link
                  href="/admin"
                  className="hover:underline text-lg"
                >
                  ⚙️ 管理
                </Link>
              )}
              <span className="text-lg">{session.user.name}</span>
              <button
                onClick={() => signOut()}
                className="bg-white text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-50"
              >
                登出
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-white text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-50"
            >
              登入
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
