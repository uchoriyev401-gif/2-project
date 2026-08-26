# Botni 24/7 ishlatish (noutbuk o'chsa ham ishlashi uchun)

Hozir bot faqat siz `npm start` bosib turgan vaqtda ishlaydi. Noutbukni
yopsangiz — bot ham to'xtaydi. Doim ishlab turishi uchun uni bulutli
serverga (masalan **Railway**) joylashtirish kerak.

## 1-qadam: Kodni GitHub'ga yuklash

1. https://github.com sayti orqali ro'yxatdan o'ting (agar hisobingiz
   bo'lmasa).
2. Yangi repository yarating, masalan `ai-bot`.
3. `AI_bot` papkangizda terminal oching va quyidagilarni bajaring:

```bash
git init
git add .
git commit -m "Birinchi commit"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ai-bot.git
git push -u origin main
```

`.env` fayli avtomatik yuklanmaydi (`.gitignore`da bor) — bu xavfsizlik
uchun to'g'ri, token va parollar ochiq internetga chiqmasligi kerak.

## 2-qadam: Railway'da loyiha yaratish

1. https://railway.app ga kiring, GitHub orqali ro'yxatdan o'ting.
2. **"New Project"** → **"Deploy from GitHub repo"** → yuqorida
   yaratgan repo'ni tanlang.

## 3-qadam: Muhit o'zgaruvchilarini (Variables) qo'shish

Railway loyiha sozlamalarida **"Variables"** bo'limiga o'ting va
`.env` faylingizdagi qiymatlarni birma-bir qo'shing:

```
BOT_TOKEN=sizning_bot_tokeningiz
ADMIN_ID=sizning_telegram_id_raqamingiz
CARD_NUMBER=sizning_karta_raqamingiz
CARD_OWNER=F.I.Sh.
ADMIN_USERNAME=sizning_username
```

## 4-qadam: Ishga tushirish turi

Railway `Procfile` ichidagi `worker: node index.js` buyrug'ini avtomatik
aniqlab, botni fon jarayoni sifatida ishga tushiradi. Agar "Start
Command" so'ralsa, qo'lda kiriting: `node index.js`

## 5-qadam: Tekshirish

"Deployments" → loglarni oching. Quyidagi yozuv chiqishi kerak:
```
✅ Mahalliy (local) ma'lumotlar bazasi tayyor (MongoDB kerak emas)
🤖 Bot ishga tushdi!
```

Shundan keyin bot Railway serverida ishlab turadi — noutbukingiz
yoqilgan yoki o'chganidan qat'i nazar.

## ⚠️ MUHIM: ma'lumotlar saqlanishi haqida

Bot foydalanuvchilar, coinlar va obunalarni `database/` papkasidagi
JSON fayllarda saqlaydi. Railway'ning bepul rejasida disk odatda
**vaqtinchalik (ephemeral)** bo'ladi — ya'ni har safar kodni qayta
deploy qilganingizda (masalan yangi o'zgarish yuklaganingizda),
`database/` papkasi **tozalanib ketishi** va barcha foydalanuvchi
ma'lumotlari (coinlar, obunalar) yo'qolishi mumkin.

Buning oldini olish uchun ikkita variant bor:
1. **Railway Volume** ulash — Railway loyiha sozlamalarida "Volumes"
   bo'limidan `AI_bot/database` papkasiga doimiy disk ulash mumkin
   (odatda pullik rejalarda mavjud). Agar shu kerak bo'lsa, ayting —
   sozlab beraman.
2. Botni bo'lim o'zgarmaydigan **VPS** (masalan Timeweb, Hetzner)
   serverida ishlatish — u yerda disk doimiy bo'ladi, hech narsa
   o'chib ketmaydi.

Agar hozircha faqat sinov/kichik miqyosda ishlatayotgan bo'lsangiz,
bu haqida hozir tashvishlanmasa ham bo'ladi — foydalanuvchilar sonи
ko'payib, jiddiy ishga tushganingizda shu masalaga qaytish kifoya.
