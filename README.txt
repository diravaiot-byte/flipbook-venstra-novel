FLIPBOOK - BACA BUKU ONLINE (tampilan buku virtual)
===================================================

ISI FOLDER
  index.html        halaman web pembaca
  js/config.js      pengaturan judul, nama file PDF, warna (ubah di sini)
  book/book.pdf     <-- TARUH PDF BUKUMU DI SINI (ganti file contoh)
  css/, js/, lib/   tampilan dan mesin (tidak perlu diubah)

CARA PAKAI
  1. Ganti book/book.pdf dengan PDF bukumu (nama file harus book.pdf,
     atau ubah baris "pdf" di js/config.js).
  2. Ubah judul/subjudul/penulis di js/config.js.
  3. Unggah seluruh folder ke hosting (lihat di bawah). Selesai:
     pembaca tinggal buka alamat webnya.

MENCOBA DI KOMPUTER SENDIRI
  Situs ini TIDAK bisa dibuka dengan klik ganda index.html (browser
  memblokir pembacaan PDF dari file). Jalankan server lokal:
    - Windows : klik ganda  jalankan-lokal.bat   (butuh Python)
    - Mac/Linux: ./jalankan-lokal.sh
  lalu buka  http://localhost:8080
  Alternatif: ekstensi "Live Server" di VS Code.

HOSTING GRATIS (cukup unggah folder ini, tanpa server khusus)
  - Netlify    : app.netlify.com/drop  -> seret folder ke halaman itu
  - Cloudflare Pages / GitHub Pages / Vercel : unggah folder sebagai situs statis
  Pastikan file PDF ikut terunggah dan ukurannya wajar (disarankan < 25 MB).

TIPS PDF
  - Halaman 1 dan halaman terakhir tampil sebagai sampul (keras).
    Untuk hasil terbaik, jadikan halaman 1 = cover depan dan halaman
    terakhir = cover belakang. Jumlah halaman genap paling rapi.
  - Semua halaman sebaiknya berukuran sama (mis. A5).
  - Di ponsel buku tampil satu halaman penuh; di layar lebar tampil
    dua halaman seperti buku terbuka. Geser untuk membalik.
  - Kecepatan: halaman dirender di browser pembaca, jadi PDF teks murni
    (seperti novel) sangat ringan.

KONTROL PEMBACA
  Klik/geser/tarik pojok halaman, tombol panah, slider halaman,
  keyboard (kiri/kanan, Home/End, F = layar penuh). Posisi baca
  terakhir diingat di browser pembaca.

LISENSI KOMPONEN
  Lihat lib/LICENSES.txt (pdf.js: Apache-2.0, StPageFlip: MIT).
