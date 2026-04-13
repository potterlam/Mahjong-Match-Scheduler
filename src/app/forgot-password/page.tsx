"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold mb-4">郵件已發送！</h2>
          <p className="text-lg mb-6">
            請檢查您的電郵信箱，點擊信中的連結來重設密碼。
          </p>
          <p className="text-gray-500 mb-6">
            如果沒有收到，請檢查垃圾郵件資料夾。
          </p>
          <Link
            href="/login"
            className="inline-block bg-red-600 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-red-700"
          >
            返回登入
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">忘記密碼？</h2>
        <p className="text-lg text-center text-gray-600 mb-6">
          輸入您的電郵地址，我們會發送重設密碼的連結給您。
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-lg">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-lg font-bold mb-2">電郵地址</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
              placeholder="example@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "發送中..." : "📧 發送重設連結"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-gray-600 text-lg hover:underline">
            返回登入
          </Link>
        </div>
      </div>
    </div>
  );
}
