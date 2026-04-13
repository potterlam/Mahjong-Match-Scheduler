"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { zhTW } from "date-fns/locale";

interface CalendarRegistration {
  id: string;
  date: string;
  notes: string;
  timeSlotId: string;
  locationId: string;
  user: { id: string; name: string };
  timeSlot: { id: string; label: string };
  location: { id: string; name: string };
  foods: { foodOptionId: string; foodOption: { id: string; name: string }; quantity: number }[];
}

interface TimeSlot { id: string; label: string }
interface Location { id: string; name: string }
interface FoodOption { id: string; name: string }
interface UserOption { id: string; name: string; email: string }

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [registrations, setRegistrations] = useState<CalendarRegistration[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Admin edit state
  const [editingReg, setEditingReg] = useState<CalendarRegistration | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Form fields
  const [formSlot, setFormSlot] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formFoods, setFormFoods] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load options for admin
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/options")
      .then((r) => r.json())
      .then((data) => {
        setTimeSlots(data.timeSlots || []);
        setLocations(data.locations || []);
        setFoodOptions(data.foodOptions || []);
      });
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }, [isAdmin]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    const month = format(currentMonth, "yyyy-MM");
    const res = await fetch(`/api/calendar?month=${month}`);
    const data = await res.json();
    setRegistrations(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    if (session) fetchCalendar();
  }, [session, fetchCalendar]);

  // Open edit modal
  const openEdit = (reg: CalendarRegistration) => {
    setEditingReg(reg);
    setAddingNew(false);
    setFormSlot(reg.timeSlotId);
    setFormLocation(reg.locationId);
    setFormFoods(reg.foods.map((f) => f.foodOptionId));
    setFormNotes(reg.notes || "");
    setFormUserId("");
    setFormError("");
  };

  // Open add modal
  const openAdd = () => {
    setEditingReg(null);
    setAddingNew(true);
    setFormSlot(timeSlots[0]?.id || "");
    setFormLocation(locations[0]?.id || "");
    setFormFoods([]);
    setFormNotes("");
    setFormUserId("");
    setFormError("");
  };

  const closeModal = () => {
    setEditingReg(null);
    setAddingNew(false);
  };

  const toggleFormFood = (id: string) => {
    setFormFoods((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingReg) return;
    setFormSaving(true);
    setFormError("");

    const res = await fetch("/api/admin/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingReg.id,
        timeSlotId: formSlot,
        locationId: formLocation,
        foodIds: formFoods,
        notes: formNotes,
      }),
    });

    setFormSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "更新失敗");
      return;
    }
    closeModal();
    fetchCalendar();
  };

  // Save add
  const handleSaveAdd = async () => {
    if (!formUserId || !formSlot || !formLocation || !selectedDate) {
      setFormError("請填寫所有必要欄位");
      return;
    }
    setFormSaving(true);
    setFormError("");

    const res = await fetch("/api/admin/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: formUserId,
        date: selectedDate,
        timeSlotId: formSlot,
        locationId: formLocation,
        foodIds: formFoods,
        notes: formNotes,
      }),
    });

    setFormSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "新增失敗");
      return;
    }
    closeModal();
    fetchCalendar();
  };

  // Delete
  const handleDelete = async (regId: string, userName: string) => {
    if (!confirm(`確定要刪除 ${userName} 的報名嗎？`)) return;

    const res = await fetch(`/api/admin/registrations?id=${regId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchCalendar();
    }
  };

  if (status === "loading") {
    return <div className="text-center py-20 text-2xl">載入中...</div>;
  }

  if (!session) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const getRegistrationsForDate = (dateStr: string) => {
    return registrations.filter(
      (r) => format(new Date(r.date), "yyyy-MM-dd") === dateStr
    );
  };

  const selectedRegs = selectedDate ? getRegistrationsForDate(selectedDate) : [];
  const showModal = editingReg || addingNew;

  return (
    <div>
      <h1 className="text-3xl font-bold text-red-700 mb-6">📅 約局日曆</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="bg-red-600 text-white px-6 py-3 rounded-lg text-xl font-bold hover:bg-red-700"
        >
          ← 上月
        </button>
        <h2 className="text-2xl font-bold">
          {format(currentMonth, "yyyy年M月", { locale: zhTW })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="bg-red-600 text-white px-6 py-3 rounded-lg text-xl font-bold hover:bg-red-700"
        >
          下月 →
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-xl">載入中...</div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
              <div key={d} className="text-center font-bold text-lg py-2 bg-red-100 rounded">
                {d}
              </div>
            ))}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayRegs = getRegistrationsForDate(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`p-2 rounded-lg text-center min-h-[60px] border-2 transition-all ${
                    isSelected
                      ? "border-red-600 bg-red-50"
                      : isToday
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white hover:border-red-300"
                  }`}
                >
                  <div className={`text-lg font-bold ${isToday ? "text-orange-600" : ""}`}>
                    {format(day, "d")}
                  </div>
                  {dayRegs.length > 0 && (
                    <div className="text-sm text-red-600 font-bold">
                      {dayRegs.length} 人
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected date detail */}
          {selectedDate && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">
                  {format(new Date(selectedDate), "M月d日（EEEE）", { locale: zhTW })}
                </h3>
                {isAdmin && (
                  <button
                    onClick={openAdd}
                    className="bg-green-600 text-white px-5 py-2 rounded-lg text-lg font-bold hover:bg-green-700"
                  >
                    ➕ 新增報名
                  </button>
                )}
              </div>

              {selectedRegs.length === 0 ? (
                <p className="text-lg text-gray-500">暫無人報名</p>
              ) : (
                <div className="space-y-4">
                  {selectedRegs.map((reg) => (
                    <div
                      key={reg.id}
                      className="border-2 border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold">{reg.user.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                            {reg.timeSlot.label}
                          </span>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEdit(reg)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-600 text-base"
                              >
                                ✏️ 編輯
                              </button>
                              <button
                                onClick={() => handleDelete(reg.id, reg.user.name)}
                                className="bg-red-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-red-600 text-base"
                              >
                                🗑️ 刪除
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-lg">
                        📍 {reg.location.name}
                      </div>
                      {reg.foods.length > 0 && (
                        <div className="text-lg mt-1">
                          🍜 {reg.foods.map((f) => f.foodOption.name).join("、")}
                        </div>
                      )}
                      {reg.notes && (
                        <div className="text-gray-500 mt-1">
                          💬 {reg.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Admin Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">
              {editingReg ? `✏️ 編輯報名 — ${editingReg.user.name}` : "➕ 新增報名"}
            </h3>

            {formError && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-lg">
                ⚠️ {formError}
              </div>
            )}

            <div className="space-y-5">
              {/* User selector (add mode only) */}
              {addingNew && (
                <div>
                  <label className="block text-lg font-bold mb-2">👤 用戶</label>
                  <select
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
                  >
                    <option value="">-- 選擇用戶 --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}（{u.email}）
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Slot */}
              <div>
                <label className="block text-lg font-bold mb-2">⏰ 時段</label>
                <div className="grid grid-cols-2 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setFormSlot(slot.id)}
                      className={`p-3 rounded-xl text-lg font-bold border-2 transition-all ${
                        formSlot === slot.id
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-lg font-bold mb-2">📍 地點</label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Food */}
              <div>
                <label className="block text-lg font-bold mb-2">🍜 食物</label>
                <div className="grid grid-cols-3 gap-2">
                  {foodOptions.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => toggleFormFood(food.id)}
                      className={`p-2 rounded-xl text-base font-bold border-2 transition-all ${
                        formFoods.includes(food.id)
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                      }`}
                    >
                      {food.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-lg font-bold mb-2">💬 備註</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={editingReg ? handleSaveEdit : handleSaveAdd}
                  disabled={formSaving}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl text-xl font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  {formSaving ? "儲存中..." : "💾 儲存"}
                </button>
                <button
                  onClick={closeModal}
                  className="bg-gray-300 text-gray-700 py-3 px-6 rounded-xl text-xl font-bold hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
