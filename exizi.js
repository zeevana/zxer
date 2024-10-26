// Import library dan konfigurasi
const ethers = require('ethers');
require('dotenv').config();

// Konfigurasi RPC Taiko dan Wallet
const provider = new ethers.providers.JsonRpcProvider(process.env.TAIKO_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Kontrak WETH Taiko (contoh address, sesuaikan dengan jaringan Taiko)
const WETH_ADDRESS = "0xYourWethContractAddress";
const wethContract = new ethers.Contract(WETH_ADDRESS, [
  "function deposit() public payable",
  "function withdraw(uint256 amount) public",
], wallet);

// Fungsi delay acak
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Fungsi wrap ETH ke WETH
async function wrapETH(amount) {
  const tx = await wethContract.deposit({ value: ethers.utils.parseEther(amount) });
  console.log(`Wrapping ETH: ${amount} ETH ke WETH`);
  await tx.wait();
  console.log('Wrap berhasil');
}

// Fungsi unwrap WETH ke ETH
async function unwrapWETH(amount) {
  const tx = await wethContract.withdraw(ethers.utils.parseEther(amount));
  console.log(`Unwrapping WETH: ${amount} WETH ke ETH`);
  await tx.wait();
  console.log('Unwrap berhasil');
}

// Fungsi utama untuk eksekusi auto-swap
async function autoSwap(repeatCount, minDelay, maxDelay) {
  for (let i = 0; i < repeatCount; i++) {
    // Jumlah random untuk wrap/unwrap
    const amount = (Math.random() * 0.1).toFixed(4); // Contoh jumlah random, bisa diatur
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

// Eksekusi fungsi dengan parameter yang diinginkan
autoSwap(10, 5000, 15000) // 10 kali swap dengan delay acak antara 5-15 detik
  .then(() => console.log("Auto-swap selesai"))
  .catch(error => console.error("Error:", error));
