// Quiz savollari.
// Yangi savol qo'shish uchun pastga xuddi shu formatda yangi obyekt qo'shing.
// "id" har doim UNIKAL bo'lishi kerak (takrorlanmasin).
// "category" ixtiyoriy: "html", "css", "js" yoki "general".
// "correctAnswer" — options massividagi to'g'ri javobning INDEKSI (0 dan boshlanadi).

module.exports = [
    {
        id: 1,
        category: "html",
        question: "HTML nima uchun ishlatiladi?",
        options: [
            "Web sahifa tuzilishi uchun",
            "Faqat rang berish uchun",
            "Database uchun",
            "Operatsion sistema uchun"
        ],
        correctAnswer: 0
    },
    {
        id: 2,
        category: "css",
        question: "CSS nima uchun ishlatiladi?",
        options: [
            "Web sahifani bezash uchun",
            "Server yaratish uchun",
            "Kompyuterni o'chirish uchun",
            "Database yaratish uchun"
        ],
        correctAnswer: 0
    },
    {
        id: 3,
        category: "html",
        question: "Rasmni sahifaga joylashtirish uchun qaysi teg ishlatiladi?",
        options: ["<image>", "<img>", "<pic>", "<src>"],
        correctAnswer: 1
    },
    {
        id: 4,
        category: "html",
        question: "Havola (link) yaratish uchun qaysi teg ishlatiladi?",
        options: ["<link>", "<href>", "<a>", "<url>"],
        correctAnswer: 2
    },
    {
        id: 5,
        category: "css",
        question: "Matn rangini o'zgartirish uchun qaysi CSS xossasi ishlatiladi?",
        options: ["font-color", "text-color", "color", "background"],
        correctAnswer: 2
    },
    {
        id: 6,
        category: "css",
        question: "Elementlar orasidagi bo'sh joyni sozlash uchun qaysi xossa ishlatiladi?",
        options: ["margin", "border", "outline", "shadow"],
        correctAnswer: 0
    },
    {
        id: 7,
        category: "js",
        question: "JavaScript'da o'zgaruvchi e'lon qilish uchun qaysi kalit so'z ishlatilmaydi?",
        options: ["let", "const", "var", "int"],
        correctAnswer: 3
    },
    {
        id: 8,
        category: "js",
        question: "Konsolga xabar chiqarish uchun qaysi buyruq ishlatiladi?",
        options: ["print()", "console.log()", "echo()", "write()"],
        correctAnswer: 1
    },
    {
        id: 9,
        category: "js",
        question: "Massiv (array) elementlari sonini qaysi xossa qaytaradi?",
        options: [".size", ".count", ".length", ".total"],
        correctAnswer: 2
    },
    {
        id: 10,
        category: "general",
        question: "Veb-sahifalarni ko'rish uchun ishlatiladigan dastur qanday ataladi?",
        options: ["Kompilyator", "Brauzer", "Server", "Kod muharriri"],
        correctAnswer: 1
    },
    {
        id: 11,
        category: "general",
        question: "Frontend dasturchi asosan nima bilan shug'ullanadi?",
        options: [
            "Server tomonini yozish",
            "Foydalanuvchi ko'radigan qismni yaratish",
            "Ma'lumotlar bazasini boshqarish",
            "Tarmoq xavfsizligi"
        ],
        correctAnswer: 1
    },
    {
        id: 12,
        category: "css",
        question: "Elementni ekran markaziga joylashtirish uchun ko'p ishlatiladigan CSS usuli qaysi?",
        options: ["float", "flexbox", "table", "list-style"],
        correctAnswer: 1
    }
];
