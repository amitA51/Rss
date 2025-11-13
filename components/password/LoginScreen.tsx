import React, { useState } from 'react';
import * as cryptoService from '../../services/cryptoService';
import * as passwordStore from '../../services/passwordStore';
import { ShieldCheckIcon } from '../icons';
import type { PasswordItem, EncryptedField } from '../../types';
import LoadingSpinner from '../LoadingSpinner';

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow text-center";
const buttonStyles = "w-full bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 h-12 flex items-center justify-center";

interface LoginScreenProps {
    onLoginSuccess: (items: PasswordItem[], mainKey: CryptoKey, sensitiveKey: CryptoKey) => void;
}

const isEncryptedField = (field: any): field is EncryptedField => {
    return typeof field === 'object' && field !== null && 'iv' in field && 'data' in field;
};


const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const vault = await passwordStore.loadVault();
            if (!vault) {
                throw new Error("לא נמצאה כספת. יש להגדיר אחת תחילה.");
            }

            const saltString = atob(vault.salt);
            const saltBuffer = new Uint8Array(saltString.length);
            for (let i = 0; i < saltString.length; i++) {
                saltBuffer[i] = saltString.charCodeAt(i);
            }

            // 1. Derive both keys
            const mainKey = await cryptoService.deriveKey(password, saltBuffer, vault.iterations);
            const sensitiveKey = await cryptoService.deriveSensitiveKey(password, saltBuffer);
            
            // 2. Decrypt main vault
            const decryptedJson = await cryptoService.decryptToString(vault.data, vault.iv, mainKey);
            const items: PasswordItem[] = JSON.parse(decryptedJson);

            // 3. Decrypt sensitive fields
            const fullyDecryptedItems = await Promise.all(items.map(async (item) => {
                if (item.isSensitive && isEncryptedField(item.password)) {
                    const decryptedPassword = await cryptoService.decryptToString(item.password.data, item.password.iv, sensitiveKey);
                    return { ...item, password: decryptedPassword };
                }
                return item;
            }));

            onLoginSuccess(fullyDecryptedItems as PasswordItem[], mainKey, sensitiveKey);

        } catch (err) {
            console.error('Login failed:', err);
            setError('סיסמה שגויה או שהכספת פגומה.');
            setIsLoading(false);
            if (window.navigator.vibrate) {
                window.navigator.vibrate([100, 50, 100]);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 animate-screen-enter">
            <div className="w-full max-w-sm text-center">
                <ShieldCheckIcon className="w-16 h-16 mx-auto text-[var(--dynamic-accent-start)]" />
                <h1 className="text-3xl font-bold themed-title mt-4">פתיחת הכספת</h1>
                <p className="text-[var(--text-secondary)] mt-2">הזן את הסיסמה הראשית שלך כדי לגשת לסיסמאות.</p>
                
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <input
                        type="password"
                        placeholder="סיסמה ראשית"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputStyles}
                        autoFocus
                        required
                    />
                    {error && <p className="text-red-400">{error}</p>}
                    <button type="submit" disabled={isLoading} className={buttonStyles}>
                        {isLoading ? <LoadingSpinner /> : 'פתח'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;