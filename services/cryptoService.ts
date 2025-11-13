// --- Utility functions for data conversion ---

// Convert a string to an ArrayBuffer
function str2ab(str: string): ArrayBuffer {
    return new TextEncoder().encode(str);
}

// Convert an ArrayBuffer to a string
function ab2str(buf: ArrayBuffer): string {
    return new TextDecoder().decode(buf);
}

// Convert an ArrayBuffer to a Base64 string for storage
function ab2b64(buf: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Convert a Base64 string back to an ArrayBuffer
function b642ab(b64: string): ArrayBuffer {
    const binary_string = window.atob(b64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// --- Core Crypto Functions ---

/**
 * Derives a cryptographic key from a master password using PBKDF2.
 * @param password The user's master password.
 * @param salt The salt for the key derivation.
 * @param iterations The number of iterations for PBKDF2.
 * @returns A Promise that resolves to a CryptoKey.
 */
export async function deriveKey(password: string, salt: ArrayBuffer, iterations: number): Promise<CryptoKey> {
    const baseKey = await window.crypto.subtle.importKey(
        'raw',
        str2ab(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Derives a secondary key for sensitive items. Uses a static salt to ensure it's the same key every time for the same password.
 * @param password The user's master password.
 * @param mainSalt The primary salt from the vault, used to derive this key to tie it to the vault's lifecycle.
 * @returns A Promise resolving to a CryptoKey for sensitive data.
 */
export async function deriveSensitiveKey(password: string, mainSalt: ArrayBuffer): Promise<CryptoKey> {
    // This static salt is combined with the main salt to create a unique salt for the sensitive key derivation.
    const staticSensitiveSalt = str2ab("spark-sensitive-field-salt");
    const combinedSalt = new Uint8Array(mainSalt.byteLength + staticSensitiveSalt.byteLength);
    combinedSalt.set(new Uint8Array(mainSalt), 0);
    combinedSalt.set(new Uint8Array(staticSensitiveSalt), mainSalt.byteLength);

    const baseKey = await window.crypto.subtle.importKey(
        'raw',
        str2ab(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Using a fixed, lower iteration count for performance, as this is a second layer of encryption.
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: combinedSalt.buffer,
            iterations: 100000, // Fixed lower iteration count
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}


/**
 * Encrypts a plaintext string using AES-GCM.
 * @param plaintext The string to encrypt.
 * @param key The CryptoKey to use for encryption.
 * @returns A Promise that resolves to an object containing the base64-encoded IV and ciphertext.
 */
export async function encryptString(plaintext: string, key: CryptoKey): Promise<{ iv: string; data: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        str2ab(plaintext)
    );

    return {
        iv: ab2b64(iv),
        data: ab2b64(encryptedData),
    };
}

/**
 * Decrypts a ciphertext string using AES-GCM.
 * @param ciphertextB64 The base64-encoded ciphertext.
 * @param ivB64 The base64-encoded initialization vector.
 * @param key The CryptoKey to use for decryption.
 * @returns A Promise that resolves to the decrypted plaintext string.
 */
export async function decryptToString(ciphertextB64: string, ivB64: string, key: CryptoKey): Promise<string> {
    const ciphertext = b642ab(ciphertextB64);
    const iv = b642ab(ivB64);

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        ciphertext
    );

    return ab2str(decrypted);
}

interface GeneratePasswordOptions {
    length?: number;
    numbers?: boolean;
    symbols?: boolean;
    uppercase?: boolean;
    lowercase?: boolean;
}

/**
 * Generates a strong, random password with customizable options.
 * @param options Configuration for the password generation.
 * @returns A randomly generated password string.
 */
export function generatePassword(options: GeneratePasswordOptions = {}): string {
    const {
        length = 18,
        numbers = true,
        symbols = true,
        uppercase = true,
        lowercase = true
    } = options;

    const lowerCharset = 'abcdefghijklmnopqrstuvwxyz';
    const upperCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbersCharset = '0123456789';
    const symbolsCharset = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = '';
    if (lowercase) charset += lowerCharset;
    if (uppercase) charset += upperCharset;
    if (numbers) charset += numbersCharset;
    if (symbols) charset += symbolsCharset;

    if (charset === '') {
        return ''; // Or throw an error if no character types are selected
    }

    let password = '';
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
        password += charset[randomValues[i] % charset.length];
    }

    return password;
}

/**
 * Computes the SHA-1 hash of a string.
 * @param str The string to hash.
 * @returns A Promise that resolves to the hex-encoded SHA-1 hash.
 */
async function sha1(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if a password has been exposed in a data breach using the HIBP Pwned Passwords API (k-anonymity).
 * @param password The password to check.
 * @returns A Promise that resolves to true if the password is pwned, false otherwise.
 */
export async function checkPwnedPassword(password: string): Promise<boolean> {
    try {
        const hash = await sha1(password);
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5).toUpperCase();

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) {
            // If the API fails, gracefully return false instead of throwing an error.
            console.warn(`HIBP API request failed with status: ${response.status}`);
            return false;
        }

        const text = await response.text();
        const lines = text.split('\r\n');

        for (const line of lines) {
            const [hashSuffix, count] = line.split(':');
            if (hashSuffix === suffix) {
                console.warn(`Password pwned! Found ${count} times.`);
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error("Error checking pwned password:", error);
        return false; // Fail safe
    }
}
