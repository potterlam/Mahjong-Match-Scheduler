"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      router.push("/login?registered=1");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-red-700 mb-2">
          🀄 麻雀約局系統
        </h1>
        <h2 className="text-2xl font-bold text-center mb-6">註冊新帳號</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-lg">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-lg font-bold mb-2">用戶名（登入用）</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
              placeholder="例如：daiman123"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">您的名字</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
              placeholder="例如：陳大文"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">電郵地址（重設密碼用）</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
              placeholder="example@email.com"
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
              placeholder="至少 6 個字元"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-gray-600 text-lg hover:underline">
            已有帳號？返回登入
          </Link>
        </div>
      </div>
    </div>
  );
}
