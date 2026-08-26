// ODDIY MAHALLIY (LOCAL) MA'LUMOTLAR BAZASI
// ============================================
// Internetga yoki MongoDB Atlas'ga umuman bog'liq emas.
// Barcha ma'lumotlar shu kompyuterdagi "database" papkasida
// oddiy JSON fayllar sifatida saqlanadi.
//
// DIQQAT: agar botni keyinchalik Railway/Render kabi bulutli
// serverga joylashtirsangiz va u "ephemeral" (vaqtinchalik) disk
// ishlatsa, har safar qayta deploy qilinganda bu fayllar
// tozalanishi mumkin. Agar bu muhim bo'lsa, kelajakda MongoDB
// yoki boshqa doimiy bazaga qaytish kerak bo'ladi. Hozircha,
// kompyuteringizda uzluksiz ishlaydigan bot uchun bu usul
// to'liq yetarli va eng barqaror variant.

const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(__dirname, "..", "database");
const USERS_FILE = path.join(DB_DIR, "users.json");
const PAYMENTS_FILE = path.join(DB_DIR, "payments.json");

function ensureDb() {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
    if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, "[]");
}

function readJson(file) {
    ensureDb();
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (error) {
        return [];
    }
}

function writeJson(file, data) {
    ensureDb();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


// ==========================
// FOYDALANUVCHILAR
// ==========================

function getUsers() {
    return readJson(USERS_FILE);
}

function findUser(telegramId) {
    return getUsers().find((u) => u.telegramId === telegramId) || null;
}

// Botning o'z ichki (qisqa) ID raqami orqali qidirish — admin komandalarida
// uzun Telegram ID o'rniga shu qisqa raqamni ham ishlatish mumkin bo'lsin
// uchun.
function findUserByBotId(userId) {
    return getUsers().find((u) => u.userId === userId) || null;
}

// Har bir yangi foydalanuvchiga ketma-ket (1, 2, 3...) qisqa ID beradi
function getNextUserId() {
    const users = getUsers();
    let max = 0;
    for (const u of users) {
        if (typeof u.userId === "number" && u.userId > max) max = u.userId;
    }
    return max + 1;
}

function createUser(data) {
    const users = getUsers();

    const user = {
        userId: getNextUserId(),
        telegramId: data.telegramId,
        firstName: data.firstName || "",
        username: data.username || "username yo'q",
        coins: 0,
        answeredQuestions: [],
        subscription: {
            active: false,
            type: null,
            expiresAt: null
        },
        // Dars kunlari: "mon_wed_fri" | "tue_thu_sat" | null (hali tanlanmagan)
        studyDays: null,
        // Obuna birinchi marta faollashtirilgan sana (kunlik dars ochilishini
        // hisoblash uchun) — ISO satr
        subscriptionStartDate: null,
        // Admin tomonidan berilgan ogohlantirishlar soni (3 tadan keyin avtoblok)
        warnings: 0,
        blocked: false,
        ...data
    };

    users.push(user);
    writeJson(USERS_FILE, users);
    return user;
}

// Foydalanuvchi obyektini to'liq holicha saqlab qo'yadi
// (user.coins += 3 kabi o'zgarishlardan keyin chaqiriladi)
function saveUser(user) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.telegramId === user.telegramId);

    if (idx === -1) {
        users.push(user);
    } else {
        users[idx] = user;
    }

    writeJson(USERS_FILE, users);
    return user;
}


// ==========================
// TO'LOVLAR
// ==========================

function getPayments() {
    return readJson(PAYMENTS_FILE);
}

function createPayment(data) {
    const payments = getPayments();

    const payment = {
        id: `${Date.now()}${Math.floor(Math.random() * 10000)}`,
        status: "pending",
        createdAt: new Date().toISOString(),
        ...data
    };

    payments.push(payment);
    writeJson(PAYMENTS_FILE, payments);
    return payment;
}

function findPayment(id) {
    return getPayments().find((p) => p.id === id) || null;
}

function savePayment(payment) {
    const payments = getPayments();
    const idx = payments.findIndex((p) => p.id === payment.id);

    if (idx === -1) {
        payments.push(payment);
    } else {
        payments[idx] = payment;
    }

    writeJson(PAYMENTS_FILE, payments);
    return payment;
}

module.exports = {
    findUser,
    findUserByBotId,
    getNextUserId,
    getUsers,
    createUser,
    saveUser,
    createPayment,
    findPayment,
    savePayment
};
