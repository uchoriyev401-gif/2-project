require("dotenv").config();

const path = require("path");
const { Telegraf } = require("telegraf");

const db = require("./lib/db");
const mainKeyboard = require("./keyboards/mainKeyboard");
const adminKeyboard = require("./keyboards/adminKeyboard");
const questions = require("./data/questions");
const lessons = require("./data/lessons");
const plans = require("./config/plans");

const ADMIN_ID = Number(process.env.ADMIN_ID);

const bot = new Telegraf(process.env.BOT_TOKEN);

console.log("✅ Mahalliy (local) ma'lumotlar bazasi tayyor (MongoDB kerak emas)");


// ==========================
// BLOKLANGAN FOYDALANUVCHILARNI TEKSHIRISH
// ==========================
// Diqqat: Telegram Bot API orqali skrinshot yoki fayl saqlashni
// AVTOMATIK aniqlash imkonsiz — bu Telegram tizimining o'zi hech
// qanday botga bunday signal bermaydi. Shuning uchun bloklash faqat
// ADMIN tomonidan qo'lda (/warn, /block komandalar bilan) amalga
// oshiriladi. Bu yerda faqat bloklangan foydalanuvchini cheklash
// va jarima to'lovini qabul qilish logikasi bor.

bot.use(async (ctx, next) => {
    if (!ctx.from) return next();

    const user = db.findUser(ctx.from.id);
    if (user && user.blocked) {
        // Bloklangan foydalanuvchi jarima chekini yuborsa — qabul qilamiz
        if (ctx.updateType === "message" && ctx.message && ctx.message.photo) {
            pendingPayment.set(ctx.from.id, "fine");
            return next();
        }

        await ctx.reply(
            `⛔ Siz botdan bloklangansiz!

Qayta ulanish uchun ${plans.fine.price.toLocaleString()} so'm jarima to'lashingiz kerak:

💳 ${plans.card.number}
👤 ${plans.card.owner}

To'lov qilgach, chek/skrinshotni RASM sifatida shu yerga yuboring.`
        );
        return;
    }

    return next();
});


// ==========================
// XOTIRADAGI VAQTINCHALIK HOLAT
// ==========================

const pendingPayment = new Map(); // telegramId -> "threeDay" | "week" | "month" | "threeMonth" | "fine"
const activeQuestions = new Map(); // `${chatId}_${messageId}` -> { questionId, answered, timeout }

const lessonCategories = [
    { key: "html", label: "🌐 HTML" },
    { key: "css", label: "🎨 CSS" },
    { key: "js", label: "⚡ JavaScript" }
];


// ==========================
// YORDAMCHI FUNKSIYALAR
// ==========================

// Bu funksiya ishga tushirilishidan OLDIN yaratilgan (userId maydoni
// bo'lmagan) foydalanuvchilarga orqa fonda qisqa ID biriktiradi.
function ensureUserId(user) {
    if (!user.userId) {
        user.userId = db.getNextUserId();
        db.saveUser(user);
    }
    return user;
}

function isSubscriptionActive(user) {
    if (!user.subscription || !user.subscription.active) return false;
    if (!user.subscription.expiresAt) return false;
    return new Date(user.subscription.expiresAt).getTime() > Date.now();
}

const STUDY_DAY_GROUPS = {
    mon_wed_fri: { label: "Dushanba / Chorshanba / Juma", days: [1, 3, 5] },
    tue_thu_sat: { label: "Seshanba / Payshanba / Shanba", days: [2, 4, 6] }
};

function isStudyDayToday(user) {
    if (!user.studyDays || !STUDY_DAY_GROUPS[user.studyDays]) return false;
    const today = new Date().getDay(); // 0=Yak,1=Dush,...6=Shan
    return STUDY_DAY_GROUPS[user.studyDays].days.includes(today);
}

