const { ethers } = require('ethers');
const readlineSync = require('readline-sync');
require('dotenv').config();
const fs = require('fs');

// Menampilkan tampilan awal
function displayWelcomeMessage() {
  console.log("==================================================");
  console.log("                  A I   D R O P                   ");
  console.log("==================================================");
  console.log("Join:    https://t.me/ai_drop100");
  console.log("Github:  https://github.com/zeevana");
  console.log("==================================================");
  console.log();
}

// Fungsi untuk mencatat log
function logActivity(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('activity.log', `${timestamp} - [romd] ${message}\n`);
}

// Konfigurasi RPC Taiko dan Wallet
const provider = new ethers.JsonRpcProvider(process.env.TAIKO_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Kontrak WETH Taiko
const WETH_ADDRESS = "0xa51894664a773981c6c112c43ce576f315d5b1b6";
const wethContract = new ethers.Contract(WETH_ADDRESS, [
  "function deposit() public payable",
  "function withdraw(uint256 amount) public",
  "function balanceOf(address account) external view returns (uint256)",
], wallet);

// Konfigurasi jumlah min dan max untuk swap serta gas price (Gwei)
const MIN_AMOUNT = parseFloat(process.env.MIN_AMOUNT || "0.0005");
const MAX_AMOUNT = parseFloat(process.env.MAX_AMOUNT || "0.0021");
const GAS_PRICE_GWEI = parseFloat(process.env.GAS_PRICE_GWEI || "0.16");
const MIN_ETH_BALANCE = "0.00012";

// Validasi nilai konfigurasi
if (MIN_AMOUNT <= 0 || MAX_AMOUNT <= 0 || MIN_AMOUNT > MAX_AMOUNT) {
  throw new Error('Nilai MIN_AMOUNT atau MAX_AMOUNT tidak valid.');
}

// Fungsi untuk mengecek saldo ETH
async function checkETHBalance() {
  try {
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);
    return {
      balance: balanceInEth,
      sufficientBalance: parseFloat(balanceInEth) >= parseFloat(MIN_ETH_BALANCE)
    };
  } catch (error) {
    console.error('Error mengecek saldo ETH:', error.message);
    return { balance: '0', sufficientBalance: false };
  }
}

// Fungsi untuk mengecek saldo WETH
async function checkWETHBalance() {
  try {
    const balance = await wethContract.balanceOf(wallet.address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error mengecek saldo WETH:', error.message);
    return '0';
  }
}

// Fungsi untuk melakukan auto-unwrap ketika saldo ETH rendah
async function performAutoUnwrap() {
  console.log("\n=== Memulai Auto-Unwrap ===");

  // Cek saldo WETH
  const wethBalance = await checkWETHBalance();
  if (parseFloat(wethBalance) <= 0) {
    console.log("Tidak ada WETH yang tersedia untuk di-unwrap");
    return false;
  }

  // Cek saldo ETH
  const { balance } = await checkETHBalance();
  const estimatedGasCost = parseFloat(ethers.formatEther(
    ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei")
  )) * 21000;

  // Hitung jumlah WETH yang perlu di-unwrap
  const targetBalance = parseFloat(MIN_ETH_BALANCE) + estimatedGasCost;
  const currentShortfall = targetBalance - parseFloat(balance);
  const unwrapAmount = Math.min(parseFloat(wethBalance), currentShortfall + 0.01); // Tambah 0.01 ETH sebagai buffer

  if (unwrapAmount <= 0) {
    console.log("Tidak perlu melakukan unwrap");
    return false;
  }

  console.log(`Melakukan unwrap ${unwrapAmount.toFixed(4)} WETH untuk memenuhi saldo minimum`);

  try {
    const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");
    const tx = await wethContract.withdraw(
      ethers.parseEther(unwrapAmount.toFixed(4)),
      { gasPrice }
    );

    console.log(`Status     : Auto-unwrapping ${unwrapAmount.toFixed(4)} WETH ke ETH`);
    console.log(`TxHash     : ${tx.hash}`);

    await tx.wait();
    console.log('Status Tx  : Auto-unwrap Berhasil');
    logActivity(`Auto-unwrap berhasil: ${unwrapAmount.toFixed(4)} WETH, TxHash: ${tx.hash}`);
    return true;
  } catch (error) {
    const errorMessage = error.code || error.message.split("(")[0];
    console.error(`Error auto-unwrap: ${errorMessage}`);
    logActivity(`Error auto-unwrap: ${errorMessage}`);
    return false;
  }
}

// Fungsi delay acak
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Fungsi jumlah acak untuk swap
function getRandomAmount(min, max) {
  return (Math.random() * (max - min) + min).toFixed(4);
}

// Fungsi wrap ETH ke WETH
async function wrapETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");

  // Cek saldo ETH sebelum wrap
  const { balance, sufficientBalance } = await checkETHBalance();
  const estimatedGasCost = parseFloat(ethers.formatEther(gasPrice)) * 21000;
  const totalNeeded = parseFloat(amount) + estimatedGasCost;

  if (!sufficientBalance) {
    console.log(`Saldo ETH (${balance} ETH) kurang dari minimum yang dibutuhkan (${MIN_ETH_BALANCE} ETH)`);
    return false;
  }

  if (parseFloat(balance) - totalNeeded < parseFloat(MIN_ETH_BALANCE)) {
    console.log(`Transaksi dibatalkan: Saldo setelah wrap akan kurang dari ${MIN_ETH_BALANCE} ETH`);
    return false;
  }

  try {
    const tx = await wethContract.deposit({
      value: ethers.parseEther(amount),
      gasPrice
    });
    console.log(`Status     : Wrapping ${amount} ETH ke WETH`);
    console.log(`TxHash     : ${tx.hash}`);

    await tx.wait();
    console.log('Status Tx  : Wrap Berhasil');
    logActivity(`Wrap berhasil: ${amount} ETH, TxHash: ${tx.hash}`);
    return true;
  } catch (error) {
    const errorMessage = error.code || error.message.split("(")[0];
    console.error(`Error wrap: ${errorMessage}`);
    logActivity(`Error wrap: ${errorMessage}`);
    return false;
  }
}

