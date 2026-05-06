# Drop Point Booking

## Problem
Saat ini `/drop-info` hanya halaman statis lokasi drop point. User tidak bisa menjadwalkan janji drop-off buku.

## Solution
Tambah fitur booking drop point: user pilih lokasi + waktu, buat janji, dapat konfirmasi. Data booking tersimpan di Convex.

## Scope
### In scope
- CRUD drop point locations (admin)
- Booking form (user pilih lokasi + tanggal/jam)
- Konfirmasi booking
- List booking user + admin view
- Telegram command `/drop` bisa cek + booking

### Out of scope
- Notifikasi push/email (future)
- Google Calendar sync (future)
- Rating/review drop point (future)

## Affected specs
- `web-ui` — halaman `/drop-info` jadi interaktif
- `convex-data-model` — tabel baru `dropPoints` + `dropBookings`
- `public-agent-gateway` — action `list_drop_points` + `create_drop_booking`
- `telegram-bot` — command `/drop` bisa booking

## Acceptance
User bisa:
1. Lihat daftar drop point + slot waktu
2. Booking drop point untuk jam tertentu
3. Lihat status booking (confirmed/pending)
4. Admin bisa tambah/edit/hapus drop point
