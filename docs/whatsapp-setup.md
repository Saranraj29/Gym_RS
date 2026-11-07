# WhatsApp automatic sending — step-by-step setup

This connects FitTrack to the **WhatsApp Business Cloud API** (Meta) so reminders, welcome messages and receipts go out
automatically. You do this once, then put two values in `.env`.

> **Not verified against Meta's live docs.** This guide was written from general knowledge of the process; Meta renames
> menus and changes limits and prices often. If a screen looks different, follow Meta's current
> "Get started" page for the WhatsApp Cloud API. Costs and limits below are not quotes — check Meta's pricing page.

## What you need before starting

- A **Facebook account** (use the gym owner's personal account — it becomes the admin).
- A **phone number for the gym's WhatsApp** that can receive an SMS or voice call for the OTP.
  - Best: a **new SIM/number that has never had WhatsApp**. Once a number is registered on the Cloud API it can't be
    used in the normal WhatsApp / WhatsApp Business phone app at the same time (unless you use Meta's "coexistence"
    option where it's offered — read its limits first).
  - Do **not** use your personal number.
- A **credit/debit card** for Meta billing (you pay per message — see Step 8).
- Business details (name, address, website/page). For *business verification* (Step 6) keep ready a GST/shop
  registration or similar document, and a utility bill/bank statement in the business name.
- Members' phone numbers must be **WhatsApp numbers**, and you should have their **consent** to message them
  (add a line to your joining form — Meta's policy requires opt-in).

## Step 1 — Create a Meta Business portfolio

1. Go to **business.facebook.com** → *Create account* (a "business portfolio").
2. Name it **RS Arnold Gym**, add your name and business email.

## Step 2 — Create a Meta developer app

1. Go to **developers.facebook.com** → log in → *Get started* / register as a developer.
2. **Create app** → choose the use case for **connecting with customers through WhatsApp** (the app type is *Business*).
3. Name it (e.g. `FitTrack`) and attach your **RS Arnold Gym** business portfolio.
4. In the app dashboard make sure the **WhatsApp** product is added.

## Step 3 — Try it with Meta's free test number

In the app: **WhatsApp → API Setup**.

- You'll see a **test phone number**, its **Phone number ID**, your **WhatsApp Business Account ID**, and a
  **temporary access token (valid ~24 hours)**.
- Add *your own* WhatsApp number as a **recipient** (the test number can only message numbers you list) and press
  *Send message* to receive the sample `hello_world` template.

This proves your account works. Don't use the temporary token for FitTrack — it expires.

## Step 4 — Add the gym's real number

1. **WhatsApp → API Setup → Add phone number**.
2. Enter the **display name** (should match your business, e.g. *RS Arnold Gym* — Meta reviews it), category (*Health & fitness*), then verify the number with the **OTP**.
3. Note the new **Phone number ID** — this goes in `.env` (not the test number's ID).

## Step 5 — Add a payment method

**WhatsApp Manager** (business.facebook.com → WhatsApp accounts) → **Payment settings / Billing** → add your card.
Without it you can't send beyond the free test/limited usage.

## Step 6 — (Recommended) Business verification

*Business Settings → Security Center → Start verification* — upload your business documents.
An unverified business has a **small daily limit on how many different people you can start conversations with**;
verification raises it as you send more good-quality messages. With ~hundreds of members you will want it.

## Step 7 — Create a permanent access token (System User)

The 24-hour token isn't suitable. Create a token that doesn't expire:

1. **business.facebook.com → Business Settings → Users → System users → Add** → name `fittrack`, role **Admin**.
2. **Add assets** for that system user: your **App** (full control) and your **WhatsApp account** (full control).
3. **Generate token** → select your app → expiry **Never** → tick permissions
   **`whatsapp_business_messaging`** and **`whatsapp_business_management`** → generate.
4. **Copy it now** — Meta shows it once. Treat it like a password.

## Step 8 — Create the message templates

Messages to a member who hasn't written to you in the last 24 hours **must be approved templates**.

1. In FitTrack open **Plans & settings → "WhatsApp automatic sending — setup guide"**. It lists **10 templates**
   (5 kinds × English/தமிழ்) with the exact **name**, **language**, **category** and **body**.
2. In **WhatsApp Manager → Message templates → Create template** make each one:
   - **Name:** exactly as listed (e.g. `fittrack_renewal_en`) — lowercase, underscores.
   - **Language:** English (`en`) or Tamil (`ta`) — must match the row.
   - **Category:** use the suggested one (*Utility*; the "expired" win-back one is usually treated as *Marketing*).
   - **Body:** press the copy button in FitTrack and paste. Keep the `{{1}} {{2}}…` placeholders.
   - Add **sample values** for the placeholders when asked (e.g. `Karthik`, `Quarterly`, `RS Arnold Gym`, `5 Nov`).
3. Submit. Approval usually takes minutes to a day. Start with **English renewal** and **fee** templates.

Meta rules that cause rejections: a body can't **start or end with a variable**, placeholders must be numbered in
order, and the wording must match the category (promotional text in a *Utility* template gets reclassified).

## Step 9 — Put the credentials in `.env`

In the project folder (copy `.env.example` to `.env` if you haven't):

```
WHATSAPP_ACCESS_TOKEN=<the permanent token from Step 7>
WHATSAPP_PHONE_NUMBER_ID=<Phone number ID of the gym's real number, Step 4>
# optional
WHATSAPP_API_VERSION=v23.0
WHATSAPP_DRY_RUN=false
AUTO_REMINDER_HOUR=9
```

Then restart:

```bash
docker compose up -d --build
```

`.env` is git-ignored — **never commit it or paste the token in chat**. If a token leaks, delete it in System users and
generate a new one.

## Step 10 — Test safely, then go live

1. First run with `WHATSAPP_DRY_RUN=true` — nothing is sent; the server log shows what *would* go out.
2. In FitTrack: **Plans & settings → How reminders are sent → Fully automatic → Save settings**.
3. Add a test member with **your own WhatsApp number** and an expiry in the next few days, then
   **WhatsApp reminders → Renewal due → Send** (set `WHATSAPP_DRY_RUN=false` for the real thing).
4. The rules (before expiry / on expiry / fee balance) run once a day around `AUTO_REMINDER_HOUR` (server time) —
   use **"Run today's rules now"** to try them. Nobody is messaged twice.

## Costs and limits (check Meta's pricing page)

- Meta charges **per template message, by category** (utility is cheaper than marketing; messages inside an open
  24-hour customer-service window and some utility messages can be free). Rates differ by country — look up **India**.
- Your **messaging limit** (unique people you can start conversations with per day) rises with verification and good
  quality. Members who block or report you lower your quality rating — only message people who opted in.

## Troubleshooting

FitTrack shows Meta's error text next to the member. Common ones:

| Message / code | Likely cause | Fix |
| --- | --- | --- |
| *Template name does not exist in the translation* (132001) | Name or language doesn't match, or template not approved yet | Use exact `fittrack_<kind>_<en|ta>` name and language; wait for approval |
| *Number of parameters does not match* (132000) | Template body differs from the guide | Re-create it by copying the body from the setup guide |
| *Recipient not in allowed list* (131030) | Still using the test number | Use the real number's Phone number ID and add a payment method |
| *Invalid OAuth access token* (190) | Token expired (24-hour token) or revoked | Create the permanent System User token (Step 7) |
| *Message undeliverable* (131026) | Member's number isn't on WhatsApp | Check the number |
| *Rate limit hit* (130429 / 131056) | Sending too fast / to the same person repeatedly | Wait and retry; avoid duplicates |
| "Not connected" in Settings | Token/ID missing in the backend environment | Check `.env`, then `docker compose up -d --build` |
