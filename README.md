# Task Reward Platform

Prototype sistem tugas -> verifikasi admin -> saldo -> withdrawal.

## Jalankan
1. Install Node.js.
2. `npm install`
3. `npm start`
4. Buka `http://localhost:3000`
5. Admin panel: `http://localhost:3000/admin/`
6. Login admin default: `admin` / `ganti-password-ini` lalu segera ganti implementasinya sebelum dipakai nyata.

## Catatan penting
- Endpoint `/api/admin/withdrawals/:id/pay` masih MOCK PAYMENT.
- Jangan memasukkan API key payment provider ke frontend.
- Untuk produksi tambahkan HTTPS, rate limiting, validasi input, CSRF protection bila memakai cookie auth, audit log, KYC/age/business requirements sesuai provider, dan webhook/idempotency dari payment provider.
- Verifikasi install/aktivitas aplikasi pihak ketiga harus menggunakan mekanisme resmi dari pihak aplikasi/provider. Jangan mengandalkan klaim dari browser.
