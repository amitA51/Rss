import React, { useState, useEffect, useCallback } from 'react';
import * as passwordStore from '../../services/passwordStore';
import LoginScreen from './LoginScreen';
import SetupScreen from './SetupScreen';
import VaultScreen from './VaultScreen';
import type { PasswordItem } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import useIdleTimer from '../../hooks/useIdleTimer';

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface SessionKeys {
    main: CryptoKey;
    sensitive: CryptoKey;
}

const PasswordManager: React.FC = () => {
    const [vaultExists, setVaultExists] = useState<boolean | null>(null);
    const [decryptedItems, setDecryptedItems] = useState<PasswordItem[] | null>(null);
    const [sessionKeys, setSessionKeys] = useState<SessionKeys | null>(null);

    const checkVault = useCallback(async () => {
        const exists = await passwordStore.hasVault();
        setVaultExists(exists);
    }, []);

    useEffect(() => {
        checkVault();
    }, [checkVault]);

    const handleLock = useCallback(() => {
        setDecryptedItems(null);
        setSessionKeys(null);
    }, []);

    useIdleTimer(handleLock, AUTO_LOCK_TIMEOUT);

    const handleSetupSuccess = () => {
        setVaultExists(true);
    };

    const handleLoginSuccess = useCallback((items: PasswordItem[], mainKey: CryptoKey, sensitiveKey: CryptoKey) => {
        // Ensure all passwords are strings after decryption
        const fullyDecryptedItems = items.map(item => ({ ...item, password: item.password as string }));
        setDecryptedItems(fullyDecryptedItems);
        setSessionKeys({ main: mainKey, sensitive: sensitiveKey });
    }, []);
    
    const handleVaultUpdate = (items: PasswordItem[]) => {
        setDecryptedItems(items);
    };

    const handleVaultDeleted = () => {
        handleLock();
        checkVault();
    };

    if (vaultExists === null) {
        return (
            <div className="flex justify-center items-center p-8">
                <LoadingSpinner className="w-8 h-8" />
            </div>
        );
    }
    
    if (decryptedItems && sessionKeys) {
        return <VaultScreen items={decryptedItems} sessionKeys={sessionKeys} onLock={handleLock} onUpdate={handleVaultUpdate} onVaultDeleted={handleVaultDeleted} />;
    }

    if (vaultExists) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    return <SetupScreen onSetupSuccess={handleSetupSuccess} />;
};

export default PasswordManager;