async function requireStudyDay(ctx, user) {
    if (!user.studyDays) {
        await ctx.reply(
            `⚠️ Avval dars kunlaringizni tanlashingiz kerak. Iltimos admin bilan bog'laning: @${plans.adminUsername}`
        );
        return false;
    }

    if (!isStudyDayToday(user)) {
        const groupLabel = STUDY_DAY_GROUPS[user.studyDays].label;
        await ctx.reply(
            `📅 Bugun sizning dars kuningiz emas.

Sizning dars kunlaringiz: ${groupLabel}
O'sha kunlarda qaytadan urinib ko'ring 🙂`
        );
        return false;
    }

    return true;
}

// Foydalanuvchining obunasi boshlangan sanadan buyon nechta "dars kuni"
// o'tganini hisoblaydi — shuncha son darslik ochilgan bo'ladi (kuniga 1 ta).
function getUnlockedLessonCount(user, categoryKey) {
    const list = lessons[categoryKey];
    if (!list) return 0;
    if (!user.studyDays || !user.subscriptionStartDate) return 0;

    const days = STUDY_DAY_GROUPS[user.studyDays].days;
    const start = new Date(user.subscriptionStartDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    const d = new Date(start);
    while (d <= today) {
        if (days.includes(d.getDay())) count++;
        d.setDate(d.getDate() + 1);
    }

    return Math.min(count, list.length);
}

async function requireSubscription(ctx, user) {
    if (isSubscriptionActive(user)) return true;

    if (user.subscription.active) {
        user.subscription.active = false;
        db.saveUser(user);
    }

    const tierLines = ["threeDay", "week", "month", "threeMonth"]
        .map((key) => `💎 ${plans[key].label}: ${plans[key].price.toLocaleString()} so'm`)
        .join("\n");

    await ctx.reply(
        `🔒 Bu bo'lim faqat obunachilar uchun!

${tierLines}

Obuna bo'lish uchun "💎 Obuna bo'lish" tugmasini bosing.`
    );
    return false;
}

async function sendLesson(ctx, categoryKey, index) {
    const list = lessons[categoryKey];
    if (!list || !list[index]) {
        return ctx.reply("Dars topilmadi.");
    }

    const lesson = list[index];
    const imagePath = path.join(__dirname, "assets", "lessons", lesson.image);

    await ctx.replyWithPhoto(
        { source: imagePath },
        {
            caption: `📖 ${lesson.title}\n(${index + 1}/${list.length})`,
            protect_content: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        ...(index > 0
                            ? [{ text: "⬅️ Oldingi", callback_data: `lesson_${categoryKey}_${index - 1}` }]
                            : []),
                        ...(index < list.length - 1
                            ? [{ text: "Keyingi ➡️", callback_data: `lesson_${categoryKey}_${index + 1}` }]
                            : [])
                    ]
                ]
            }
        }
    );
}


// ==========================
// START
// ==========================

bot.start(async (ctx) => {
    const telegramId = ctx.from.id;

    if (telegramId === ADMIN_ID) {
        await ctx.reply(
            `👑 ADMIN PANELGA XUSH KELIBSIZ!

👥 "Foydalanuvchilar" — barcha foydalanuvchilar ro'yxati (ID, ism, holat)
📊 "Statistika" — umumiy statistika

Boshqaruv komandalari:
/warn <ID> — ogohlantirish
/block <ID> — bloklash
/unblock <ID> — blokdan chiqarish
/removecoins <ID> <miqdor> — coin yechish`,
            adminKeyboard
        );
        return;
    }

    let user = db.findUser(telegramId);

    if (!user) {
        user = db.createUser({
            telegramId,
            firstName: ctx.from.first_name,
            username: ctx.from.username || "username yo'q"
        });

        await ctx.reply(
            `🎉 Xush kelibsiz, ${ctx.from.first_name}!

🆔 Sizning ID raqamingiz: ${user.userId}
(Admin bilan bog'langanda shu raqamni ayting)

📚 Bu botda:
🎮 Quiz o'yinlari
🪙 Coin yig'ish
📖 HTML, CSS, JavaScript darslari
💎 Premium imkoniyatlar mavjud.

Botdan to'liq foydalanish uchun obuna bo'lishingiz kerak.`,
            mainKeyboard
        );
    } else {
        ensureUserId(user);
        await ctx.reply(
            `👋 Qaytganingizdan xursandmiz, ${ctx.from.first_name}!
🆔 Sizning ID raqamingiz: ${user.userId}`,
            mainKeyboard
        );
    }
});


