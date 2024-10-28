// Import library dan konfigurasi
const { ethers } = require('ethers');
require('dotenv').config();

// Menampilkan tampilan awal
function displayWelcomeMessage() {
  console.log("============================================");
  console.log("               A I   D R O P                ");
  console.log("============================================");
  console.log("Join:    https://t.me/ai_drop100");
  console.log("Github:  https://github.com/zrxyxnn");
  console.log("============================================");
  console.log(); // Baris kosong untuk pemisah
}

// Konfigurasi RPC Taiko dan Wallet
const provider = new ethers.JsonRpcProvider(process.env.TAIKO_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Kontrak WETH Taiko (contoh address, sesuaikan dengan jaringan Taiko)
const WETH_ADDRESS = "0xa51894664a773981c6c112c43ce576f315d5b1b6";
const wethContract = new ethers.Contract(WETH_ADDRESS, [
  "function deposit() public payable",
  "function withdraw(uint256 amount) public",
], wallet);

// Konfigurasi jumlah min dan max untuk swap serta gas price (Gwei)
const MIN_AMOUNT = parseFloat(process.env.MIN_AMOUNT || "0.002"); // jumlah minimum dalam ETH
const MAX_AMOUNT = parseFloat(process.env.MAX_AMOUNT || "0.02");  // jumlah maksimum dalam ETH
const GAS_PRICE_GWEI = parseFloat(process.env.GAS_PRICE_GWEI || "0.2"); // gas price dalam Gwei

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

// Fungsi wrap ETH ke WETH dengan gas price yang diatur
async function wrapETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");
  try {
    const tx = await wethContract.deposit({
      value: ethers.parseEther(amount),
      gasPrice
    });
    console.log(`Wrapping ETH: ${amount} ETH ke WETH`);
    await tx.wait();
    console.log('Wrap berhasil');
  } catch (error) {
    console.error('Error saat wrap ETH:', error);
  }
}

// Fungsi unwrap WETH ke ETH dengan gas price yang diatur
async function unwrapWETH(amount) {
  const gasPrice = ethers.parseUnits(GAS_PRICE_GWEI.toString(), "gwei");
  try {
    const txAmount = ethers.parseEther(amount);
    console.log(`Attempting to unwrap ${amount} WETH...`);
    const tx = await wethContract.withdraw(txAmount, { gasPrice });
    console.log(`Unwrapping WETH: ${amount} WETH ke ETH`);
    await tx.wait();
    console.log('Unwrap berhasil');
  } catch (error) {
    console.error('Error saat unwrap WETH:', error);
    console.error(`Transaction details:`, {
      amount,
      gasPrice: gasPrice.toString(),
    });
  }
}

// Fungsi utama untuk eksekusi auto-swap dengan jumlah random
async function autoSwap(repeatCount, minDelay, maxDelay) {
  for (let i = 0; i < repeatCount; i++) {
    // Mendapatkan jumlah random untuk setiap wrap/unwrap
    const amount = getRandomAmount(MIN_AMOUNT, MAX_AMOUNT);

    // Menentukan eksekusi wrap atau unwrap
    if (Math.random() < 0.5) {
      await wrapETH(amount);
    } else {
      await unwrapWETH(amount);
    }

    // Delay acak
    const delay = getRandomDelay(minDelay, maxDelay);
    console.log(`Menunggu selama ${delay / 1000} detik sebelum transaksi berikutnya`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Menampilkan pesan selamat datang
displayWelcomeMessage();

// Eksekusi fungsi dengan parameter yang diinginkan
autoSwap(75, 10000, 150000) // 40 kali swap dengan delay acak antara 10-150 detik
  .then(() => console.log("Auto-swap selesai"))
  .catch(error => console.error("Error:", error));
