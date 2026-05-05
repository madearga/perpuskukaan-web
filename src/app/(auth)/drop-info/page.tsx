"use client";

import Link from "next/link";
import { MapPin, Clock, ArrowLeft } from "lucide-react";

const dropPoints = [
  {
    name: "Perpuskukaan HQ",
    address: "Jl. Perpustakaan No. 1, Jakarta Selatan",
    hours: "Senin–Jumat 09.00–17.00, Sabtu 09.00–13.00",
    notes: "Masukkan buku di drop box dekat resepsionis.",
  },
  {
    name: "Co-Working Sudirman",
    address: "Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan",
    hours: "Senin–Sabtu 08.00–21.00",
    notes: "Serahkan ke front desk, sebutkan nama pemesan.",
  },
  {
    name: "Kedai Buku Blok M",
    address: "Jl. Melawai Raya No. 12, Jakarta Selatan",
    hours: "Setiap hari 10.00–20.00",
    notes: "Ada rak drop-off khusus Perpuskukaan di lantai 2.",
  },
];

export default function DropInfoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-borrows"
          className="rounded-md border p-1.5 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Titik Pengembalian</h1>
      </div>

      <p className="text-muted-foreground">
        Kembalikan buku yang dipinjam di salah satu titik drop berikut.
        Pastikan buku dalam kondisi baik sebelum dikembalikan.
      </p>

      <div className="space-y-4">
        {dropPoints.map((point) => (
          <div key={point.name} className="rounded-lg border p-4 space-y-2">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {point.name}
            </h2>
            <p className="text-sm">{point.address}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {point.hours}
            </p>
            <p className="text-sm text-muted-foreground italic">{point.notes}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 bg-muted/30 text-sm text-muted-foreground">
        <p>
         💡 <strong>Tips:</strong> Klik tombol &quot;Kembalikan&quot; di halaman{" "}
          <Link href="/my-borrows" className="text-primary underline">
            Pinjaman
          </Link>{" "}
          setelah menaruh buku di drop point, agar status buku segera diperbarui.
        </p>
      </div>
    </div>
  );
}