// Fungsi unwrap WETH ke ETH
async function unwrapWETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");

  // Cek saldo ETH untuk biaya gas
  const { balance } = await checkETHBalance();
  const estimatedGasCost = parseFloat(ethers.formatEther(gasPrice)) * 21000;

  if (parseFloat(balance) < estimatedGasCost) {
    console.log(`Saldo ETH (${balance} ETH) tidak cukup untuk biaya gas`);
    return false;
  }

  // Cek saldo WETH
  const wethBalance = await checkWETHBalance();
  if (parseFloat(wethBalance) < parseFloat(amount)) {
    console.log(`Saldo WETH (${wethBalance} WETH) tidak cukup untuk unwrap ${amount} WETH`);
    return false;
  }

  try {
    const txAmount = ethers.parseEther(amount);
    const tx = await wethContract.withdraw(txAmount, { gasPrice });
    console.log(`Status     : Unwrapping ${amount} WETH ke ETH`);
    console.log(`TxHash     : ${tx.hash}`);

    await tx.wait();
    console.log('Status Tx  : Unwrap Berhasil');
    logActivity(`Unwrap berhasil: ${amount} WETH, TxHash: ${tx.hash}`);
    return true;
  } catch (error) {
    const errorMessage = error.code || error.message.split("(")[0];
    console.error(`Error unwrap : ${errorMessage}`);
    logActivity(`Error unwrap : ${errorMessage}`);
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

    // Cek saldo ETH sebelum setiap transaksi
    const { balance, sufficientBalance } = await checkETHBalance();
    console.log(`\nSaldo ETH  : ${balance} ETH`);

    // Jika saldo ETH di bawah minimum, coba lakukan auto-unwrap
    if (!sufficientBalance) {
      console.log(`Saldo ETH di bawah minimum ${MIN_ETH_BALANCE} ETH. Mencoba auto-unwrap...`);
      const unwrapSuccess = await performAutoUnwrap();

      if (!unwrapSuccess) {
        console.log("Auto-unwrap gagal atau tidak dapat dilakukan. Menghentikan proses.");
        break;
      }

      // Tunggu sejenak setelah auto-unwrap
      const cooldownDelay = 5000; // 5 detik
      console.log(`Menunggu ${cooldownDelay / 1000} detik setelah auto-unwrap...`);
      await new Promise(resolve => setTimeout(resolve, cooldownDelay));

      // Cek ulang saldo setelah auto-unwrap
      const newBalanceCheck = await checkETHBalance();
      if (!newBalanceCheck.sufficientBalance) {
        console.log("Saldo masih di bawah minimum setelah auto-unwrap. Menghentikan proses.");
        break;
      }
    }

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

const minDelay = 1000;
const maxDelay = 15000;

autoSwap(count, minDelay, maxDelay)
  .then(() => {
    console.log("Auto-swap selesai");
  })
  .catch(error => {
    console.error("Error:", error);
  });
