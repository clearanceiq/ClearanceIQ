# KasiSetelbot — Remote-Ready Tasks

## Can be done RIGHT NOW (away from PC)

### 1. Domain registration
- Register kawal.my from MYNIC or reseller (~RM50-80/year)
- Register kawal.id (~Rp 100-200K/year)
- Reserve kawal.com via afternic/domain.com if desired

### 2. BotFather setup
- Open Telegram -> @BotFather
- Follow BOTFATHER_SETUP.md in this folder
- Set description, about text, commands

### 3. OpenRouter account
- Sign up at openrouter.ai
- Add $20-50 credits
- Create API key
- Paste into .env file on PC later

### 4. Telegram channel
- Create @KasiSetelbotChannel or @KasiSetel
- Use telegram_channel_description.md content for bio
- Pin welcome post
- Add first 10 beta testers from MY business groups

### 5. Stripe MY setup
- Sign up at stripe.com (MY account)
- Complete business verification
- Get publishable + secret keys
- Set webhook endpoint (will be your server later)

### 6. FPX setup (optional alternative)
- Sign up with FPX operator (e.g. MEPAY, iPay88)
- Get merchant ID + secret key
- Note: FPX requires local company registration in MY

### 7. Write outreach copy
- Send first 5 DMs to MY SME owners in Telegram groups
- Use outreach_templates.md as base
- Focus on: "AI assistant for your business, flat RM59/month"

### 8. Prepare beta tester list
- 20 MY contacts who might test for free in exchange for feedback
- Prioritize: e-commerce sellers, freight forwarders, clinic admins

### 9. Legal docs review
- Read launch/legal/*.md
- Customize privacy_policy.md with your actual company name/registration
- Have a local lawyer review if budget allows (RM200-500)

### 10. Competitor monitoring
- Bookmark: hermesinstall.com, teleclaw.io
- Join their Telegram groups if public
- Note their pricing and features for your pitch

## Must be done ON PC (queued for 7am)

### 1. Create .env
- Done: C:\Users\Najmi\Documents\Tycoon\site\bot\.env
- Just add OPENROUTER_API_KEY when you get it

### 2. Install dependencies
- pip install python-telegram-bot==20.7 httpx python-dotenv

### 3. Exclude bot folder from OneDrive
- Right-click bot folder -> Always keep on this device
- OR move to C:\bot\ outside OneDrive

### 4. Run bot
- Double-click RUN.bat or run: python bot.py

### 5. Security hardening
- Run C:\Users\Najmi\Documents\Tycoon\site\launch\security_hardening.ps1 as Admin
- Block SMB (445) and RPC (135) inbound on public networks

### 6. Test payment flow
- Send /upgrade to bot in private chat
- Test Telegram payment (use test card or small real payment)
- Verify user tier updates in data/users.json
