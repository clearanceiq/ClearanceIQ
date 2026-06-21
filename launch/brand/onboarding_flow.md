ONBOARDING FLOW — Numbered Script
==================================

1. OPEN BOT
   User action : Opens Telegram chat with @tycoonbot
   Bot response: "Welcome to Tycoon Assistant ✨\nSaya adalah asisten AI bisnis yang menjaga privasi Anda sepenuhnya. Ketik /start untuk memulai."

2. /START COMMAND
   User action : Types /start
   Bot response: "Mari pilih peran Anda agar pengalaman bisa disesuaikan:\n1. Pemilik UMKM\n2. Profesional independen\n3. Tim kecil\nBalas dengan angka 1, 2, atau 3."

3. PERSONA SELECTION
   User action : Replies with persona number (e.g., "1")
   Bot response: "Oke, mode Pemilik UMKM aktif.\n\nSebelum lanjut — paket langganan hanya $15/bulan, flat fee.\n\nCoba gratis 7 hari tanpa kartu? Balas YA untuk langsung aktif."

4. TRIAL ACTIVATION
   User action : Replies "YA"
   Bot response: "Trial 7 hari aktif! 🎉\nCatatan: data Anda tidak pernah dibagikan atau dijadikan bahan model.\n\nTask pertama: Kirimkan nama usaha Anda. Saya akan buatkan template sapaan otomatis untuk pelanggan."

5. PAYMENT PROMPT (triggered 1 day before trial ends)
   Bot response: "Pengingat: trial berakhir dalam 1 hari.\nLanjutkan semua fitur dengan flat $15/bulan — tanpa kontrak, tanpa biaya tersembunyi.\n\n/pay untuk upgrade atau /skip untuk berhenti."

6. FIRST TASK SUGGESTION
   User action : Sends business name (e.g., "Warung Bu Sari")
   Bot response: "Template sapaan siap:\n\n'Halo! Selamat datang di Warung Bu Sari. Ada yang bisa saya bantu?'\n\nIngin saya pasang langsung ke chat aktif Anda? (Jawab BAIK / TIDAK)"
