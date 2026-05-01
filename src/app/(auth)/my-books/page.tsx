"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// Auth bypassed — TODO: re-enable after auth config
// import { useConvexAuth } from "convex/react";
import { useState } from "react";
// import { redirect } from "next/navigation";
import { BookOpen, Plus, X } from "lucide-react";

const CATEGORIES = ["Fiksi", "Non-Fiksi", "Filsafat", "Sejarah", "Sains", "Teknologi", "Agama", "Seni", "Lainnya"];
const CONDITIONS = ["new", "like_new", "good", "fair", "poor"];
const LANGUAGES = ["Indonesia", "Inggris", "Arab", "Jepang", "Lainnya"];
const FICTION_TYPES = ["fiksi", "non_fiksi"];
const MODES = ["p2p", "library", "both"];

export default function MyBooksPage() {
  const user = useQuery(api.auth.getCurrentUser);
  const myBooks = useQuery(
    api.books.getMyBooks,
    user?._id ? { userId: user._id as any } : "skip"
  );
  const addBook = useMutation(api.books.add);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    description: "",
    category: "Fiksi",
    condition: "good",
    language: "Indonesia",
    fictionType: "fiksi",
    mode: "p2p",
    coverImage: "",
  });

  // Auth bypassed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;
    await addBook({ ...form, ownerId: user._id as any });
    setShowForm(false);
    setForm({
      title: "", author: "", isbn: "", description: "",
      category: "Fiksi", condition: "good", language: "Indonesia",
      fictionType: "fiksi", mode: "p2p", coverImage: "",
    });
  };

  // Auth bypassed — no loading gate

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buku Saya</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Tutup" : "Tambah Buku"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Judul *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Penulis *</label>
              <input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">ISBN</label>
              <input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Kondisi *</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Bahasa *</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1">
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipe *</label>
              <select value={form.fictionType} onChange={(e) => setForm({ ...form, fictionType: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1">
                {FICTION_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Mode *</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1">
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1" rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium">Cover Image URL</label>
            <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className="w-full rounded-md border p-2 text-sm mt-1" placeholder="https://..." />
          </div>
          <button type="submit" className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium">Simpan Buku</button>
        </form>
      )}

      {!myBooks || myBooks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 mb-4" />
          <p>Belum ada buku. Tambahkan buku pertama Anda!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myBooks.map((book: any) => (
            <div key={book._id} className="rounded-lg border p-4 space-y-3">
              <div className="aspect-[3/4] bg-muted rounded flex items-center justify-center">
                {book.coverImage ? <img src={book.coverImage} alt="" className="h-full w-full object-cover rounded" /> : <BookOpen className="h-12 w-12 text-muted-foreground" />}
              </div>
              <div>
                <h3 className="font-semibold">{book.title}</h3>
                <p className="text-sm text-muted-foreground">{book.author}</p>
              </div>
              <div className="flex gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${book.status === "available" ? "bg-green-100 text-green-800" : book.status === "lent" ? "bg-amber-100 text-amber-800" : "bg-gray-100"}`}>{book.status}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{book.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
