import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/constants/i18n';
import { Fonts } from '@/constants/theme';

export default function PaymentSuccessScreen() {
    const { session_id } = useLocalSearchParams();
    const router = useRouter();
    const { setToken, setUser } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!session_id) {
            router.replace('/(auth)/select-plan');
            return;
        }

        const completeRegistration = async () => {
            try {
                // Send the session ID to the backend.
                // The backend will verify the payment with Stripe, get customer info, create the user,
                // and return user data and a token.
                const response = await api.post('/api/auth/register-from-payment', {
                    sessionId: session_id,
                });

                const { token, user } = response.data;

                if (token && user) {
                    // Save token and user data, then redirect to the app
                    await setToken(token);
                    setUser(user);
                    router.replace('/(tabs)');
                } else {
                    setError('Failed to create account. Please contact support.');
                }
            } catch (err) {
                console.error('Error completing registration:', err);
                setError('An unexpected error occurred. Please try again or contact support.');
            }
        };

        completeRegistration();
    }, [session_id]);

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Verifying payment and creating your account...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        padding: 20,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        fontFamily: Fonts.medium,
        color: '#4A5568',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        fontFamily: Fonts.medium,
        color: '#E53E3E',
        textAlign: 'center',
    }
});
