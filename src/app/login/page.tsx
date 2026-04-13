"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("用戶名或密碼不正確，請重試");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-red-700 mb-8">
          🀄 麻雀約局系統
        </h1>
        <h2 className="text-2xl font-bold text-center mb-6">登入</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-lg">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-lg font-bold mb-2">用戶名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
              placeholder="輸入用戶名"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
              placeholder="輸入密碼"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <Link
            href="/forgot-password"
            className="block text-red-600 text-lg font-bold hover:underline"
          >
            😅 忘記密碼？點這裡重設
          </Link>
          <Link
            href="/register"
            className="block text-gray-600 text-lg hover:underline"
          >
            還沒有帳號？註冊新帳號
          </Link>
        </div>
      </div>
    </div>
  );
}
