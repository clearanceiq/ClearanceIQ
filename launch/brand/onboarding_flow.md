ONBOARDING FLOW — KasiSetelbot
================================

## SETTINGAN AWAL
- Bot handle: @KasiSetelbot
- Harga: Starter RM19/sebulan (50 mesej sehari), Standard RM59/sebulan (unlimited)
- Plan Private: buat bulan 4
- Bahasa: Bahasa Malaysia + English (auto-detect)

---

## PERINGKAT 0: HUBUNGAN PERTAMA (When you reach out to customers)

### A. DM panas ke PEMILIK SME di kumpulan Telegram

Halo [nama]! 👋

Usaha kite macam mana ni?

Saya ada bot AI yang boleh tolong dokumen, chat pelanggan, dan jadual secara automatik. Bayaran tetap RM59 sebulan, percubaan 7 hari percuma.

Mau cuba? Klik @KasiSetelbot sekarang. Saya guide setup 2 minit je.

---

### B. DM to English-speaking professional

Hi [Name],

I’m running a small AI operator service based in Malaysia — privacy-first, flat fee, no lock-in.

If docs, scheduling, or customer comms ever slow you down, worth a 7-day free test: @KasiSetelbot

No card needed to start.

---

## PERINGKAT 1: /START (Botside)

**Bot jawab:**

Selamat datang / Welcome to KasiSetelbot!

Plan sekarang: Starter
Mesej hari ini: 0 / 50

Apa yang bot boleh buat:
/start — Papar mesej ni
/persona — Pilih mod bot
/upgrade — Tukar plan
/help — Bantuan

Email: support@tycoon.ai
Bot: @KasiSetelbot

---

## PERINGKAT 2: PILIH MOD BOT

**User taip:** /persona

**Bot jawab:**

Pilih mod / Choose a mode:

[Operator] — Bantuan harian, tanya apa-apa saja
[Writer] — Tulis & betul teks dalam BM atau English
[Translator] — Terjemah BM ↔ English
[Researcher] — Ringkasan laporan, cari fakta, susun info
[Customs] — Bantuan kastam MY/ID, kod HS, cukai

User tekan satu → Bot sahkan:

✓ Mod dah set: Operator
Bantuan harian — jawab soalan, tolong tugasan, chat biasa. (BM + EN)

---

## PERINGKAT 3: CADANGAN TUGAS PERTAMA

**Bot hantar terus selepas pilih mod:**

Nih contoh template ucapan pelanggan:

“Halo! Selamat datang di [Nama Usaha]. Ada yang boleh saya bantu?”

Mau saya simpan kat chat aktif kamu? (Jawab YA / TIDAK)

---

## PERINGKAT 4: PERCUBAAN PERCUMA (Hari 1–7)

**Bot buat begini:**
- Setiap jawapan, bot tambah nota di bahagian bawah:
  - “Hari 1 dari 7 percubaan percuma. Cuba mod lain? Taip /persona”
  - “Hari 3 dari 7. Dah cuba /customs untuk dokumen import?”
  - “Hari 6 dari 7. Akan tamat esok. /upgrade untuk terus guna.”

**Had percubaan:** 50 mesej sehari sahaja pada Starter.

**Jika user kena had:**
“Eh, you dah reach 50 mesej la untuk hari ni.
/upgrade dapat unlimited je, RM59 sebulan.”

---

## PERINGKAT 5: HARI 7 — NOTIS TAMAT PERCUBAAN

**Bot hantar:**

Peringatan: Percubaan percuma tamat esok.

Pilihan plan:
• Starter: RM19/sebulan — 50 mesej sehari
• Standard: RM59/sebulan — unlimited mesej

Tanpa ikatan, tanpa hidden fee.
/upgrade untuk pilih plan.

---

## PERINGKAT 6: BAYARAN

### Telegram Stars

1. User tekan /upgrade
2. Bot tunjuk butang:
   • Starter — RM19/sebulan
   • Standard — RM59/sebulan
   • Private (coming soon) — coming soon
3. User tekan “Standard”
4. Bot hantar invois Telegram:
   - Tajuk: “Upgrade ke Plan Standard”
   - Keterangan: Unlimited mesej. Best value.
   - Harga: RM59.00
   - Matawang: MYR