// ==========================
// ADMIN PANEL
// ==========================

bot.command("admin", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await ctx.reply("👑 Admin panel", adminKeyboard);
});

bot.hears("👥 Foydalanuvchilar", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const users = db.getUsers();
    if (users.length === 0) {
        return ctx.reply("Hozircha hech kim ro'yxatdan o'tmagan.");
    }

    const lines = users.map((u) => {
        const subActive = isSubscriptionActive(u);
        const statusIcon = u.blocked ? "🚫" : subActive ? "💎" : "⬜";
        const subLabel = subActive && plans[u.subscription.type] ? plans[u.subscription.type].label : "obunasiz";
        return `${statusIcon} ID: ${u.userId ?? "—"} | ${u.firstName} (@${u.username}) | 🪙${u.coins} | ${subLabel}`;
    });

    // Telegram xabar hajmi cheklangani uchun 30 tadan bo'lib yuboramiz
    const CHUNK = 30;
    for (let i = 0; i < lines.length; i += CHUNK) {
        const part = lines.slice(i, i + CHUNK).join("\n");
        await ctx.reply(
            `👥 FOYDALANUVCHILAR (${i + 1}-${Math.min(i + CHUNK, lines.length)} / ${lines.length})

${part}`
        );
    }
});

bot.hears("📊 Statistika", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const users = db.getUsers();
    const total = users.length;
    const activeSubscribers = users.filter((u) => isSubscriptionActive(u)).length;
    const blocked = users.filter((u) => u.blocked).length;
    const totalCoins = users.reduce((sum, u) => sum + (u.coins || 0), 0);

    await ctx.reply(
        `📊 STATISTIKA

👥 Jami foydalanuvchilar: ${total}
💎 Faol obunachilar: ${activeSubscribers}
🚫 Bloklanganlar: ${blocked}
🪙 Jami coinlar (barcha foydalanuvchilarda): ${totalCoins}`
    );
});

bot.hears("🔙 Oddiy menyu", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await ctx.reply("Oddiy menyuga qaytdingiz. Qayta admin panelga kirish uchun /admin yozing.", mainKeyboard);
});

bot.hears("👤 Profil", async (ctx) => {
    const user = db.findUser(ctx.from.id);
    if (!user) return ctx.reply("Avval /start bosing.");
    ensureUserId(user);

    const subActive = isSubscriptionActive(user);

    let subText = "Faol emas ❌";
    if (subActive) {
        const expDate = new Date(user.subscription.expiresAt).toLocaleDateString("uz-UZ");
        const typeLabel = plans[user.subscription.type] ? plans[user.subscription.type].label : user.subscription.type;
        subText = `Faol ✅ (${typeLabel}, ${expDate} gacha)`;
    }

    const studyDaysText = user.studyDays
        ? STUDY_DAY_GROUPS[user.studyDays].label
        : "Tanlanmagan";

    await ctx.reply(
        `👤 SIZNING PROFILINGIZ

🆔 ID: ${user.userId}
📝 Ism: ${user.firstName}
🪙 Coin: ${user.coins}
💎 Obuna: ${subText}
📅 Dars kunlari: ${studyDaysText}`
    );
});


// ==========================
// COIN
// ==========================

bot.hears("🪙 Mening coinlarim", async (ctx) => {
    const user = db.findUser(ctx.from.id);
    if (!user) return ctx.reply("Avval /start bosing.");

    await ctx.reply(
        `🪙 Sizning coinlaringiz:

💰 ${user.coins} COIN

To'plagan coinlaringizni haqiqiy sovg'aga almashtirish uchun pastdagi tugmani bosing.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎁 Sovg'aga almashtirish", callback_data: "redeem_coins" }]
                ]
            }
        }
    );
});

bot.action("redeem_coins", async (ctx) => {
    await ctx.answerCbQuery();
    const user = db.findUser(ctx.from.id);
    if (!user) return;

    await ctx.reply(
        `🎁 Coinlaringizni sovg'aga almashtirish uchun quyidagi admin bilan bog'laning:

👤 @${plans.adminUsername}

Xabaringizda quyidagilarni ko'rsating:
🆔 Sizning ID: ${ctx.from.id}
🪙 Coin miqdoringiz: ${user.coins}

⚠️ Sovg'a berilgach, admin coinlaringizni hisobingizdan yechadi.`
    );
});


