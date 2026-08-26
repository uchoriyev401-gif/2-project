# AI Bot — Qo'llanma

## Ma'lumotlar bazasi haqida

Bu bot **MongoDB yoki internetga bog'liq bo'lgan boshqa hech qanday
tashqi bazadan foydalanmaydi**. Barcha foydalanuvchilar, coinlar,
obunalar va to'lov so'rovlari `AI_bot/database/` papkasida oddiy
`users.json` va `payments.json` fayllari sifatida saqlanadi.

Bu shuni anglatadi:
- MongoDB Atlas, internet ulanishi, whitelist, login/parol muammolari
  butunlay yo'q.
- Bot faqat kompyuteringiz/serveringiz ishlab turgan vaqtda ishlaydi
  (bu MongoDB'li versiyada ham shunday edi).
- Agar botni keyinchalik Railway/Render kabi bulutli xizmatga
  joylashtirsangiz va u "ephemeral" (vaqtinchalik) diskdan foydalansa,
  har safar qayta deploy qilinganda `database/` papkasi tozalanishi
  mumkin — bunday holatda "persistent volume/disk" ulash kerak bo'ladi
  (buni sozlash uchun keyinroq murojaat qiling).

## 1. O'rnatish

```powershell
npm install
npm start
```

## 2. `.env` faylini to'ldirish

`.env` faylida quyidagilar bor:

- `BOT_TOKEN` — Telegram bot tokeningiz (allaqachon to'ldirilgan)
- `ADMIN_ID` — **BUNI TO'LDIRISHINGIZ SHART!** O'zingizning shaxsiy
  Telegram ID raqamingizni kiriting (masalan @userinfobot ga yozib
  bilib olishingiz mumkin). To'lov cheklari va tasdiqlash tugmalari
  aynan shu ID'ga yuboriladi.
- `CARD_NUMBER`, `CARD_OWNER` — foydalanuvchilarga to'lov qilish uchun
  ko'rsatiladigan karta raqami va egasi.
- `ADMIN_USERNAME` — coin almashtirish uchun foydalanuvchilarga
  ko'rsatiladigan sizning Telegram username'ingiz (@ belgisisiz).

## 3. Bot qanday ishlaydi

- **🎮 O'yinlar** — foydalanuvchiga tasodifiy savol chiqadi, 10 soniya
  vaqt beriladi, to'g'ri javob uchun +3 coin beriladi. Faqat obunachilar
  uchun.
- **📚 Darsliklar** — HTML/CSS/JS darslarini birma-bir ("Keyingi ➡️"
  tugmasi bilan) o'qish mumkin. Faqat obunachilar uchun.
- **🪙 Mening coinlarim** — coin balansini ko'rsatadi, "Sovg'aga
  almashtirish" tugmasi orqali admin bilan bog'lanish yo'riqnomasini
  beradi.
- **💎 Obuna bo'lish** — foydalanuvchi Oylik/Yillik rejani tanlaydi,
  karta raqami ko'rsatiladi, keyin foydalanuvchi to'lov chekini (rasm
  qilib) yuboradi. Chek sizga (ADMIN_ID'ga) ✅/❌ tugmalari bilan
  yuboriladi. Tasdiqlasangiz, obuna avtomatik faollashadi.

## 4. O'zingizning darslaringizni qo'shish

`data/lessons.js` faylini oching. Har bir kategoriya (`html`, `css`,
`js`) — darslar ro'yxati:

```js
html: [
  {
    title: "1-dars: HTML nima?",
    content: `To'liq dars matni shu yerga yoziladi.
Bir necha qatorli matn yozish uchun orqa tirnoq (`) belgisidan
foydalaning - shunda qator ko'chirishlar saqlanadi.`
  },
  {
    title: "2-dars: ...",
    content: `...`
  }
]
```

Agar tayyor kitob/PDF darsliklaringiz bo'lsa:
1. Matnni PDF/Word'dan nusxalang.
2. Har bir mavzuni/bobni alohida `{ title, content }` obyekti qilib
   joylashtiring.
3. Matn qanchalik uzun bo'lishidan qat'i nazar bot uni avtomatik
   bir nechta xabarga bo'lib yuboradi — qo'lda bo'lish shart emas.

Yangi kategoriya (masalan Python) qo'shmoqchi bo'lsangiz:
1. `data/lessons.js` ichiga yangi kalit qo'shing: `python: [...]`
2. `index.js` faylida `lessonCategories` ro'yxatiga qo'shing:
   ```js
   { key: "python", label: "🐍 Python" }
   ```

## 5. Savollarni qo'shish/o'zgartirish

`data/questions.js` faylini oching, xuddi shu formatda yangi savol
qo'shing (`id` unikal bo'lishi shart).

## 6. Narxlarni o'zgartirish

`config/plans.js` faylida `price` va `days` qiymatlarini o'zgartirishingiz
mumkin.