5. User bayar → bot handle successful_payment
6. Bot set tier = standard, expires_at = 30 hari dari sekarang
7. Bot sahkan:

✅ Bayaran berjaya! Kamu sekarang kat Plan Standard.
Tamat tempoh: YYYY-MM-DD.

### Stripe MY (pilihan)
- User tekan butang Stripe
- Bot hantar pautan checkout Stripe
- User bayar (FPX atau kad)
- Stripe webhook → bot activate

### FPX (pilihan)
- Sama macam Stripe, tapi guna pautan FPX operator

---

## PERINGKAT 7: SELAMAT DATANG KE PLAN BERJAYA

**Bot hantar selepas bayaran:**

Yeay! Plan Standard dah aktif.

Cuba sekarang:
• /persona — tukar mod (Writer, Translator, Customs, Researcher)
• Hantar dokumen — saya bantu buat ringkasan
• /help — hubungi support kena ada soalan

Enjoy! 🎉

---

## PERINGKAT 8: HABIT HARIAN / MINGGUAN

**Isnin (mula minggu):**
“Selamat Isnin! Minggu ni ada tugasan apa?
Saya boleh:
• Buat senarai to-do
• Tulis email / mesej pelanggan
• /customs — bantu dokumen import”

**Tengah bulan (Hari 15):**
“Separuh bulan sudah! Semoga lancar.
Tip: /researcher — ringkasan laporan dalam 10 saat.”

**Sebelum tamat tempoh (Hari 25):**
“Peringatan: langganan tamat dalam 5 hari.
/upgrade untuk lanjut — harga tetap RM59, tidak naik.”

---

## PERINGKAT 9: BIKIN USER BAYAR LEBIH (Upsell)

| Bila | Bot kata |
|---|---|
| User tanya boleh bikin video? | “Video generation bulan 4 dengan plan Private. sekarang saya boleh tolong teks, research, dokumen, terjemah je.” |
| User kena had 2x seminggu | “Lapan 50 mesej sehari kan tak cukup? /upgrade ke Standard — RM59/bulan, unlimited.” |
| User sebut audit / pematuhan | “Mod /customs bantu dokumen kastam MY/ID. Plan Standard unlock semua mod.” |
| User tanya data disimpan kat mana | “Plan Private (bulan 4) simpan kat hardware kami, tak share dengan orang. RM79/bulan.” |
| User ajak kawan | “Ajak 3 kawan dapat 1 bulan percuma. Email support@tycoon.ai untuk claim.” |

---

## PERINGKAT 10: CEGAH USER PERGI (Churn prevention)

**Jika user diam 7 hari:**
“Miss you la! Bot tak ada aktiviti 7 hari.
Ada feedback? Email support@tycoon.ai.
Reply SEMBUNG dapat 3 hari percuma semula.”

**Jika user nak downgrade / cancel:**
“Faham. /upgrade bila kamu sedia balik.
Data kamu disimpan 90 hari, boleh request semula.”

---

## COMMANDS BOT

| Command | Bot buat apa |
|---|---|
| /start | Tunjuk plan + mesej hari ini + senarian command |
| /help | Email + tugasan yang bot boleh buat + had |
| /persona | Butang pilih mod bot |
| /upgrade | Butang beli plan |
| /cancel | Cancel percubaan / langganan (coming soon) |

---

## ESCALATION

- Bot tak boleh settle: billing dispute, refund, soalan undang-undang
- “Nak cakap manusia” → “Email support@tycoon.ai. Balas dalam 24 jam, hari bekerja.”
- Block / unblock user: admin update `data/users.json` (coming soon)

---

## METRICS

| Metric | Di mana | Bila |
|---|---|---|
| Bilangan /start | users.json created | Hari 1 |
| Mod mana paling popular | persona dalam users.json | Hari 1 |
| Day 7 upgrade rate | paid_tier not None | Hari 7 |
| Daily active users | daily_count reset | Harian |
| Churn | paid_expires_at passed | Hari 30 |
| Support tickets | kiraan email | Mingguan |

---

Nota:
- Harga dalam MYR untuk Malaysia. IDR dah dalam config.py untuk Indonesia.
- Auto-expiry paid tier belum lagi — nak buat cron job later.
- /cancel command ada tapi handler belum siap.
