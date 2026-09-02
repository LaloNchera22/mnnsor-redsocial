export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as unknown as number[]);
  const exportedAsBase64 = window.btoa(exportedAsString);
  return exportedAsBase64;
};

export const exportPrivateKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as unknown as number[]);
  const exportedAsBase64 = window.btoa(exportedAsString);
  return exportedAsBase64;
};

export const importPublicKey = async (pem: string): Promise<CryptoKey> => {
  const binaryDerString = window.atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

export const importPrivateKey = async (pem: string): Promise<CryptoKey> => {
  const binaryDerString = window.atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
};

export const encryptMessage = async (message: string, publicKey: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    encoded
  );

  const buffer = new Uint8Array(ciphertext);
  const string = String.fromCharCode.apply(null, buffer as unknown as number[]);
  return window.btoa(string);
};

export const decryptMessage = async (ciphertextBase64: string, privateKey: CryptoKey): Promise<string> => {
  const string = window.atob(ciphertextBase64);
  const buffer = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    buffer[i] = string.charCodeAt(i);
  }

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    buffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};
