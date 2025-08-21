# SeaBot - WhatsApp Bot dengan Baileys

Bot WhatsApp yang dibangun menggunakan library Baileys dengan dukungan MongoDB dan sistem command yang modular.

## Fitur Utama

- ✅ Koneksi WhatsApp menggunakan QR Code atau Pairing Code
- ✅ Multi-prefix support (., !, #, /)
- ✅ Database MongoDB untuk penyimpanan user dan session
- ✅ Sistem command yang modular dan mudah diperluas
- ✅ Rate limiting dan cooldown protection
- ✅ Logging sistem yang comprehensive
- ✅ Error handling dan auto-reconnect

## Cara Menjalankan Bot

### 1. Menggunakan QR Code (Default)

```bash
npm install
node index.js
```

Setelah bot berjalan, scan QR code yang muncul di terminal dengan WhatsApp di ponsel Anda.

### 2. Menggunakan Pairing Code

Ada 2 cara untuk menggunakan pairing code:

#### Cara 1: Menggunakan Script Khusus
```bash
node start-with-pairing.js --phone 6285709557572
```

#### Cara 2: Menggunakan Environment Variables
```bash
# Buat file .env (copy dari .env.example)
CONNECTION_MODE=pairing
PAIRING_NUMBER=6285709557572

# Lalu jalankan bot normal
node index.js
```

### Cara Menggunakan Pairing Code di WhatsApp:

1. Buka WhatsApp di ponsel
2. Pergi ke **Settings** > **Linked Devices**
3. Pilih **Link a Device**
4. Pilih **Link with Phone Number Instead**
5. Masukkan pairing code yang muncul di terminal

## Command yang Tersedia

### .ping
Menampilkan informasi status bot, response time, uptime, dan penggunaan memori.

```
Contoh penggunaan:
.ping
!ping
#ping
/ping
```

## Konfigurasi

Semua konfigurasi bot terpusat di file `config/config.js`. Anda dapat mengatur:

- Nomor owner bot
- Multi prefix yang didukung
- Konfigurasi database MongoDB
- Pengaturan koneksi WhatsApp
- Level logging
- Rate limiting

## Struktur Project

```
├── config/
│   └── config.js           # Konfigurasi terpusat
├── src/
│   ├── client/
│   │   └── whatsapp.js     # Client WhatsApp Baileys
│   ├── commands/
│   │   └── ping.js         # Command ping
│   ├── database/
│   │   ├── models/         # Model MongoDB
│   │   └── connection.js   # Koneksi database
│   ├── handlers/
│   │   └── messageHandler.js # Handler pesan masuk
│   └── utils/
│       ├── helpers.js      # Utility functions
│       └── logger.js       # Sistem logging
├── sessions/               # Penyimpanan session WhatsApp
├── index.js               # Entry point utama
├── start-with-pairing.js  # Script untuk pairing mode
└── README.md              # Dokumentasi ini
```

## Environment Variables

Buat file `.env` dari template `.env.example`:

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Logging Configuration
LOG_LEVEL=info

# WhatsApp Configuration
CONNECTION_MODE=qr  # atau 'pairing'
PAIRING_NUMBER=     # nomor untuk pairing mode

# Bot Configuration
BOT_NAME=SeaBot
BOT_VERSION=1.0.0
OWNER_NUMBER=6285709557572
```

## Menambah Command Baru

1. Buat file command baru di `src/commands/`
2. Daftarkan command di `src/handlers/messageHandler.js`

Contoh command baru:

```javascript
// src/commands/hello.js
module.exports = {
    name: 'hello',
    description: 'Say hello to the user',
    usage: '.hello',
    category: 'general',
    
    async execute(context) {
        const { reply, sender } = context;
        await reply(`Hello! 👋`);
    }
};
```

## Troubleshooting

### QR Code tidak muncul
- Pastikan terminal support QR code display
- Coba restart bot jika QR expired

### Pairing Code tidak bekerja
- Pastikan nomor telepon benar (tanpa + dan spasi)
- Pastikan WhatsApp sudah versi terbaru
- Coba restart bot jika gagal

### Koneksi MongoDB gagal
- Periksa connection string di config
- Pastikan jaringan internet stabil
- Periksa kredensial database

### Bot tidak merespon command
- Pastikan menggunakan prefix yang benar (., !, #, /)
- Periksa logs untuk error messages
- Pastikan user tidak terkena rate limit

## Logs

Bot menyimpan logs di folder `logs/seabot.log` dengan informasi:
- Koneksi WhatsApp
- Eksekusi command
- Error dan warning
- Database operations
- Performance metrics

## Support

Jika mengalami masalah, periksa:
1. Logs di terminal dan file log
2. Koneksi internet
3. Versi Node.js (minimal v16)
4. Konfigurasi di `config/config.js`