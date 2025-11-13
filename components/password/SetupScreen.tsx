import React, { useState } from 'react';
import * as cryptoService from '../../services/cryptoService';
import * as passwordStore from '../../services/passwordStore';
import { KeyIcon, ShieldCheckIcon, WarningIcon } from '../icons';
import LoadingSpinner from '../LoadingSpinner';
import PasswordStrengthMeter from './PasswordStrengthMeter';

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
const buttonStyles = "w-full bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 h-12 flex items-center justify-center";

interface SetupScreenProps {
    onSetupSuccess: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [salt, setSalt] = useState('');
    const [iterations, setIterations] = useState(310000);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('הסיסמה חייבת להכיל לפחות 8 תווים.');
            return;
        }
        if (password !== confirmPassword) {
            setError('הסיסמאות אינן תואמות.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            const saltBuffer = salt ? new TextEncoder().encode(salt) : window.crypto.getRandomValues(new Uint8Array(16));
            
            const key = await cryptoService.deriveKey(password, saltBuffer, iterations);
            const encryptedVault = await cryptoService.encryptString('[]', key);

            await passwordStore.saveVault({
                iv: encryptedVault.iv,
                data: encryptedVault.data,
                salt: btoa(String.fromCharCode(...new Uint8Array(saltBuffer))),
                iterations,
            });

            onSetupSuccess();
        } catch (err) {
            console.error('Setup failed:', err);
            setError('שגיאה ביצירת הכספת. נסה שוב.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 animate-screen-enter">
            <div className="w-full max-w-md text-center">
                <ShieldCheckIcon className="w-16 h-16 mx-auto text-[var(--dynamic-accent-start)]" />
                <h1 className="text-3xl font-bold themed-title mt-4">הגדרת הכספת</h1>
                <p className="text-[var(--text-secondary)] mt-2">צור סיסמה ראשית חזקה כדי לאבטח את הסיסמאות שלך. סיסמה זו היא המפתח היחיד למידע שלך.</p>
                
                <div className="text-sm text-yellow-300 mt-4 bg-yellow-900/30 p-3 rounded-lg border border-yellow-500/50 flex items-start gap-2 text-right">
                   <WarningIcon className="w-8 h-8 text-yellow-400 shrink-0"/>
                    <div>
                        <strong className="font-bold">שימו לב:</strong> אם תשכחו את הסיסמה הראשית, לא תהיה שום דרך לשחזר את הנתונים המוצפנים. שמרו אותה במקום בטוח.
                    </div>
                </div>


                <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-right">
                    <input
                        type="password"
                        placeholder="סיסמה ראשית"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputStyles}
                        required
                    />
                    <PasswordStrengthMeter password={password} />
                    <input
                        type="password"
                        placeholder="אשר סיסמה ראשית"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputStyles}
                        required
                    />

                    <div className="text-center">
                        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-[var(--text-secondary)] hover:text-white">
                            {showAdvanced ? 'הסתר' : 'הצג'} הגדרות מתקדמות
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="space-y-4 p-4 border border-[var(--border-primary)] rounded-lg text-left">
                             <div>
                                <label className="text-sm text-[var(--text-secondary)]">Salt (אופציונלי, מומלץ להשאיר ריק)</label>
                                <input type="text" value={salt} onChange={e => setSalt(e.target.value)} placeholder="יצירה אוטומטית של 16 בתים אקראיים" className={inputStyles} />
                            </div>
                            <div>
                                <label className="text-sm text-[var(--text-secondary)]">PBKDF2 Iterations: {iterations.toLocaleString()}</label>
                                <input type="range" min="200000" max="600000" step="10000" value={iterations} onChange={e => setIterations(parseInt(e.target.value, 10))} className="w-full"/>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-red-400 text-center">{error}</p>}
                    
                    <button type="submit" disabled={isLoading} className={buttonStyles}>
                        {isLoading ? <LoadingSpinner /> : 'צור כספת'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetupScreen;