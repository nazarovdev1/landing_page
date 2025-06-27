const express = require("express")
const fs = require("fs").promises
const path = require("path")
const { v4: uuidv4 } = require("uuid")
const cors = require("cors")
const axios = require("axios")
const app = express()
const PORT = 3000
const BOT_TOKEN = "7756509835:AAFk6khiwHKLBlsqgc4mIuMZwosEuWMlD_4"
const CHAT_ID = "701571129" 
const DATA_FILE = path.join(__dirname, "data", "contacts.json")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(path.join(__dirname, "public")))
async function readContacts() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    if (error.code === "ENOENT") {
      return []
    }
    throw error
  }
}
async function writeContacts(contacts) {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(contacts, null, 2))
  } catch (error) {
    console.error("Ma'lumotlarni saqlashda xatolik:", error)
    throw error
  }
}

async function sendTelegramNotification(contact) {
  const message = `
<b>Yangi aloqa formasi to'ldirildi!</b> 📬

<b>Ism:</b> ${contact.firstName} ${contact.lastName}
<b>Viloyat:</b> ${contact.province.replace("_", " ")}
<b>Telefon:</b> ${contact.phone}
<b>Izoh:</b>
${contact.comment || "<i>Izoh qoldirilmagan</i>"}
`
  const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

  try {
    await axios.post(telegramApiUrl, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML",
    })
    console.log("Xabar Telegramga muvaffaqiyatli yuborildi!")
  } catch (error) {
    console.error(
      "Telegramga yuborishda xatolik:",
      error.response ? error.response.data : error.message
    )
  }
}

// apilarga

// Kontakt ma'lumotlarini saqlash API
app.post("/api/contacts", async (req, res) => {
  try {
    const { firstName, lastName, province, phone, comment } = req.body

    if (!firstName || !lastName || !province || !phone) {
      return res.status(400).json({
        success: false,
        message: "Barcha majburiy maydonlarni to'ldiring",
      })
    }

    if (phone.length !== 9 || isNaN(phone)) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqami 9 ta raqamdan iborat bo'lishi kerak",
      })
    }

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

    const contacts = await readContacts()
    contacts.unshift(newContact)
    await writeContacts(contacts)

    await sendTelegramNotification(newContact)

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

app.put("/api/contacts/:id/status", async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const contacts = await readContacts()
    const contactIndex = contacts.findIndex((c) => c.id === id)

    if (contactIndex === -1) {
      return res.status(404).json({ success: false, message: "Kontakt topilmadi" })
    }

    contacts[contactIndex].status = status
    contacts[contactIndex].updatedAt = new Date().toISOString()
    await writeContacts(contacts)

    res.json({ success: true, message: "Status yangilandi" })
  } catch (error) {
    console.error("Status yangilashda xatolik:", error)
    res.status(500).json({ success: false, message: "Status yangilashda xatolik" })
  }
})
app.delete("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params

    let contacts = await readContacts()
    const filteredContacts = contacts.filter((c) => c.id !== id)

    if (contacts.length === filteredContacts.length) {
      return res.status(404).json({ success: false, message: "Kontakt topilmadi" })
    }

    await writeContacts(filteredContacts)
    res.json({ success: true, message: "Kontakt o'chirildi" })
  } catch (error) {
    console.error("Kontaktni o'chirishda xatolik:", error)
    res.status(500).json({ success: false, message: "Kontaktni o'chirishda xatolik" })
  }
})

// Admin pagega otiw

app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} da ishlamoqda`)
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`)
})