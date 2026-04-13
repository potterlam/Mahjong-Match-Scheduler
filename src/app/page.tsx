"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface TimeSlot {
  id: string;
  label: string;
}

interface Location {
  id: string;
  name: string;
}

interface FoodOption {
  id: string;
  name: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load options
  useEffect(() => {
    fetch("/api/options")
      .then((r) => r.json())
      .then((data) => {
        setTimeSlots(data.timeSlots || []);
        setLocations(data.locations || []);
        setFoodOptions(data.foodOptions || []);
        if (data.locations?.length === 1) {
          setSelectedLocation(data.locations[0].id);
        }
      });
  }, []);

  // Load existing registration for selected date
  useEffect(() => {
    if (!session?.user || !date) return;

    fetch(`/api/registrations?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setExistingId(data.id);
          setSelectedSlot(data.timeSlotId);
          setSelectedLocation(data.locationId);
          setSelectedFoods(data.foods?.map((f: { foodOptionId: string }) => f.foodOptionId) || []);
          setNotes(data.notes || "");
        } else {
          setExistingId(null);
          setSelectedSlot("");
          setSelectedFoods([]);
          setNotes("");
        }
      });
  }, [date, session]);

  const toggleFood = (id: string) => {
    setSelectedFoods((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        timeSlotId: selectedSlot,
        locationId: selectedLocation,
        foodIds: selectedFoods,
        notes,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setExistingId(data.id);
      setSuccess(existingId ? "已更新報名！✅" : "報名成功！✅");
    }
  };

  const handleCancel = async () => {
    if (!existingId) return;
    if (!confirm("確定要取消報名嗎？")) return;

    const res = await fetch(`/api/registrations?id=${existingId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setExistingId(null);
      setSelectedSlot("");
      setSelectedFoods([]);
      setNotes("");
      setSuccess("已取消報名");
    }
  };

  if (status === "loading") {
    return (
      <div className="text-center py-20 text-2xl">載入中...</div>
    );
  }

  if (!session) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-red-700 mb-6">
        🀄 每日麻雀報名
      </h1>

      <p className="text-xl mb-6">
        👋 {session.user.name}，今日想打麻雀嗎？
      </p>

      {success && (
        <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4 text-lg font-bold">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-lg">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-xl font-bold mb-2">📅 日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
          />
        </div>

        {/* Time Slot */}
        <div>
          <label className="block text-xl font-bold mb-3">⏰ 時段</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {timeSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`p-4 rounded-xl text-xl font-bold border-3 transition-all ${
                  selectedSlot === slot.id
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
          <label className="block text-xl font-bold mb-2">📍 地點</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
          >
            <option value="">-- 選擇地點 --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Food */}
        <div>
          <label className="block text-xl font-bold mb-3">🍜 食物（可多選）</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {foodOptions.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => toggleFood(food.id)}
                className={`p-3 rounded-xl text-lg font-bold border-2 transition-all ${
                  selectedFoods.includes(food.id)
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
          <label className="block text-xl font-bold mb-2">💬 備註（選填）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-red-500 focus:outline-none"
            rows={2}
            placeholder="例如：遲 30 分鐘到"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !selectedSlot || !selectedLocation}
            className="flex-1 bg-red-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? "提交中..."
              : existingId
              ? "✏️ 更新報名"
              : "✅ 確認報名"}
          </button>

          {existingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-400 text-white py-4 px-6 rounded-xl text-xl font-bold hover:bg-gray-500"
            >
              ❌ 取消
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
