// ===============================
//         KODE MILIK ROMD
// ===============================


// Import library dan konfigurasi
const { ethers } = require('ethers');
const readlineSync = require('readline-sync'); // Menggunakan readline-sync
require('dotenv').config();
const fs = require('fs');

// Menampilkan tampilan awal
function displayWelcomeMessage() {
  console.log("==================================================");
  console.log("                  O P   S W A P                   ");
  console.log("==================================================");
  console.log("Join:    https://t.me/ai_drop100");
  console.log("Github:  https://github.com/zeevana");
  console.log("==================================================");
  console.log(); // Baris kosong untuk pemisah
}

// Fungsi untuk mencatat log
function logActivity(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('activity.log', `${timestamp} - [romd] ${message}\n`); 
}

// Konfigurasi RPC Optimism dan Wallet
const provider = new ethers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Kontrak OP
const OP_ADDRESS = "0x4200000000000000000000000000000000000042"; // Ganti dengan alamat kontrak OP sebenarnya
const opContract = new ethers.Contract(OP_ADDRESS, [
  "function transfer(address to, uint256 amount) public returns (bool)"
], wallet);

// Konfigurasi jumlah min dan max untuk swap serta gas price (Gwei)
const MIN_AMOUNT = parseFloat(process.env.MIN_AMOUNT || "0.00005");
const MAX_AMOUNT = parseFloat(process.env.MAX_AMOUNT || "0.00021");
const GAS_PRICE_GWEI = parseFloat(process.env.GAS_PRICE_GWEI || "0.13");

// Validasi nilai konfigurasi
if (MIN_AMOUNT <= 0 || MAX_AMOUNT <= 0 || MIN_AMOUNT > MAX_AMOUNT) {
  throw new Error('Nilai MIN_AMOUNT atau MAX_AMOUNT tidak valid.');
}

// Fungsi delay acak
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Fungsi jumlah acak untuk swap
function getRandomAmount(min, max) {
  return (Math.random() * (max - min) + min).toFixed(4);
}

// Fungsi swap OP ke ETH
async function swapOPToETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");
  try {
    const txAmount = ethers.parseEther(amount);
    const tx = await opContract.transfer("0x0000000000000000000000000000000000000000", txAmount, { gasPrice });
    console.log(`Status     : Swapping ${amount} OP ke ETH`);
    console.log(`TxHash     : ${tx.hash}`);

    await tx.wait();
    console.log('Status Tx  : Swap Berhasil');
    logActivity(`Swap berhasil: ${amount} OP, TxHash: ${tx.hash}`);
    return true;
  } catch (error) {
    const errorMessage = error.code || error.message.split("(")[0];
    console.error(`Error swap: ${errorMessage}`);
    logActivity(`Error swap: ${errorMessage}`);
    return false;
  }
}

// Fungsi utama untuk eksekusi auto-swap
async function autoSwap(repeatCount, minDelay, maxDelay) {
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < repeatCount; i++) {
    const amount = getRandomAmount(MIN_AMOUNT, MAX_AMOUNT);
    const success = await swapOPToETH(amount);

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }

    const delay = getRandomDelay(minDelay, maxDelay);
    console.log(`Delay      : Menunggu ${delay / 1000} detik`);
    console.log();
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.log();
  console.log('==================================================');
  console.log(`\nJumlah transaksi berhasil : ${successCount}`);
  console.log(`Jumlah transaksi gagal    : ${failureCount}`);
  console.log('==================================================');
  console.log();
}

// Menambahkan otentikasi sebelum memulai
const password = readlineSync.question('Masukkan password untuk melanjutkan: ', {
  hideEchoBack: true
});

if (password !== process.env.AUTH_PASSWORD) {
  console.log('Password salah! Akses ditolak.');
  return;
}

displayWelcomeMessage();

const count = readlineSync.questionInt('Masukkan jumlah transaksi : ', {
  limit: input => input > 0,
  limitMessage: 'Jumlah transaksi tidak valid!'
});

const minDelay = 1000; // Delay minimum dalam ms
const maxDelay = 15000; // Delay maksimum dalam ms

autoSwap(count, minDelay, maxDelay)
  .then(() => {
    console.log("Auto-swap selesai");
  })
  .catch(error => {
    console.error("Error:", error);
  });
