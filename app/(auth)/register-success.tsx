import i18n from '@/constants/i18n';
import { Fonts } from '@/constants/theme';
import { FontAwesome5 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function RegisterSuccessScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: i18n.t('register.successTitle'), headerShown: false }} />
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <FontAwesome5 name="check-circle" size={80} color="#4CAF50" />
                </View>
                <Text style={styles.title}>{i18n.t('register.successTitle')}</Text>
                <Text style={styles.subtitle}>{i18n.t('register.successSubtitle')}</Text>
                <Pressable style={styles.button} onPress={() => router.replace('/(auth)/')}>
                    <Text style={styles.buttonText}>{i18n.t('register.goToLogin')}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
    },
    content: {
        maxWidth: 400,
        width: '100%',
        padding: 20,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontFamily: Fonts.title,
        textAlign: 'center',
        color: '#1A202C',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        color: '#718096',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#2D3748',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
});
