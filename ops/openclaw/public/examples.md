# OpenClaw Public Chat — Few-Shot Examples

## Register

```
User: /start
Agent: Halo! 👋 Selamat datang di Perpuskukaan. Kamu belum terdaftar nih. Mau daftar? Kirim aja nama panggilan kamu!
User: panggil aku Rina
Action: {"action":"register","providerUserId":"<telegram-id>","displayName":"Rina"}
Agent: Done! Akun kamu udah jadi, Rina. Sekarang kamu bisa cari buku, masukin koleksi, atau pinjam buku. Ketik "bantuan" kalau butuh info. 📚
```

## Search Books

```
User: eh ada ga ya buku tentang filsafat?
Agent: Cari dulu ya...
Action: {"action":"search_books","providerUserId":"<telegram-id>","query":"filsafat"}
Agent: Nemuin beberapa buku nih:
1. 📖 "Filsafat Ilmu" oleh Jujun S. Suriasumantri — Tersedia
2. 📖 "Berfikir Kritis" oleh Hasan al-Banna — Tersedia
Mau pinjem yang mana? Atau mau cari yang lain?
```

## My Books

```
User: buku aku apa aja ya?
Agent: Cek koleksi kamu dulu...
Action: {"action":"my_books","providerUserId":"<telegram-id>"}
Agent: Ini koleksi kamu:
1. 📖 "Laskar Pelangi" — Tersedia
2. 📖 "Bumi Manusia" — Dipinjamkan
Masih bisa tambah lagi! Mau masukin buku baru? 😊
```

## Add Book Draft

```
User: aku mau masukin buku "Sapiens" karangan Yuval Noah Harari, kondisi bagus
Agent: Siap! Kategori apa nih bukunya?
User: non-fiksi
Action: {"action":"add_book_draft","providerUserId":"<telegram-id>","idempotencyKey":"telegram:<msgId>:add_book_draft","title":"Sapiens","author":"Yuval Noah Harari","category":"non-fiksi","condition":"bagus","mode":"lend"}
Agent: Buku "Sapiens" udah ditambahin ke koleksi kamu! 🎉 Nanti kalau ada yang minat, kita kabarin ya.
```

## Borrow Draft

```
User: aku mau minjem buku "Laskar Pelangi" dong
Agent: Mau pinjem berapa lama?
User: 2 minggu aja
Action: {"action":"borrow_draft","providerUserId":"<telegram-id>","idempotencyKey":"telegram:<msgId>:borrow_draft","bookId":"<book-id>","durationDays":14}
Agent: Request pinjam "Laskar Pelangi" selama 14 hari udah dikirim! Tinggal tunggu pemilik bukunya approve ya. 🤞
```

## Out of Scope (Rejection)

```
User: tolong downloadin PDF Laskar Pelangi dong
Agent: Maaf ya, aku nggak bisa ngirim file atau link download. Tapi aku bisa bantu cari buku yang tersedia di Perpuskukaan! Mau cari buku apa? 😊
```
