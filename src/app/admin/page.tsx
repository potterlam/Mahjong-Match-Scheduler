"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface AdminRegistration {
  id: string;
  date: string;
  notes: string;
  user: { name: string; email: string };
  timeSlot: { label: string };
  location: { name: string };
  foods: { foodOption: { name: string } }[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { registrations: number };
}

interface FoodOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface ConflictPair {
  id: string;
  reason: string;
  userA: { id: string; name: string };
  userB: { id: string; name: string };
}

interface TimeSlotItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  isActive: boolean;
  responses: { id: string; name: string; joining: boolean; notes: string }[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"registrations" | "users" | "foods" | "timeslots" | "conflicts" | "events">("registrations");
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [timeSlotsList, setTimeSlotsList] = useState<TimeSlotItem[]>([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newFoodName, setNewFoodName] = useState("");
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [editingFoodName, setEditingFoodName] = useState("");
  const [conflictUserA, setConflictUserA] = useState("");
  const [conflictUserB, setConflictUserB] = useState("");
  const [conflictReason, setConflictReason] = useState("");
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotLabel, setEditingSlotLabel] = useState("");
  const [editingSlotStart, setEditingSlotStart] = useState("");
  const [editingSlotEnd, setEditingSlotEnd] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (tab === "registrations") {
      fetch(`/api/admin/registrations?date=${filterDate}`)
        .then((r) => r.json())
        .then((d) => setRegistrations(Array.isArray(d) ? d : []));
    } else if (tab === "users") {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d) ? d : []));
    } else if (tab === "foods") {
      fetch("/api/admin/foods")
        .then((r) => r.json())
        .then((d) => setFoods(Array.isArray(d) ? d : []));
    } else if (tab === "conflicts") {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d) ? d : []));
      fetch("/api/admin/conflicts")
        .then((r) => r.json())
        .then((d) => setConflicts(Array.isArray(d) ? d : []));
    } else if (tab === "timeslots") {
      fetch("/api/admin/timeslots")
        .then((r) => r.json())
        .then((d) => setTimeSlotsList(Array.isArray(d) ? d : []));
    } else if (tab === "events") {
      fetch("/api/admin/events")
        .then((r) => r.json())
        .then((d) => setEvents(Array.isArray(d) ? d : []));
    }
  }, [tab, filterDate]);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const toggleFood = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/foods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    setFoods((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isActive: !isActive } : f))
    );
  };

  const addFood = async () => {
    if (!newFoodName.trim()) return;
    const res = await fetch("/api/admin/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFoodName.trim() }),
    });
    const food = await res.json();
    setFoods((prev) => [...prev, food]);
    setNewFoodName("");
  };

  const addConflict = async () => {
    if (!conflictUserA || !conflictUserB) return;
    const res = await fetch("/api/admin/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userAId: conflictUserA, userBId: conflictUserB, reason: conflictReason }),
    });
    if (res.ok) {
      const conflict = await res.json();
      setConflicts((prev) => [...prev, conflict]);
      setConflictUserA("");
      setConflictUserB("");
      setConflictReason("");
    }
  };

  const removeConflict = async (id: string) => {
    if (!confirm("確定要刪除此衝突關係嗎？")) return;
    const res = await fetch(`/api/admin/conflicts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setConflicts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const deleteFood = async (id: string) => {
    if (!confirm("確定要刪除此食物嗎？")) return;
    const res = await fetch(`/api/admin/foods?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setFoods((prev) => prev.filter((f) => f.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "刪除失敗");
    }
  };

  const renameFood = async (id: string) => {
    if (!editingFoodName.trim()) return;
    const res = await fetch("/api/admin/foods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editingFoodName.trim() }),
    });
    if (res.ok) {
      setFoods((prev) => prev.map((f) => f.id === id ? { ...f, name: editingFoodName.trim() } : f));
      setEditingFoodId(null);
      setEditingFoodName("");
    }
  };

  const addTimeSlot = async () => {
    if (!newSlotLabel.trim() || !newSlotStart || !newSlotEnd) return;
    const res = await fetch("/api/admin/timeslots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newSlotLabel.trim(), startTime: newSlotStart, endTime: newSlotEnd }),
    });
    if (res.ok) {
      const slot = await res.json();
      setTimeSlotsList((prev) => [...prev, slot]);
      setNewSlotLabel("");
      setNewSlotStart("");
      setNewSlotEnd("");
    }
  };

  const updateTimeSlot = async (id: string) => {
    if (!editingSlotLabel.trim()) return;
    const res = await fetch("/api/admin/timeslots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editingSlotLabel.trim(), startTime: editingSlotStart, endTime: editingSlotEnd }),
    });
    if (res.ok) {
      setTimeSlotsList((prev) => prev.map((s) => s.id === id ? { ...s, label: editingSlotLabel.trim(), startTime: editingSlotStart, endTime: editingSlotEnd } : s));
      setEditingSlotId(null);
    }
  };

  const deleteTimeSlot = async (id: string) => {
    if (!confirm("確定要刪除此時段嗎？")) return;
    const res = await fetch(`/api/admin/timeslots?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTimeSlotsList((prev) => prev.filter((s) => s.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "刪除失敗");
    }
  };

  const createEvent = async () => {
    if (!newEventTitle.trim()) return;
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newEventTitle.trim(),
        description: newEventDesc,
        date: newEventDate,
        time: newEventTime,
        location: newEventLocation,
      }),
    });
    if (res.ok) {
      const ev = await res.json();
      setEvents((prev) => [ev, ...prev]);
      setNewEventTitle("");
      setNewEventDesc("");
      setNewEventDate("");
      setNewEventTime("");
      setNewEventLocation("");
    }
  };

  const toggleEvent = async (id: string, isActive: boolean) => {
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    if (res.ok) {
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, isActive: !isActive } : e));
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("確定要刪除此活動嗎？所有回覆也會被刪除。")) return;
    const res = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  if (status === "loading") {
    return <div className="text-center py-20 text-2xl">載入中...</div>;
  }

  if (!session || session.user.role !== "admin") return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-red-700 mb-6">⚙️ 管理後台</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "registrations" as const, label: "📋 報名記錄" },
          { key: "users" as const, label: "👥 用戶管理" },
          { key: "foods" as const, label: "🍜 食物管理" },
          { key: "timeslots" as const, label: "⏰ 時段管理" },
          { key: "events" as const, label: "🎉 活動調查" },
          { key: "conflicts" as const, label: "🚫 衝突管理" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 rounded-lg text-lg font-bold ${
              tab === t.key
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Registrations */}
      {tab === "registrations" && (
        <div>
          <div className="mb-4">
            <label className="text-lg font-bold mr-3">篩選日期：</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border-2 border-gray-300 rounded-lg p-2 text-lg"
            />
          </div>

          {registrations.length === 0 ? (
            <p className="text-lg text-gray-500">此日期暫無報名</p>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg) => (
                <div key={reg.id} className={`bg-white rounded-lg shadow p-4 border-2 ${
                  (reg as any).status === "pending" ? "border-yellow-400" : (reg as any).status === "rejected" ? "border-red-400" : "border-gray-200"
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold">{reg.user.name}</span>
                      {(reg as any).status === "pending" && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-sm font-bold">⏳ 待審批</span>
                      )}
                      {(reg as any).status === "approved" && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-bold">✅ 已批准</span>
                      )}
                      {(reg as any).status === "rejected" && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-bold">❌ 已拒絕</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                        {reg.timeSlot.label}
                      </span>
                      {(reg as any).status === "pending" && (
                        <>
                          <button
                            onClick={async () => {
                              await fetch("/api/admin/registrations", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: reg.id, status: "approved" }),
                              });
                              setTab("registrations");
                              const res = await fetch(`/api/admin/registrations?date=${filterDate}`);
                              setRegistrations(await res.json());
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-green-700"
                          >
                            ✅ 批准
                          </button>
                          <button
                            onClick={async () => {
                              await fetch("/api/admin/registrations", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: reg.id, status: "rejected" }),
                              });
                              const res = await fetch(`/api/admin/registrations?date=${filterDate}`);
                              setRegistrations(await res.json());
                            }}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-600"
                          >
                            ❌ 拒絕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-600">
                    📧 {reg.user.email} · 📍 {reg.location.name}
                  </div>
                  {reg.foods.length > 0 && (
                    <div className="mt-1">
                      🍜 {reg.foods.map((f) => f.foodOption.name).join("、")}
                    </div>
                  )}
                  {reg.notes && <div className="text-gray-500 mt-1">💬 {reg.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow p-4 border-2 border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-xl font-bold">{user.name}</div>
                <div className="text-gray-600">{user.email}</div>
                <div className="text-sm text-gray-400">
                  報名 {user._count.registrations} 次
                </div>
              </div>
              <button
                onClick={() => toggleRole(user.id, user.role)}
                className={`px-4 py-2 rounded-lg font-bold ${
                  user.role === "admin"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {user.role === "admin" ? "👑 管理員" : "👤 一般用戶"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Foods */}
      {tab === "foods" && (
        <div>
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newFoodName}
              onChange={(e) => setNewFoodName(e.target.value)}
              className="flex-1 border-2 border-gray-300 rounded-lg p-3 text-lg"
              placeholder="輸入新食物名稱"
            />
            <button
              onClick={addFood}
              className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-green-700"
            >
              ➕ 新增
            </button>
          </div>

          <div className="space-y-3">
            {foods.map((food) => (
              <div
                key={food.id}
                className="bg-white rounded-lg shadow p-4 border-2 border-gray-200 flex justify-between items-center"
              >
                {editingFoodId === food.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-3">
                    <input
                      type="text"
                      value={editingFoodName}
                      onChange={(e) => setEditingFoodName(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg p-2 text-lg flex-1"
                    />
                    <button
                      onClick={() => renameFood(food.id)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700"
                    >
                      💾 儲存
                    </button>
                    <button
                      onClick={() => setEditingFoodId(null)}
                      className="bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <span className={`text-xl ${!food.isActive ? "line-through text-gray-400" : ""}`}>
                    {food.name}
                  </span>
                )}
                {editingFoodId !== food.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingFoodId(food.id); setEditingFoodName(food.name); }}
                      className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-bold hover:bg-blue-200"
                    >
                      ✏️ 改名
                    </button>
                    <button
                      onClick={() => toggleFood(food.id, food.isActive)}
                      className={`px-4 py-2 rounded-lg font-bold ${
                        food.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {food.isActive ? "✅ 啟用中" : "❌ 已停用"}
                    </button>
                    <button
                      onClick={() => deleteFood(food.id)}
                      className="bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200"
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Slots */}
      {tab === "timeslots" && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200 mb-6">
            <h2 className="text-xl font-bold mb-4">➕ 新增時段</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-lg font-bold mb-1">名稱</label>
                <input
                  type="text"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                  placeholder="例如：午場 12:00–18:00"
                />
              </div>
              <div>
                <label className="block text-lg font-bold mb-1">開始時間</label>
                <input
                  type="time"
                  value={newSlotStart}
                  onChange={(e) => setNewSlotStart(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                />
              </div>
              <div>
                <label className="block text-lg font-bold mb-1">結束時間</label>
                <input
                  type="time"
                  value={newSlotEnd}
                  onChange={(e) => setNewSlotEnd(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                />
              </div>
            </div>
            <button
              onClick={addTimeSlot}
              disabled={!newSlotLabel.trim() || !newSlotStart || !newSlotEnd}
              className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ 新增時段
            </button>
          </div>

          {timeSlotsList.length === 0 ? (
            <p className="text-lg text-gray-500">目前沒有時段</p>
          ) : (
            <div className="space-y-3">
              {timeSlotsList.map((slot) => (
                <div key={slot.id} className="bg-white rounded-lg shadow p-4 border-2 border-gray-200">
                  {editingSlotId === slot.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editingSlotLabel}
                          onChange={(e) => setEditingSlotLabel(e.target.value)}
                          className="border-2 border-gray-300 rounded-lg p-3 text-lg"
                          placeholder="名稱"
                        />
                        <input
                          type="time"
                          value={editingSlotStart}
                          onChange={(e) => setEditingSlotStart(e.target.value)}
                          className="border-2 border-gray-300 rounded-lg p-3 text-lg"
                        />
                        <input
                          type="time"
                          value={editingSlotEnd}
                          onChange={(e) => setEditingSlotEnd(e.target.value)}
                          className="border-2 border-gray-300 rounded-lg p-3 text-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateTimeSlot(slot.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                        >
                          💾 儲存
                        </button>
                        <button
                          onClick={() => setEditingSlotId(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xl font-bold">{slot.label}</span>
                        <span className="text-gray-500 ml-3">({slot.startTime} - {slot.endTime})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSlotId(slot.id);
                            setEditingSlotLabel(slot.label);
                            setEditingSlotStart(slot.startTime);
                            setEditingSlotEnd(slot.endTime);
                          }}
                          className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200"
                        >
                          ✏️ 編輯
                        </button>
                        <button
                          onClick={() => deleteTimeSlot(slot.id)}
                          className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200"
                        >
                          🗑️ 刪除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events */}
      {tab === "events" && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200 mb-6">
            <h2 className="text-xl font-bold mb-4">➕ 建立新活動調查</h2>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-lg font-bold mb-1">活動名稱 *</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                  placeholder="例如：星期六麻雀局"
                />
              </div>
              <div>
                <label className="block text-lg font-bold mb-1">描述（選填）</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                  rows={2}
                  placeholder="活動詳細資訊"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-lg font-bold mb-1">日期（選填）</label>
                  <input
                    type="text"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                    placeholder="例如：4月20日（六）"
                  />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-1">時間（選填）</label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                    placeholder="例如：下午 2:00"
                  />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-1">地點（選填）</label>
                  <input
                    type="text"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                    placeholder="例如：Cindy 家"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={createEvent}
              disabled={!newEventTitle.trim()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎉 建立活動
            </button>
          </div>

          {events.length === 0 ? (
            <p className="text-lg text-gray-500">目前沒有活動</p>
          ) : (
            <div className="space-y-4">
              {events.map((ev) => {
                const joinCount = ev.responses.filter((r) => r.joining).length;
                const declineCount = ev.responses.filter((r) => !r.joining).length;
                const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/event/${ev.slug}`;

                return (
                  <div key={ev.id} className={`bg-white rounded-lg shadow p-6 border-2 ${ev.isActive ? "border-gray-200" : "border-red-200 opacity-60"}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold">{ev.title}</h3>
                        {ev.description && <p className="text-gray-600">{ev.description}</p>}
                        <div className="text-gray-500 mt-1">
                          {ev.date && <span>📅 {ev.date} </span>}
                          {ev.time && <span>⏰ {ev.time} </span>}
                          {ev.location && <span>📍 {ev.location}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleEvent(ev.id, ev.isActive)}
                          className={`px-3 py-2 rounded-lg font-bold ${ev.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {ev.isActive ? "✅ 開放中" : "❌ 已關閉"}
                        </button>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          className="bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200"
                        >
                          🗑️ 刪除
                        </button>
                      </div>
                    </div>

                    {/* Share Link */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-sm font-bold text-blue-700 mb-1">📤 分享連結（無需登入即可回覆）：</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="flex-1 bg-white border border-blue-300 rounded p-2 text-sm"
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(shareUrl); alert("已複製連結！"); }}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 text-sm"
                        >
                          📋 複製
                        </button>
                      </div>
                    </div>

                    {/* Response Stats */}
                    <div className="text-lg font-bold mb-2">
                      📊 ✅ {joinCount} 人參加 · ❌ {declineCount} 人不參加
                    </div>
                    {ev.responses.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {ev.responses.map((r) => (
                          <div key={r.id} className={`p-2 rounded border text-sm ${r.joining ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                            <span className="font-bold">{r.name}</span> {r.joining ? "✅" : "❌"}
                            {r.notes && <span className="text-gray-500"> — {r.notes}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conflicts */}
      {tab === "conflicts" && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200 mb-6">
            <h2 className="text-xl font-bold mb-4">➕ 新增衝突關係</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-lg font-bold mb-1">用戶 A</label>
                <select
                  value={conflictUserA}
                  onChange={(e) => setConflictUserA(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                >
                  <option value="">選擇用戶</option>
                  {users.filter((u) => u.id !== conflictUserB).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-bold mb-1">用戶 B</label>
                <select
                  value={conflictUserB}
                  onChange={(e) => setConflictUserB(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                >
                  <option value="">選擇用戶</option>
                  {users.filter((u) => u.id !== conflictUserA).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-bold mb-1">原因（可選）</label>
                <input
                  type="text"
                  value={conflictReason}
                  onChange={(e) => setConflictReason(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg"
                  placeholder="輸入原因"
                />
              </div>
            </div>
            <button
              onClick={addConflict}
              disabled={!conflictUserA || !conflictUserB}
              className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚫 新增衝突
            </button>
          </div>

          {conflicts.length === 0 ? (
            <p className="text-lg text-gray-500">目前沒有設定衝突關係</p>
          ) : (
            <div className="space-y-3">
              {conflicts.map((c) => (
                <div key={c.id} className="bg-white rounded-lg shadow p-4 border-2 border-red-200 flex justify-between items-center">
                  <div>
                    <span className="text-xl font-bold text-red-700">
                      {c.userA.name} 🚫 {c.userB.name}
                    </span>
                    {c.reason && (
                      <span className="text-gray-500 ml-3">（{c.reason}）</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeConflict(c.id)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300"
                  >
                    🗑️ 刪除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
