import { query } from "./_generated/server";

const DEFAULT_HELP_MARKDOWN = `# Petunjuk Perpuskukaan

Selamat datang di **Perpuskukaan** — platform berbagi buku antar pengguna.

## Cara Daftar

1. Klik **Sign in with Google** di halaman masuk
2. Lengkapi profil Anda setelah berhasil masuk

## Tambah Buku

1. Buka menu **Buku Saya**
2. Klik tombol **Tambah Buku**
3. Isi judul, penulis, kategori, dan kondisi buku
4. Buku akan muncul di katalog dan bisa dipinjam orang lain

## Pinjam Buku

1. Buka **Katalog** untuk melihat buku yang tersedia
2. Pilih buku yang ingin dipinjam
3. Klik **Ajukan Pinjaman** dan tentukan durasi
4. Tunggu persetujuan dari pemilik buku

## Kembalikan Buku

1. Buka menu **Pinjaman**
2. Pilih buku yang ingin dikembalikan
3. Klik **Kembalikan**

## Drop Point

Buku yang dipinjam dapat dikembalikan melalui **Drop Point** yang tersedia. Buka menu **Drop Point** untuk melihat lokasi pengembalian.

## Wishlist

Tambahkan buku ke **Wishlist** jika ingin mendapatkan notifikasi saat buku tersebut tersedia.

---

Jika ada pertanyaan, hubungi admin melalui fitur chat.
`;

export const getHelpContent = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "help-page"))
      .first();

    return doc ? doc.markdown : DEFAULT_HELP_MARKDOWN;
  },
});
