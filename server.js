const express = require("express")
const fs = require("fs").promises
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const cors = require("cors")

const app = express()
const PORT = 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static("public"))

// JSON fayl yo'li
const DATA_FILE = path.join(__dirname, "data", "contacts.json")

// Ma'lumotlarni o'qish funksiyasi
async function readContacts() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    // Agar fayl mavjud bo'lmasa, bo'sh array qaytarish
    return []
  }
}

// Ma'lumotlarni yozish funksiyasi
async function writeContacts(contacts) {
  try {
    // Data papkasini yaratish (agar mavjud bo'lmasa)
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(contacts, null, 2))
  } catch (error) {
    console.error("Ma'lumotlarni saqlashda xatolik:", error)
    throw error
  }
}

// Kontakt ma'lumotlarini saqlash API
app.post("/api/contacts", async (req, res) => {
  try {
    const { firstName, lastName, province, phone, comment } = req.body

    // Ma'lumotlarni tekshirish
    if (!firstName || !lastName || !province || !phone) {
      return res.status(400).json({
        success: false,
        message: "Barcha majburiy maydonlarni to'ldiring",
      })
    }

    // Telefon raqamini tekshirish
    if (phone.length !== 9 || isNaN(phone)) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqami 9 ta raqamdan iborat bo'lishi kerak",
      })
    }

    // Yangi kontakt yaratish
    const newContact = {
      id: uuidv4(),
      firstName,
      lastName,
      province,
      phone: `+998${phone}`,
      comment: comment || "",
      createdAt: new Date().toISOString(),
      status: "new",
    }

    // Mavjud kontaktlarni o'qish
    const contacts = await readContacts()

    // Yangi kontaktni qo'shish
    contacts.unshift(newContact)

    // Faylga saqlash
    await writeContacts(contacts)

    res.json({
      success: true,
      message: "Ma'lumotlar muvaffaqiyatli saqlandi",
      contactId: newContact.id,
    })
  } catch (error) {
    console.error("Server xatoligi:", error)
    res.status(500).json({
      success: false,
      message: "Server xatoligi yuz berdi",
    })
  }
})

// Barcha kontaktlarni olish API (admin uchun)
app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await readContacts()
    res.json({ success: true, data: contacts })
  } catch (error) {
    console.error("Ma'lumotlarni o'qishda xatolik:", error)
    res.status(500).json({
      success: false,
      message: "Ma'lumotlarni olishda xatolik",
    })
  }
})

// Kontakt statusini yangilash API
app.put("/api/contacts/:id/status", async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const contacts = await readContacts()
    const contactIndex = contacts.findIndex((contact) => contact.id === id)

    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Kontakt topilmadi",
      })
    }

    contacts[contactIndex].status = status
    contacts[contactIndex].updatedAt = new Date().toISOString()

    await writeContacts(contacts)

    res.json({
      success: true,
      message: "Status yangilandi",
    })
  } catch (error) {
    console.error("Status yangilashda xatolik:", error)
    res.status(500).json({
      success: false,
      message: "Status yangilashda xatolik",
    })
  }
})

// Kontaktni o'chirish API
app.delete("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params

    const contacts = await readContacts()
    const filteredContacts = contacts.filter((contact) => contact.id !== id)

    if (contacts.length === filteredContacts.length) {
      return res.status(404).json({
        success: false,
        message: "Kontakt topilmadi",
      })
    }

    await writeContacts(filteredContacts)

    res.json({
      success: true,
      message: "Kontakt o'chirildi",
    })
  } catch (error) {
    console.error("Kontaktni o'chirishda xatolik:", error)
    res.status(500).json({
      success: false,
      message: "Kontaktni o'chirishda xatolik",
    })
  }
})

// Server ishga tushirish
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} da ishlamoqda`)
})
