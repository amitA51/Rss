import React, { useState, useRef, useEffect } from 'react';
import type { EncryptedVault, PasswordItem } from '../../types';
import { CloseIcon, UploadIcon, DownloadIcon, TrashIcon, WarningIcon, KeyIcon, ShieldCheckIcon } from '../icons';
import * as cryptoService from '../../services/cryptoService';
import * as passwordStore from '../../services/passwordStore';
import LoadingSpinner from '../LoadingSpinner';

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";

interface SettingsModalProps {
    onClose: () => void;
    sessionKey: CryptoKey;
    onVaultDeleted: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, sessionKey, onVaultDeleted }) => {
    const [isClosing, setIsClosing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changePasswordError, setChangePasswordError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state for security hardening
    const [isHardening, setIsHardening] = useState(false);
    const [currentPasswordForHardening, setCurrentPasswordForHardening] = useState('');
    const [newIterations, setNewIterations] = useState<number | null>(null);
    const [hardeningError, setHardeningError] = useState('');

    const [vaultMeta, setVaultMeta] = useState<{ salt: string; iterations: number } | null>(null);
    
    useEffect(() => {
        const fetchVaultMeta = async () => {
            const vault = await passwordStore.loadVault();
            if (vault) {
                setVaultMeta({ salt: vault.salt, iterations: vault.iterations });
            }
        };
        fetchVaultMeta();
    }, []);


    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const handleExport = async () => {
        const vault = await passwordStore.loadVault();
        if (!vault) {
            alert("לא נמצאה כספת לייצוא.");
            return;
        }
        const vaultWithBackupDate = { ...vault, lastBackup: new Date().toISOString() };
        await passwordStore.saveVault(vaultWithBackupDate);
        const blob = new Blob([JSON.stringify(vaultWithBackupDate)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spark_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => fileInputRef.current?.click();

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedVault: EncryptedVault = JSON.parse(event.target?.result as string);
                if (!importedVault.iv || !importedVault.data || !importedVault.salt || !importedVault.iterations) throw new Error("קובץ לא תקין.");
                const importPassword = prompt("הזן את הסיסמה הראשית של הקובץ המיובא:");
                if (!importPassword) return;

                const saltString = atob(importedVault.salt);
                const saltBuffer = new Uint8Array(saltString.length).map((_, i) => saltString.charCodeAt(i));
                const key = await cryptoService.deriveKey(importPassword, saltBuffer, importedVault.iterations);
                const decryptedJson = await cryptoService.decryptToString(importedVault.data, importedVault.iv, key);
                const importedItems: PasswordItem[] = JSON.parse(decryptedJson);

                if (window.confirm(`הקובץ פוענח בהצלחה ומכיל ${importedItems.length} פריטים. האם להחליף את הכספת הנוכחית?`)) {
                    await passwordStore.saveVault(importedVault);
                    alert("הייבוא הושלם! הכספת תינעל כעת.");
                    onClose();
                    onVaultDeleted();
                }
            } catch (err) {
                alert("שגיאה בייבוא הקובץ. ודא שהקובץ תקין והסיסמה נכונה.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDeleteVault = async () => {
        if (prompt('לאישור, הקלד "מחק כספת":') === 'מחק כספת') {
            await passwordStore.deleteVault();
            alert('הכספת נמחקה.');
            onClose();
            onVaultDeleted();
        } else {
            alert('המחיקה בוטלה.');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordError('');
        if (newPassword.length < 8) {
            setChangePasswordError('הסיסמה החדשה חייבת להכיל לפחות 8 תווים.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setChangePasswordError('הסיסמאות החדשות אינן תואמות.');
            return;
        }
        setIsSubmitting(true);
        try {
            const vault = await passwordStore.loadVault();
            if (!vault) throw new Error("לא נמצאה כספת.");

            const saltString = atob(vault.salt);
            const saltBuffer = new Uint8Array(saltString.length).map((_, i) => saltString.charCodeAt(i));
            
            // 1. Verify old password
            const oldKey = await cryptoService.deriveKey(oldPassword, saltBuffer, vault.iterations);
            const decryptedJson = await cryptoService.decryptToString(vault.data, vault.iv, oldKey);
            
            // 2. Derive new key and re-encrypt
            const newKey = await cryptoService.deriveKey(newPassword, saltBuffer, vault.iterations);
            const newEncrypted = await cryptoService.encryptString(decryptedJson, newKey);

            // 3. Save new vault
            await passwordStore.saveVault({
                ...vault,
                iv: newEncrypted.iv,
                data: newEncrypted.data
            });
            
            alert('הסיסמה שונתה בהצלחה. הכספת תינעל כעת.');
            onClose();
            onVaultDeleted();

        } catch (error) {
            console.error("Password change failed:", error);
            setChangePasswordError('הסיסמה הישנה שגויה.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHardeningSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setHardeningError('');
        if (!newIterations) return;
        setIsSubmitting(true);

        try {
            const vault = await passwordStore.loadVault();
            if (!vault) throw new Error("Vault not found.");

            const saltString = atob(vault.salt);
            const saltBuffer = new Uint8Array(saltString.length).map((_, i) => saltString.charCodeAt(i));

            // 1. Verify current password by decrypting
            const currentKey = await cryptoService.deriveKey(currentPasswordForHardening, saltBuffer, vault.iterations);
            const decryptedJson = await cryptoService.decryptToString(vault.data, vault.iv, currentKey);

            // 2. Derive new key with new iterations and re-encrypt
            const newKey = await cryptoService.deriveKey(currentPasswordForHardening, saltBuffer, newIterations);
            const newEncrypted = await cryptoService.encryptString(decryptedJson, newKey);

            // 3. Save new vault with updated data and iterations
            await passwordStore.saveVault({
                ...vault,
                iterations: newIterations,
                iv: newEncrypted.iv,
                data: newEncrypted.data
            });

            alert('הגדרות האבטחה עודכנו. הכספת תינעל כעת.');
            onClose();
            onVaultDeleted();

        } catch (error) {
            console.error("Security hardening failed:", error);
            setHardeningError('הסיסמה הנוכחית שגויה.');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={handleClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`bg-[var(--bg-card)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
            >
                <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">הגדרות כספת</h2>
                    <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white p-1 rounded-full">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-4 overflow-y-auto space-y-6">
                     <div className="space-y-3">
                        <h3 className="font-semibold text-lg">פרטי אבטחה</h3>
                        {vaultMeta ? (
                            <div className="p-3 bg-black/20 rounded-lg text-sm text-[var(--text-secondary)] space-y-2">
                                <div>
                                    <p className="font-semibold text-[var(--text-primary)]">Salt (Base64)</p>
                                    <p className="font-mono text-xs break-all">{vaultMeta.salt}</p>
                                </div>
                                 <div>
                                    <p className="font-semibold text-[var(--text-primary)]">PBKDF2 Iterations</p>
                                    <p className="font-mono">{vaultMeta.iterations.toLocaleString()}</p>
                                </div>
                            </div>
                        ) : <LoadingSpinner />}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">ניהול</h3>
                         <button onClick={() => setIsChangingPassword(!isChangingPassword)} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                            <KeyIcon className="h-5 h-5" />
                            שנה סיסמה ראשית
                        </button>
                        {isChangingPassword && (
                            <form onSubmit={handleChangePassword} className="p-4 bg-black/20 rounded-lg space-y-3">
                                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="סיסמה נוכחית" className={inputStyles} required />
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="סיסמה חדשה" className={inputStyles} required />
                                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="אשר סיסמה חדשה" className={inputStyles} required />
                                {changePasswordError && <p className="text-sm text-red-400">{changePasswordError}</p>}
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg h-10 flex items-center justify-center">
                                    {isSubmitting ? <LoadingSpinner /> : 'עדכן סיסמה'}
                                </button>
                            </form>
                        )}
                        <button onClick={() => setIsHardening(!isHardening)} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                            <ShieldCheckIcon className="h-5 h-5" />
                            חיזוק אבטחה (שינוי איטרציות)
                        </button>
                         {isHardening && (
                            <form onSubmit={handleHardeningSubmit} className="p-4 bg-black/20 rounded-lg space-y-3">
                                 <p className="text-sm text-[var(--text-secondary)]">הגדלת מספר האיטרציות מקשה על תקיפות Brute-Force, אך עשויה להאט מעט את פתיחת הכספת.</p>
                                <div>
                                    <label className="text-sm text-[var(--text-secondary)]">PBKDF2 Iterations: {(newIterations || vaultMeta?.iterations || 0).toLocaleString()}</label>
                                    <input type="range" min={vaultMeta?.iterations || 310000} max="1000000" step="10000" onChange={e => setNewIterations(parseInt(e.target.value, 10))} className="w-full"/>
                                </div>
                                <input type="password" value={currentPasswordForHardening} onChange={e => setCurrentPasswordForHardening(e.target.value)} placeholder="הזן סיסמה נוכחית לאישור" className={inputStyles} required />
                                {hardeningError && <p className="text-sm text-red-400">{hardeningError}</p>}
                                <button type="submit" disabled={isSubmitting || !newIterations} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg h-10 flex items-center justify-center">
                                    {isSubmitting ? <LoadingSpinner /> : 'עדכן והצפן מחדש'}
                                </button>
                            </form>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">גיבוי ושחזור</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            ייצוא הקובץ המוצפן הוא הדרך היחידה לגבות את הכספת. שמור אותו במקום בטוח.
                        </p>
                        <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                            <DownloadIcon className="h-5 h-5" />
                            ייצוא כספת מוצפנת
                        </button>
                        <button onClick={handleImport} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                            <UploadIcon className="h-5 h-5" />
                            ייבוא כספת מקובץ
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                    </div>

                    <div className="pt-4 border-t border-red-500/20">
                         <h3 className="font-semibold text-lg text-red-400">אזור סכנה</h3>
                         <button onClick={handleDeleteVault} className="mt-2 w-full flex items-center justify-center gap-2 bg-red-800/20 border border-red-500/30 hover:bg-red-800/40 text-red-300 font-semibold py-3 px-4 rounded-xl transition-colors">
                            <WarningIcon className="h-5 h-5" />
                            מחק את הכספת לצמיתות
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;