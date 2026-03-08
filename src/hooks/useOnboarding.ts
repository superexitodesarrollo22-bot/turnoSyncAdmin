import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

const KEY = 'turnosync_admin_onboarding_done';

export function useOnboarding() {
    const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(KEY)
            .then((value) => {
                setShouldShowOnboarding(value !== '1');
            })
            .catch(() => {
                setShouldShowOnboarding(false);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const completeOnboarding = () => {
        AsyncStorage.setItem(KEY, '1').catch(() => { });
        setShouldShowOnboarding(false);
    };

    return { shouldShowOnboarding, completeOnboarding, loading };
}