// ==========================
// QUIZ
// ==========================

bot.hears("🎮 O'yinlar", async (ctx) => {
    const user = db.findUser(ctx.from.id);
    if (!user) return ctx.reply("Avval /start bosing.");
    if (!(await requireSubscription(ctx, user))) return;
    if (!(await requireStudyDay(ctx, user))) return;

    await sendRandomQuestion(ctx, user);
});

const DAILY_QUESTION_LIMIT = 15;

function getTodayString() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Kunlik limitni tekshiradi. Agar limit tugagan bo'lsa false qaytaradi
// va foydalanuvchiga xabar yuboradi. Aks holda hisoblagichni +1
// oshiradi va true qaytaradi.
async function checkAndIncrementDailyLimit(ctx, user) {
    const today = getTodayString();

    if (!user.dailyQuestions || user.dailyQuestions.date !== today) {
        user.dailyQuestions = { date: today, count: 0 };
    }

    if (user.dailyQuestions.count >= DAILY_QUESTION_LIMIT) {
        await ctx.reply(
            `⏸ Bugungi kunlik limitga yetdingiz!

Kuniga faqat ${DAILY_QUESTION_LIMIT} ta savolga javob berish mumkin.
Ertaga qaytadan urinib ko'ring 🌙`
        );
        return false;
    }

    user.dailyQuestions.count += 1;
    db.saveUser(user);
    return true;
}

async function sendRandomQuestion(ctx, user) {
    if (!(await checkAndIncrementDailyLimit(ctx, user))) return;

    let pool = questions.filter((q) => !user.answeredQuestions.includes(q.id));

    if (pool.length === 0) {
        user.answeredQuestions = [];
        db.saveUser(user);
        pool = questions;
    }

    const question = pool[Math.floor(Math.random() * pool.length)];

    const message = await ctx.reply(
        `🧠 SAVOL (${question.category ? question.category.toUpperCase() : "UMUMIY"})

${question.question}

⏳ Sizda 10 soniya vaqt bor!`,
        {
            reply_markup: {
                inline_keyboard: question.options.map((option, index) => [
                    {
                        text: option,
                        callback_data: `answer_${question.id}_${index}`
                    }
                ])
            }
        }
    );

    const key = `${ctx.chat.id}_${message.message_id}`;

    const timeout = setTimeout(async () => {
        const state = activeQuestions.get(key);
        if (!state || state.answered) return;

        state.answered = true;

        // Vaqt tugagan savolni ham "ko'rilgan" deb belgilaymiz,
        // aks holda u tez orada qayta chiqib qolaveradi.
        const freshUser = db.findUser(user.telegramId);
        if (freshUser && !freshUser.answeredQuestions.includes(question.id)) {
            freshUser.answeredQuestions.push(question.id);
            db.saveUser(freshUser);
        }

        try {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                message.message_id,
                undefined,
                `⏰ Vaqt tugadi!

❌ Javob berish uchun 10 soniya berilgan edi.
✅ To'g'ri javob: ${question.options[question.correctAnswer]}`
            );
        } catch (error) { /* xabar allaqachon o'zgargan bo'lishi mumkin */ }

        activeQuestions.delete(key);
    }, 10000);

    activeQuestions.set(key, { questionId: question.id, answered: false, timeout });
}


// ==========================
// JAVOBNI TEKSHIRISH
// ==========================

