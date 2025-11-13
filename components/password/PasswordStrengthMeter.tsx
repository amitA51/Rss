import React from 'react';

interface PasswordStrengthMeterProps {
    password?: string;
}

type Strength = {
    level: 'none' | 'weak' | 'medium' | 'strong';
    label: string;
    color: string;
    width: string;
};

const calculateStrength = (password: string): Strength => {
    let score = 0;
    if (!password) {
        return { level: 'none', label: '', color: 'bg-gray-700', width: '0%' };
    }

    // Award points for different criteria
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    switch (score) {
        case 0:
        case 1:
        case 2:
            return { level: 'weak', label: 'חלש', color: 'bg-red-500', width: '33%' };
        case 3:
            return { level: 'medium', label: 'בינוני', color: 'bg-yellow-500', width: '66%' };
        case 4:
        case 5:
            return { level: 'strong', label: 'חזק', color: 'bg-green-500', width: '100%' };
        default:
            return { level: 'none', label: '', color: 'bg-gray-700', width: '0%' };
    }
};


const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
    const strength = calculateStrength(password);

    if (password.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 text-sm mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                ></div>
            </div>
            <span className="font-semibold w-12 text-right" style={{ color: strength.color.replace('bg-','').replace('-500','').replace('red', 'var(--danger)').replace('yellow', 'var(--warning)').replace('green', 'var(--success)') }}>
                {strength.label}
            </span>
        </div>
    );
};

export default PasswordStrengthMeter;
