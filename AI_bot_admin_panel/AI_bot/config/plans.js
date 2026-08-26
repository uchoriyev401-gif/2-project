// Obuna tariflari, jarima va to'lov ma'lumotlari.
// Narxlarni yoki karta raqamini o'zgartirish uchun shu faylni tahrirlang
// (yoki .env faylida CARD_NUMBER / CARD_OWNER qiymatlarini o'zgartiring).

module.exports = {
    threeDay: {
        label: "3 kunlik",
        price: 5000,
        days: 3
    },
    week: {
        label: "1 haftalik",
        price: 10000,
        days: 7
    },
    month: {
        label: "1 oylik",
        price: 30000,
        days: 30
    },
    threeMonth: {
        label: "3 oylik",
        price: 100000,
        days: 90
    },

    // Blokdan chiqish jarimasi
    fine: {
        label: "Blokdan chiqish jarimasi",
        price: 7000
    },

    card: {
        number: process.env.CARD_NUMBER || "0000 0000 0000 0000",
        owner: process.env.CARD_OWNER || "F.I.Sh."
    },
    adminUsername: process.env.ADMIN_USERNAME || "admin"
};