bot.action(/^answer_(\d+)_(\d+)$/, async (ctx) => {
    const questionId = Number(ctx.match[1]);
    const selectedAnswer = Number(ctx.match[2]);

    const key = `${ctx.chat.id}_${ctx.callbackQuery.message.message_id}`;
    const state = activeQuestions.get(key);

    if (!state || state.answered) {
        return ctx.answerCbQuery("⏰ Vaqt tugagan yoki savol eskirgan.");
    }

    state.answered = true;
    clearTimeout(state.timeout);
    activeQuestions.delete(key);

    const question = questions.find((q) => q.id === questionId);
    const user = db.findUser(ctx.from.id);

    if (!question || !user) {
        return ctx.answerCbQuery("Xatolik yuz berdi.");
    }

    if (!user.answeredQuestions.includes(questionId)) {
        user.answeredQuestions.push(questionId);
    }

    if (selectedAnswer === question.correctAnswer) {
        user.coins += 3;
        db.saveUser(user);

        await ctx.answerCbQuery("To'g'ri javob! +3 coin 🎉");
        await ctx.editMessageText(
            `🎉 TO'G'RI JAVOB!

🪙 Sizga +3 COIN berildi!
💰 Jami coinlaringiz: ${user.coins}`
        );
    } else {
        db.saveUser(user);

        await ctx.answerCbQuery("Noto'g'ri javob ❌");
        await ctx.editMessageText(
            `❌ NOTO'G'RI JAVOB!

To'g'ri javob:
✅ ${question.options[question.correctAnswer]}`
        );
    }

    await ctx.reply("Davom etamizmi?", {
        reply_markup: {
            inline_keyboard: [[{ text: "➡️ Keyingi savol", callback_data: "next_question" }]]
        }
    });
});

bot.action("next_question", async (ctx) => {
    await ctx.answerCbQuery();
    const user = db.findUser(ctx.from.id);
    if (!user) return;
    if (!(await requireSubscription(ctx, user))) return;
    if (!(await requireStudyDay(ctx, user))) return;
    await sendRandomQuestion(ctx, user);
});


// ==========================
// DARSLIKLAR
// ==========================

bot.hears("📚 Darsliklar", async (ctx) => {
    const user = db.findUser(ctx.from.id);
    if (!user) return ctx.reply("Avval /start bosing.");
    if (!(await requireSubscription(ctx, user))) return;
    if (!(await requireStudyDay(ctx, user))) return;

    await ctx.reply(
        `📚 DASTURLASH DARSLIKLARI

Kerakli kursni tanlang:`,
        {
            reply_markup: {
                inline_keyboard: lessonCategories.map((c) => [
                    { text: c.label, callback_data: `lesson_${c.key}_0` }
                ])
            }
        }
    );
});

bot.action(/^lesson_([a-z]+)_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const user = db.findUser(ctx.from.id);
    if (!user) return;
    if (!(await requireSubscription(ctx, user))) return;
    if (!(await requireStudyDay(ctx, user))) return;

    const categoryKey = ctx.match[1];
    const index = Number(ctx.match[2]);

    const unlocked = getUnlockedLessonCount(user, categoryKey);
    if (index >= unlocked) {
        await ctx.reply(
            `🔒 Bu dars hali ochilmagan!

Kuniga faqat 1 ta yangi dars ochiladi. Hozircha sizga ${unlocked} ta dars ochiq. Keyingi dars kuningizda yangisi ochiladi.`
        );
        return;
    }

    await sendLesson(ctx, categoryKey, index);
});


// ==========================
// OBUNA BO'LISH
// ==========================

bot.hears("💎 Obuna bo'lish", async (ctx) => {
    await ctx.reply(
        `💎 OBUNA TARIFLARI

📅 ${plans.threeDay.label} — ${plans.threeDay.price.toLocaleString()} so'm
📅 ${plans.week.label} — ${plans.week.price.toLocaleString()} so'm
📅 ${plans.month.label} — ${plans.month.price.toLocaleString()} so'm
📅 ${plans.threeMonth.label} — ${plans.threeMonth.price.toLocaleString()} so'm

Obuna orqali:
✅ Barcha quizlar
✅ HTML / CSS / JavaScript darslari
✅ Coin tizimi

Rejani tanlang:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `📅 ${plans.threeDay.label} - ${plans.threeDay.price.toLocaleString()} so'm`, callback_data: "plan_threeDay" }],
                    [{ text: `📅 ${plans.week.label} - ${plans.week.price.toLocaleString()} so'm`, callback_data: "plan_week" }],
                    [{ text: `📅 ${plans.month.label} - ${plans.month.price.toLocaleString()} so'm`, callback_data: "plan_month" }],
                    [{ text: `📅 ${plans.threeMonth.label} - ${plans.threeMonth.price.toLocaleString()} so'm`, callback_data: "plan_threeMonth" }]
                ]
            }
        }
    );
});

