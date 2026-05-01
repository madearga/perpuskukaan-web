"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// Auth bypassed — TODO: re-enable after auth config
// import { useConvexAuth } from "convex/react";
import { useState, useEffect } from "react";
// import { redirect } from "next/navigation";
import { User, BookOpen, Bookmark, Star, MapPin, Phone, Mail, Calendar } from "lucide-react";

export default function ProfilePage() {
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(
    api.users.getProfile,
    user?._id ? { userId: user._id as any } : "skip"
  );
  const updateProfile = useMutation(api.users.updateProfile);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: "", phone: "", location: "", avatar: "" });

  // Auth bypassed

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
