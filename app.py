# app.py
# EXECUTING-QUANTUM-SAFE-CRYPTOGRAPHY-FIRST (backend sketch)

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
import os
import base64
import hashlib

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.kdf.concatkdf import ConcatKDFHash
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

app = FastAPI(title="EXECUTING-QUANTUM-SAFE-CRYPTOGRAPHY-FIRST")

# --- Models ---

class EncryptRequest(BaseModel):
    plaintext: str

class EncryptResponse(BaseModel):
    mode: str
    pqc_ciphertext: str
    iv: str
    ciphertext: str


# --- Placeholder PQC KEM interface ---
def pqc_generate_keypair() -> Dict[str, bytes]:
    # TODO: replace with real PQC keygen (e.g., Kyber via a library)
    fake_public = os.urandom(32)
    fake_secret = os.urandom(32)
    return {"public_key": fake_public, "secret_key": fake_secret}

def pqc_encapsulate(public_key: bytes) -> Dict[str, bytes]:
    # TODO: replace with real PQC encapsulation
    shared_secret = os.urandom(32)
    ciphertext = os.urandom(64)
    return {"shared_secret": shared_secret, "ciphertext": ciphertext}

def pqc_decapsulate(ciphertext: bytes, secret_key: bytes) -> bytes:
    # TODO: replace with real PQC decapsulation
    h = hashlib.sha256()
    h.update(ciphertext)
    h.update(secret_key)
    return h.digest()


# --- Classical ECDH ---

def ecdh_generate_keypair():
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    return private_key, public_key

def ecdh_derive_shared_secret(private_key, public_key) -> bytes:
    shared = private_key.exchange(ec.ECDH(), public_key)
    # Optional: run through a KDF to normalize length
    ckdf = ConcatKDFHash(algorithm=hashes.SHA256(), length=32, otherinfo=b"EXECUTING-QUANTUM-SAFE-CRYPTOGRAPHY-FIRST")
    return ckdf.derive(shared)


# --- Hybrid key derivation ---

def derive_hybrid_key(pqc_shared: bytes, ecdh_shared: bytes) -> bytes:
    combined = pqc_shared + ecdh_shared
    return hashlib.sha256(combined).digest()  # 32 bytes for AES-256


# --- Encryption ---

def encrypt_hybrid(plaintext: str) -> EncryptResponse:
    # 1. PQC KEM
    pqc_keys = pqc_generate_keypair()
    pqc_result = pqc_encapsulate(pqc_keys["public_key"])
    pqc_shared = pqc_result["shared_secret"]
    pqc_ciphertext = pqc_result["ciphertext"]

    # 2. ECDH
    ecdh_priv, ecdh_pub = ecdh_generate_keypair()
    ecdh_shared = ecdh_derive_shared_secret(ecdh_priv, ecdh_pub)

    # 3. Hybrid symmetric key
    key = derive_hybrid_key(pqc_shared, ecdh_shared)  # 32 bytes
    aesgcm = AESGCM(key)
    iv = os.urandom(12)

    ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)

    return EncryptResponse(
        mode="EXECUTING-QUANTUM-SAFE-CRYPTOGRAPHY-FIRST",
        pqc_ciphertext=base64.b64encode(pqc_ciphertext).decode("ascii"),
        iv=base64.b64encode(iv).decode("ascii"),
        ciphertext=base64.b64encode(ct).decode("ascii"),
    )


# --- API route ---

@app.post("/encrypt", response_model=EncryptResponse)
def encrypt_endpoint(req: EncryptRequest):
    return encrypt_hybrid(req.plaintext)

then run
pip install fastapi uvicorn cryptography
uvicorn app:app --reload