bot.action(/^plan_(threeDay|week|month|threeMonth)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const planType = ctx.match[1];
    const plan = plans[planType];

    pendingPayment.set(ctx.from.id, planType);

    await ctx.reply(
        `💳 TO'LOV

${plan.label}: ${plan.price.toLocaleString()} so'm

Quyidagi kartaga to'lovni amalga oshiring:

💳 ${plans.card.number}
👤 ${plans.card.owner}

To'lovni amalga oshirgach, chek yoki skrinshotni RASM sifatida shu chatga yuboring. Admin tekshirib, obunangizni faollashtiradi.`
    );
});

bot.on("photo", async (ctx) => {
    const planType = pendingPayment.get(ctx.from.id);
    if (!planType) return;

    const plan = plans[planType];
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    const payment = db.createPayment({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username || "username yo'q",
        planType,
        amount: plan.price,
        screenshotFileId: fileId
    });

    pendingPayment.delete(ctx.from.id);

    await ctx.reply("✅ To'lov cheki qabul qilindi! Admin tasdiqlashini kuting.");

    if (ADMIN_ID) {
        await ctx.telegram.sendPhoto(ADMIN_ID, fileId, {
            caption: `💳 YANGI TO'LOV SO'ROVI

👤 ${ctx.from.first_name} (@${ctx.from.username || "username yo'q"})
🆔 ID: ${ctx.from.id}
📅 Reja: ${plan.label}
💰 Summa: ${plan.price.toLocaleString()} so'm`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Tasdiqlash", callback_data: `approve_${payment.id}` },
                        { text: "❌ Rad etish", callback_data: `reject_${payment.id}` }
                    ]
                ]
            }
        });
    }
});


// ==========================
// ADMIN: TO'LOVNI TASDIQLASH / RAD ETISH
// ==========================

bot.action(/^approve_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery("Ruxsat yo'q.");
    }

    const paymentId = ctx.match[1];
    const payment = db.findPayment(paymentId);

    if (!payment || payment.status !== "pending") {
        return ctx.answerCbQuery("Bu so'rov allaqachon ko'rib chiqilgan.");
    }

    let user = db.findUser(payment.telegramId);
    if (!user) {
        user = db.createUser({
            telegramId: payment.telegramId,
            firstName: payment.firstName,
            username: payment.username
        });
    }

    // ===== JARIMA (blokdan chiqish) =====
    if (payment.planType === "fine") {
        user.blocked = false;
        user.warnings = 0;
        db.saveUser(user);

        payment.status = "approved";
        db.savePayment(payment);

        await ctx.answerCbQuery("Blokdan chiqarildi ✅");
        await ctx.editMessageCaption(
            `✅ JARIMA QABUL QILINDI — BLOKDAN CHIQARILDI

👤 ${payment.firstName} (@${payment.username})`
        );

        try {
            await ctx.telegram.sendMessage(
                payment.telegramId,
                `✅ Jarima qabul qilindi! Siz botdan qaytadan to'liq foydalanishingiz mumkin.`
            );
        } catch (error) {
            console.log("Foydalanuvchiga xabar yuborib bo'lmadi:", error.message);
        }
        return;
    }

    // ===== OBUNA TO'LOVI =====
    const plan = plans[payment.planType];

    const now = new Date();
    const currentExpiry = isSubscriptionActive(user) ? new Date(user.subscription.expiresAt) : now;
    const newExpiry = new Date(currentExpiry.getTime() + plan.days * 24 * 60 * 60 * 1000);

    const isFirstSubscription = !user.subscriptionStartDate;

    user.subscription = {
        active: true,
        type: payment.planType,
        expiresAt: newExpiry.toISOString()
    };
    if (isFirstSubscription) {
        user.subscriptionStartDate = now.toISOString();
    }
    db.saveUser(user);

    payment.status = "approved";
    db.savePayment(payment);

    await ctx.answerCbQuery("Tasdiqlandi ✅");
    await ctx.editMessageCaption(
        `✅ TASDIQLANDI

👤 ${payment.firstName} (@${payment.username})
📅 Reja: ${plan.label}
📆 Amal qilish muddati: ${newExpiry.toLocaleDateString("uz-UZ")} gacha`
    );

    try {
        await ctx.telegram.sendMessage(
            payment.telegramId,
            `🎉 Obunangiz faollashtirildi!

📅 Reja: ${plan.label}
📆 Amal qilish muddati: ${newExpiry.toLocaleDateString("uz-UZ")} gacha

Botdan to'liq foydalanishingiz mumkin!`
        );

        if (!user.studyDays) {
            await ctx.telegram.sendMessage(
                payment.telegramId,
                `📅 Endi dars kunlaringizni tanlang — darsliklar va o'yinlar faqat shu kunlarda ochiq bo'ladi:`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: STUDY_DAY_GROUPS.mon_wed_fri.label, callback_data: "studyday_mon_wed_fri" }],
                            [{ text: STUDY_DAY_GROUPS.tue_thu_sat.label, callback_data: "studyday_tue_thu_sat" }]
                        ]
                    }
                }
            );
        }
    } catch (error) {
        console.log("Foydalanuvchiga xabar yuborib bo'lmadi:", error.message);
    }
});

