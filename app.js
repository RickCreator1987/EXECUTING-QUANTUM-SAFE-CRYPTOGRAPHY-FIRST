// app.js
// EXECUTING-QUANTUM-SAFE-CRYPTOGRAPHY-FIRST (frontend sketch)

// --- Utility: encode/decode helpers ---
function strToUint8(str) {
  return new TextEncoder().encode(str);
}

function uint8ToBase64(uint8) {
  return btoa(String.fromCharCode(...uint8));
}

function base64ToUint8(b64) {
  return new Uint8Array(
    atob(b64)
      .split("")
      .map(c => c.charCodeAt(0))
  );
}

// --- Placeholder "quantum-safe" KEM interface ---
// In a real system, this would call a WASM PQC library (e.g., Kyber).
async function pqcGenerateKeypair() {
  // TODO: replace with real PQC keygen
  const fakePublicKey = crypto.getRandomValues(new Uint8Array(32));
  const fakeSecretKey = crypto.getRandomValues(new Uint8Array(32));
  return { publicKey: fakePublicKey, secretKey: fakeSecretKey };
}

async function pqcEncapsulate(publicKey) {
  // TODO: replace with real PQC encapsulation
  const sharedSecret = crypto.getRandomValues(new Uint8Array(32));
  const ciphertext = crypto.getRandomValues(new Uint8Array(64));
  return { sharedSecret, ciphertext };
}

async function pqcDecapsulate(ciphertext, secretKey) {
  // TODO: replace with real PQC decapsulation
  // For demo, we just regenerate a deterministic "shared secret" from ciphertext+secretKey
  const combined = new Uint8Array(ciphertext.length + secretKey.length);
  combined.set(ciphertext, 0);
  combined.set(secretKey, ciphertext.length);
  const hash = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(hash);
}

// --- Classical ECDH key agreement (WebCrypto) ---
async function ecdhGenerateKeypair() {
  return crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

async function ecdhDeriveBits(privateKey, publicKey) {
  const bits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    256
  );
  return new Uint8Array(bits);
}

// --- Hybrid key derivation: PQC first, then classical ---
async function deriveHybridKey(pqcSharedSecret, ecdhSharedSecret) {
  // Concatenate PQC || ECDH and hash to get final symmetric key material
  const combined = new Uint8Array(
    pqcSharedSecret.length + ecdhSharedSecret.length
  );
  combined.set(pqcSharedSecret, 0);
  combined.set(ecdhSharedSecret, pqcSharedSecret.length);

  const hash = await crypto.subtle.digest("SHA-256", combined);
  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

// --- Encrypt with AES-GCM using hybrid key ---
async function encryptHybrid(plaintext) {
  // 1. Quantum-safe KEM (placeholder)
  const pqcKeys = await pqcGenerateKeypair();
  const { sharedSecret: pqcSharedSecret, ciphertext: pqcCiphertext } =
    await pqcEncapsulate(pqcKeys.publicKey);

  // 2. Classical ECDH
  const ecdhKeys = await ecdhGenerateKeypair();
  const ecdhSharedSecret = await ecdhDeriveBits(
    ecdhKeys.privateKey,
    ecdhKeys.publicKey
  );

  // 3. Hybrid symmetric key
  const aesKey = await deriveHybridKey(pqcSharedSecret, ecdhSharedSecret);

  // 4. Encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    aesKey,
    strToUint8(plaintext)
  );

  return {
    pqcCiphertext: uint8ToBase64(pqcCiphertext),
    iv: uint8ToBase64(iv),
    ciphertext: uint8ToBase64(new Uint8Array(ciphertext))
  };
}

// --- Wire up UI ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("crypto-form");
  const plaintextEl = document.getElementById("plaintext");
  const outputEl = document.getElementById("output");

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = plaintextEl.value.trim();
    if (!msg) {
      outputEl.textContent = "Enter a message first.";
      return;
    }

    outputEl.textContent = "Executing quantum-safe cryptography first…";

    try {
      const result = await encryptHybrid(msg);
      outputEl.textContent = JSON.stringify(
        {
          mode: "EXECUTING-QUANTUM-SAFE-CRYPTOGRAPHY-FIRST",
          ...result
        },
        null,
        2
      );
    } catch (err) {
      console.error(err);
      outputEl.textContent = "Error during encryption.";
    }
  });
});
