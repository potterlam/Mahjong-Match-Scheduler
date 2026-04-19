"use client";

import { useState, useEffect, use } from "react";

interface EventResponse {
  id: string;
  name: string;
  joining: boolean;
  notes: string;
  createdAt: string;
}

interface EventData {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  responses: EventResponse[];
}

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/events?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEvent(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("載入失敗");
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || joining === null) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: name.trim(), joining, notes }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "提交失敗");
    } else {
      setSuccess(joining ? "已回覆：參加 ✅" : "已回覆：不參加 ❌");
      // Refresh event data
      const refreshRes = await fetch(`/api/events?slug=${slug}`);
      const refreshData = await refreshRes.json();
      if (!refreshData.error) setEvent(refreshData);
      setName("");
      setJoining(null);
      setNotes("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 flex items-center justify-center">
        <p className="text-2xl">載入中...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <p className="text-6xl mb-4">😢</p>
          <p className="text-xl text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const joinCount = event.responses.filter((r) => r.joining).length;
  const declineCount = event.responses.filter((r) => !r.joining).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Event Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-red-700 mb-2">🀄 {event.title}</h1>
          {event.description && (
            <p className="text-lg text-gray-600 mb-4">{event.description}</p>
          )}
          <div className="space-y-2 text-lg">
            {event.date && <p>📅 <strong>日期：</strong>{event.date}</p>}
            {event.time && <p>⏰ <strong>時間：</strong>{event.time}</p>}
            {event.location && <p>📍 <strong>地點：</strong>{event.location}</p>}
          </div>
        </div>

        {/* Response Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">📝 回覆出席</h2>

          {success && (
            <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4 text-lg font-bold">
              {success}
            </div>
          )}
          {error && event && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-lg">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xl font-bold mb-2">你的名字</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
                placeholder="輸入你的名字"
                required
              />
            </div>

            <div>
              <label className="block text-xl font-bold mb-3">是否參加？</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setJoining(true)}
                  className={`p-4 rounded-xl text-xl font-bold border-3 transition-all ${
                    joining === true
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                  }`}
                >
                  ✅ 參加
                </button>
                <button
                  type="button"
                  onClick={() => setJoining(false)}
                  className={`p-4 rounded-xl text-xl font-bold border-3 transition-all ${
                    joining === false
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
                  }`}
                >
                  ❌ 不參加
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xl font-bold mb-2">備註（選填）</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
                rows={2}
                placeholder="例如：遲到 30 分鐘"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim() || joining === null}
              className="w-full bg-red-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "提交中..." : "📤 提交回覆"}
            </button>
          </form>
        </div>

        {/* Responses */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-4">
            📊 回覆統計
            <span className="text-lg font-normal text-gray-500 ml-3">
              ✅ {joinCount} 人參加 · ❌ {declineCount} 人不參加
            </span>
          </h2>

          {event.responses.length === 0 ? (
            <p className="text-lg text-gray-500">暫時未有人回覆</p>
          ) : (
            <div className="space-y-3">
              {event.responses.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-lg border-2 flex justify-between items-center ${
                    r.joining
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div>
                    <span className="text-xl font-bold">{r.name}</span>
                    {r.notes && (
                      <span className="text-gray-500 ml-2">— {r.notes}</span>
                    )}
                  </div>
                  <span className="text-2xl">{r.joining ? "✅" : "❌"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