bot.action(/^studyday_(mon_wed_fri|tue_thu_sat)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const user = db.findUser(ctx.from.id);
    if (!user) return;

    user.studyDays = ctx.match[1];
    if (!user.subscriptionStartDate) {
        user.subscriptionStartDate = new Date().toISOString();
    }
    db.saveUser(user);

    await ctx.editMessageText(
        `✅ Dars kunlaringiz saqlandi: ${STUDY_DAY_GROUPS[user.studyDays].label}

Endi shu kunlarda darsliklar va o'yinlardan foydalanishingiz mumkin!`
    );
});

bot.action(/^reject_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery("Ruxsat yo'q.");
    }

    const paymentId = ctx.match[1];
    const payment = db.findPayment(paymentId);

    if (!payment || payment.status !== "pending") {
        return ctx.answerCbQuery("Bu so'rov allaqachon ko'rib chiqilgan.");
    }

    payment.status = "rejected";
    db.savePayment(payment);

    await ctx.answerCbQuery("Rad etildi ❌");
    await ctx.editMessageCaption(
        `❌ RAD ETILDI

👤 ${payment.firstName} (@${payment.username})`
    );

    try {
        await ctx.telegram.sendMessage(
            payment.telegramId,
            `❌ Kechirasiz, to'lovingiz tasdiqlanmadi.

Iltimos, to'g'ri chek/skrinshot yuborganingizga ishonch hosil qiling yoki admin bilan bog'laning: @${plans.adminUsername}`
        );
    } catch (error) {
        console.log("Foydalanuvchiga xabar yuborib bo'lmadi:", error.message);
    }
});


// Admin komandalarida foydalanuvchini topish: avval qisqa bot ID
// (masalan "5") sifatida, topilmasa uzun Telegram ID sifatida qidiradi.
function resolveTargetUser(idArg) {
    const num = Number(idArg);
    if (!num) return null;
    return db.findUserByBotId(num) || db.findUser(num);
}

bot.command("removecoins", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const parts = ctx.message.text.split(" ");
    const amount = Number(parts[2]);

    if (!parts[1] || !amount || amount <= 0) {
        return ctx.reply("Foydalanish: /removecoins <ID> <miqdor>");
    }

    const user = resolveTargetUser(parts[1]);
    if (!user) return ctx.reply("Bunday foydalanuvchi topilmadi.");

    if (user.coins < amount) {
        return ctx.reply(`⚠️ ${user.firstName}da faqat ${user.coins} coin bor, ${amount} ta yechib bo'lmaydi.`);
    }

    user.coins -= amount;
    db.saveUser(user);

    await ctx.reply(`✅ ${user.firstName}dan ${amount} coin yechildi. Qolgan coin: ${user.coins}`);

    try {
        await ctx.telegram.sendMessage(
            user.telegramId,
            `🎁 Sovg'angiz uchun ${amount} coin hisobingizdan yechildi.
💰 Qolgan coinlaringiz: ${user.coins}`
        );
    } catch (error) { /* xabar yuborib bo'lmadi */ }
});


