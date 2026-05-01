"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/convex/_generated/api";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { User, BookOpen, Bookmark, Star, MapPin, Phone, Mail, Calendar, Link2, Unlink, AlertCircle, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(
    api.users.getProfile,
    user?._id ? { userId: user._id as any } : undefined
  );
  const linkStatus = useQuery(api.users.getAccountLinkStatus);
  const updateProfile = useMutation(api.users.updateProfile);
  const connectTelegram = useMutation(api.users.connectTelegram);
  const disconnectTelegram = useMutation(api.users.disconnectTelegram);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: "", phone: "", location: "", avatar: "" });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [linking, setLinking] = useState(false);

  const searchParams = useSearchParams();

  // Handle cookie-based Telegram link flow
  useEffect(() => {
    const step = searchParams.get("step");
    if (step === "link" && user?._id) {
      const cookie = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("telegram_link="));
      if (cookie) {
        const token = cookie.split("=")[1];
        handleTelegramLink(token);
      }
    }

    // Handle error/success query params
    const error = searchParams.get("error");
    if (error) {
      const errorMap: Record<string, string> = {
        expired: "Sesi kadaluarsa. Silakan coba lagi.",
        invalid: "Verifikasi gagal. Silakan coba lagi.",
        session: "Sesi tidak valid. Silakan login ulang.",
        server: "Terjadi kesalahan server. Silakan coba lagi.",
        rate_limited: "Terlalu banyak percobaan. Tunggu 15 menit.",
      };
      setMessage({ type: "error", text: errorMap[error] || "Terjadi kesalahan." });
    }

    const linked = searchParams.get("linked");
    if (linked === "telegram") {
      setMessage({ type: "success", text: "Telegram berhasil terhubung!" });
    }
  }, [searchParams, user?._id]);

  const handleTelegramLink = async (token: string) => {
    try {
      setLinking(true);
      // Parse JWT: payload.signature
      const [payloadB64, sigB64] = token.split(".");
      if (!payloadB64 || !sigB64) throw new Error("Invalid token");

      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp < Date.now()) throw new Error("Token expired");

      await connectTelegram({
        webUserId: user?._id as any,
        telegramId: payload.telegramId,
        username: payload.username || undefined,
        firstName: payload.firstName || undefined,
      });

      // Clear cookie
      document.cookie = "telegram_link=; Max-Age=0; path=/;";
      setMessage({ type: "success", text: "Telegram berhasil terhubung!" });
      window.location.href = "/profile?linked=telegram";
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal menghubungkan Telegram." });
    } finally {
      setLinking(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectTelegram({});
      setMessage({ type: "success", text: "Telegram berhasil diputuskan." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal memutuskan Telegram." });
    }
  };

  useEffect(() => {
    if (profile) {
      setForm({
        bio: profile.bio || "",
        phone: profile.phone || "",
        location: profile.location || "",
        avatar: profile.avatar || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user?._id) return;
    await updateProfile({
      userId: user._id as any,
      bio: form.bio || undefined,
      phone: form.phone || undefined,
      location: form.location || undefined,
      avatar: form.avatar || undefined,
    });
    setEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center gap-2 ${
          message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Telegram Link Section */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold">Akun Telegram</h3>
        {linkStatus?.hasTelegram ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Terhubung dengan @{linkStatus.telegramUsername || "Telegram"}</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
            >
              <Unlink className="h-4 w-4" />
              Putuskan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hubungkan akun Telegram untuk sinkronisasi data dengan bot.
            </p>
            {linking ? (
              <div className="text-sm text-muted-foreground">Menghubungkan...</div>
            ) : (
              <div>
                <script
                  async
                  src="https://telegram.org/js/telegram-widget.js?22"
                  data-telegram-login="Perpuskukaanbot"
                  data-size="large"
                  data-auth-url="https://watchful-rook-105.convex.site/api/link-telegram"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {profile.firstName || profile.username || profile.email}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {profile.email}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Buku</span>
            </div>
            <div className="text-xl font-bold">{profile.stats?.totalBooks || 0}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Bookmark className="h-4 w-4" />
              <span className="text-sm">Pinjam</span>
            </div>
            <div className="text-xl font-bold">{profile.stats?.totalBorrows || 0}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span className="text-sm">Reputasi</span>
            </div>
            <div className="text-xl font-bold">{profile.reputation || 0}</div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Informasi</h3>
          <button
            onClick={() => setEditing(!editing)}
            className="text-sm text-primary hover:underline"
          >
            {editing ? "Batal" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full rounded-md border p-2 text-sm mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telepon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border p-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lokasi</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-md border p-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Avatar URL</label>
              <input
                type="text"
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                className="w-full rounded-md border p-2 text-sm mt-1"
              />
            </div>
            <button
              onClick={handleSave}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              Simpan
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {profile.phone || "Belum diisi"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {profile.location || "Belum diisi"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Bergabung {new Date(profile.createdAt).toLocaleDateString("id-ID")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
