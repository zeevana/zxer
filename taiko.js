// ===============================
//         KODE MILIK ROMD
// ===============================

const { ethers } = require('ethers');
const readlineSync = require('readline-sync');
const fs = require('fs');

// Menampilkan tampilan awal
function displayWelcomeMessage() {
  console.log("==================================================");
  console.log("                  A I   D R O P                   ");
  console.log("==================================================");
  console.log("Join  :  https://t.me/ai_drop100");
  console.log("Github:  https://github.com/zeevana");
  console.log("==================================================");
  console.log(); 

function logActivity(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('activity.log', `${timestamp} - ${message}\n`); // Perbaikan di sini
}

const provider = new ethers.JsonRpcProvider(process.env.TAIKO_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const WETH_ADDRESS = "0xa51894664a773981c6c112c43ce576f315d5b1b6";
const wethContract = new ethers.Contract(WETH_ADDRESS, [
  "function deposit() public payable",
  "function withdraw(uint256 amount) public",
], wallet);

// Konfigurasi jumlah min dan max untuk swap serta gas price (Gwei)
const MIN_AMOUNT = parseFloat(process.env.MIN_AMOUNT || "0.0003");
const MAX_AMOUNT = parseFloat(process.env.MAX_AMOUNT || "0.001");
const GAS_PRICE_GWEI = parseFloat(process.env.GAS_PRICE_GWEI || "0.18");

if (MIN_AMOUNT <= 0 || MAX_AMOUNT <= 0 || MIN_AMOUNT > MAX_AMOUNT) {
  throw new Error('Nilai MIN_AMOUNT atau MAX_AMOUNT tidak valid.');
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomAmount(min, max) {
  return (Math.random() * (max - min) + min).toFixed(4);
}

async function wrapETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");
  try {
    const tx = await wethContract.deposit({
      value: ethers.parseEther(amount),
      gasPrice
    });
    console.log(`Wrapping ETH: ${amount} ETH ke WETH`); // Perbaikan di sini
    await tx.wait();
    console.log('Wrap berhasil');
    logActivity(`Wrap berhasil: ${amount} ETH`); // Perbaikan di sini
    return true;
  } catch (error) {
    console.error('Error saat wrap ETH:', error);
    logActivity(`Error saat wrap ETH: ${error.message}`); // Perbaikan di sini
    return false;
  }
}


async function unwrapWETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");
  try {
    const txAmount = ethers.parseEther(amount);
    console.log(`Attempting to unwrap ${amount} WETH...`); // Perbaikan di sini
    const tx = await wethContract.withdraw(txAmount, { gasPrice });
    console.log(`Unwrapping WETH: ${amount} WETH ke ETH`); // Perbaikan di sini
    await tx.wait();
    console.log('Unwrap berhasil');
    logActivity(`Unwrap berhasil: ${amount} WETH`); // Perbaikan di sini
    return true;
  } catch (error) {
    console.error('Error saat unwrap WETH:', error);
    logActivity(`Error saat unwrap WETH: ${error.message}`); // Perbaikan di sini
    return false;
  }
}

// Fungsi utama untuk eksekusi auto-swap
async function autoSwap(repeatCount, minDelay, maxDelay) {
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < repeatCount; i++) {
    const amount = getRandomAmount(MIN_AMOUNT, MAX_AMOUNT);
    let success;

    if (Math.random() < 0.5) {
      success = await wrapETH(amount);
    } else {
      success = await unwrapWETH(amount);
    }

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }

    const delay = getRandomDelay(minDelay, maxDelay);
    console.log(`Menunggu selama ${delay / 1000} detik sebelum transaksi berikutnya`); // Perbaikan di sini
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  console.log();
  console.log('==================================================')
  console.log(`\nJumlah transaksi berhasil : ${successCount}`);
  console.log(`Jumlah transaksi gagal      : ${failureCount}`);
  console.log('==================================================')
  console.log();
}

// Menambahkan otentikasi sebelum memulai
const password = readlineSync.question('Masukkan password untuk melanjutkan: ', {
  hideEchoBack: true // Sembunyikan input saat mengetik
});

if (password !== process.env.AUTH_PASSWORD) {
  console.log('Password salah! Akses ditolak.');
  return;
}

displayWelcomeMessage();

const count = readlineSync.questionInt('Masukkan jumlah transaksi (contoh: 40): ', {
  limit: input => input > 0, // Validasi input harus positif
  limitMessage: 'Jumlah transaksi tidak valid!'
});

const minDelay = 10000; 
const maxDelay = 150000; 

autoSwap(count, minDelay, maxDelay)
  .then(() => {
    console.log("Auto-swap selesai");
  })
  .catch(error => {
    console.error("Error:", error);
  });
