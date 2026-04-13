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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"registrations" | "users" | "foods" | "conflicts">("registrations");
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newFoodName, setNewFoodName] = useState("");
  const [conflictUserA, setConflictUserA] = useState("");
  const [conflictUserB, setConflictUserB] = useState("");
  const [conflictReason, setConflictReason] = useState("");

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

  if (status === "loading") {
    return <div className="text-center py-20 text-2xl">載入中...</div>;
  }

  if (!session || session.user.role !== "admin") return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-red-700 mb-6">⚙️ 管理後台</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "registrations" as const, label: "📋 報名記錄" },
          { key: "users" as const, label: "👥 用戶管理" },
          { key: "foods" as const, label: "🍜 食物管理" },
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
                <span className={`text-xl ${!food.isActive ? "line-through text-gray-400" : ""}`}>
                  {food.name}
                </span>
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
              </div>
            ))}
          </div>
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