// ==========================
// ADMIN: OGOHLANTIRISH VA BLOKLASH
// ==========================
// Eslatma: bot skrinshot/yuklab olishni o'zi aniqlay olmaydi (Telegram
// buni hech qanday botga bildirmaydi). Shuning uchun bu komandalar
// ADMIN tomonidan qo'lda ishlatiladi — masalan boshqa yo'l bilan
// (odamlar xabar berishi va h.k.) qoidabuzarlik aniqlansa.

bot.command("warn", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const idArg = ctx.message.text.split(" ")[1];
    if (!idArg) return ctx.reply("Foydalanish: /warn <ID>");

    const user = resolveTargetUser(idArg);
    if (!user) return ctx.reply("Bunday foydalanuvchi topilmadi.");

    user.warnings = (user.warnings || 0) + 1;

    if (user.warnings >= 3) {
        user.blocked = true;
        db.saveUser(user);

        await ctx.reply(`🚫 ${user.firstName} 3 marta ogohlantirilgani uchun avtomatik bloklandi.`);

        try {
            await ctx.telegram.sendMessage(
                user.telegramId,
                `🚫 Siz qoidabuzarlik uchun 3-marta ogohlantirilib, botdan bloklandingiz.

Qayta ulanish uchun ${plans.fine.price.toLocaleString()} so'm jarima to'lashingiz kerak. Admin bilan bog'laning: @${plans.adminUsername}`
            );
        } catch (error) { /* xabar yuborib bo'lmadi */ }
        return;
    }

    db.saveUser(user);
    await ctx.reply(`⚠️ ${user.firstName} ga ${user.warnings}-ogohlantirish yuborildi.`);

    try {
        await ctx.telegram.sendMessage(
            user.telegramId,
            `⚠️ OGOHLANTIRISH (${user.warnings}/3)

Botdan foydalanish qoidalarini buzganingiz uchun ogohlantirilyapsiz (masalan darslik kontentini tarqatish). 3-ogohlantirishdan keyin avtomatik bloklanasiz.`
        );
    } catch (error) { /* xabar yuborib bo'lmadi */ }
});

bot.command("block", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const idArg = ctx.message.text.split(" ")[1];
    if (!idArg) return ctx.reply("Foydalanish: /block <ID>");

    const user = resolveTargetUser(idArg);
    if (!user) return ctx.reply("Bunday foydalanuvchi topilmadi.");

    user.blocked = true;
    db.saveUser(user);

    await ctx.reply(`🚫 ${user.firstName} (ID: ${user.userId}) bloklandi.`);

    try {
        await ctx.telegram.sendMessage(
            user.telegramId,
            `🚫 Siz botdan bloklandingiz.

Qayta ulanish uchun ${plans.fine.price.toLocaleString()} so'm jarima to'lashingiz kerak. Admin bilan bog'laning: @${plans.adminUsername}`
        );
    } catch (error) { /* xabar yuborib bo'lmadi */ }
});

bot.command("unblock", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const idArg = ctx.message.text.split(" ")[1];
    if (!idArg) return ctx.reply("Foydalanish: /unblock <ID>");

    const user = resolveTargetUser(idArg);
    if (!user) return ctx.reply("Bunday foydalanuvchi topilmadi.");

    user.blocked = false;
    user.warnings = 0;
    db.saveUser(user);

    await ctx.reply(`✅ ${user.firstName} (ID: ${user.userId}) blokdan chiqarildi.`);

    try {
        await ctx.telegram.sendMessage(user.telegramId, `✅ Siz blokdan chiqarildingiz, botdan foydalanishingiz mumkin.`);
    } catch (error) { /* xabar yuborib bo'lmadi */ }
});


// ==========================
// BOTNI ISHGA TUSHIRISH
// ==========================

bot.launch();
console.log("🤖 Bot ishga tushdi!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
