import { useContext, useCallback } from 'react';
import { AppContext } from '../state/AppContext';

type HapticIntensity = 'light' | 'medium' | 'heavy';

export const useHaptics = () => {
    const { state } = useContext(AppContext);
    const { hapticFeedback } = state.settings;

    const triggerHaptic = useCallback((intensity: HapticIntensity = 'light') => {
        if (hapticFeedback && window.navigator.vibrate) {
            const duration = intensity === 'light' ? 20 : intensity === 'medium' ? 40 : 60;
            window.navigator.vibrate(duration);
        }
    }, [hapticFeedback]);

    return { triggerHaptic };
};
