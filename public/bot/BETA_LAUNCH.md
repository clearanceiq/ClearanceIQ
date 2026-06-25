KASISETELBOT — BETA LAUNCH PACKAGE
====================================

Bot: @kasisetelbot (confirmed online)
Status: READY FOR BETA
Languages: English + Bahasa Malaysia (bilingual)
Payment: Telegram Stars (primary), Stripe MY + FPX (placeholders)

---

## BETA TESTER DM (COPY-PASTE READY)

### English version
```
Hi [Name],

I'm launching KasiSetelbot — a privacy-first AI assistant for business docs, customer chat, and scheduling.

Flat fee, no lock-in, 7-day free trial.

Want to be a beta tester? Free access for 30 days in exchange for feedback.

Bot: @kasisetelbot
```

### Malay version
```
Halo [nama]!

Saya lancar KasiSetelbot — pembantu AI untuk dokumen perniagaan, chat pelanggan, dan jadual.

Bayaran tetap, tiada ikatan, percubaan 7 hari percuma.

Mahu jadi beta tester? Akses percuma 30 hari untuk feedback.

Bot: @kasisetelbot
```

---

## LAUNCH CHECKLIST (TONIGHT)

### 1. Bot Settings (via @BotFather)
- [x] Bot created: @kasisetelbot
- [ ] /setcommands — set bot commands
- [ ] /setdescription — set description
- [ ] /setabouttext — set about text
- [ ] /mybots → Payments — enable Telegram Stars

### 2. PC Setup (when available)
- [ ] Open .env file in bot folder
- [ ] Add OPENROUTER_API_KEY
- [ ] Run: pip install python-telegram-bot==20.7 httpx python-dotenv
- [ ] Run: python bot.py
- [ ] Verify bot responds to /start

### 3. Beta Outreach
- [ ] Send 5-10 DMs using templates above
- [ ] Track responses in beta_tester_log.md
- [ ] Ask for feedback after 3 days of use

### 4. Security
- [ ] Run C:\Users\Najmi\Documents\Tycoon\site\launch\security_hardening.ps1 as Admin
- [ ] Exclude bot folder from OneDrive

---

## BETA FEEDBACK QUESTIONS TO ASK

1. Which language do you prefer? (English / Malay / both)
2. Which persona do you use most? (Operator/Writer/Translator/Researcher/Customs)
3. Is the price clear? (RM59/month)
4. What would make you pay for this?
5. Any bugs or confusing messages?

---

## QUICK REFERENCE

Bot files location:
C:\Users\Najmi\Documents\Tycoon\site\bot\

Key files:
- bot.py — main bot
- config.py — settings, prices, languages
- payments.py — Telegram Stars + Stripe + FPX
- personas.py — 5 AI personas
- store.py — user data

Logs:
C:\Users\Najmi\Documents\Tycoon\site\bot\data\users.json
