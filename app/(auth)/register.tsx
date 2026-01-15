import { useCustomAlert } from '@/components/ui/CustomAlert';
import { StyledButton } from '@/components/ui/StyledButton';
import i18n from '@/constants/i18n';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

export default function RegisterScreen() {
    const router = useRouter();
    const { plan, currency } = useLocalSearchParams();
    const { signUp } = useAuth();
    const { showAlert, AlertComponent } = useCustomAlert();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    // Forzamos el modo claro para evitar el fondo negro en dispositivos con tema oscuro
    const colorScheme = 'light';
    const styles = getThemedStyles(colorScheme);
    const theme = Colors[colorScheme];

    const [tenantId, setTenantId] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return 0;
        if (pass.length >= 6) score++;
        if (pass.length >= 10) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };

    const getStrengthColor = (score: number) => {
        if (score < 3) return '#E53E3E';
        if (score < 5) return '#D69E2E';
        return '#38A169';
    };

    const getStrengthLabel = (score: number) => {
        if (score < 3) return 'Débil';
        if (score < 5) return 'Media';
        return 'Fuerte';
    };
    
    const handleTenantIdChange = (text: string) => {
        // Reemplazar espacios por guiones bajos y eliminar caracteres especiales/puntos para nombre de BD
        const sanitized = text.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        setTenantId(sanitized);
    };

    const handleRegister = async () => {
        if (!tenantId || !adminUsername || !adminEmail || !adminPassword || !confirmPassword || !companyName) {
            showAlert(i18n.t('register.incompleteForm'), i18n.t('register.fillAllFields'));
            return;
        }

        // Validar formato de email
        if (!/\S+@\S+\.\S+/.test(adminEmail)) {
            showAlert(i18n.t('common.error'), i18n.t('login.invalidEmail'));
            return;
        }

        // Validar longitud de contraseña
        if (adminPassword.length < 6) {
            showAlert(i18n.t('common.error'), "La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        // Validar que las contraseñas coincidan
        if (adminPassword !== confirmPassword) {
            showAlert(i18n.t('common.error'), i18n.t('profile.passwordsDoNotMatch'));
            return;
        }
        
        setLoading(true);

        const registrationData = {
            tenantId,
            adminUsername,
            adminEmail,
            adminPassword,
            companyName,
            plan,
            currency,
        };

        try {
            await signUp(registrationData);
            router.replace('/(auth)/register-success');
        } catch (error: any) {
            let errorMessage = error.message || i18n.t('register.error');

            if (error.response?.data) {
                const backendMsg = typeof error.response.data === 'string' 
                    ? error.response.data 
                    : error.response.data.message;

                if (backendMsg && (backendMsg.includes("ya está registrado") || backendMsg.includes("already registered"))) {
                    errorMessage = i18n.t('register.emailAlreadyExists');
                } else if (backendMsg) {
                    errorMessage = backendMsg;
                }
            }
            showAlert(i18n.t('register.failed'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, isLargeScreen && styles.containerLarge]}>
            <AlertComponent />
            <Stack.Screen 
                options={{
                    title: isLargeScreen ? '' : `${i18n.t('register.title')} for ${plan}`,
                    headerShown: !isLargeScreen,
                }} 
            />

            {isLargeScreen && (
                <View style={styles.brandingContainer}>
                    <Image
                        source={require('@/assets/images/edbuild.png')}
                        style={styles.brandingLogo}
                    />
                    <Text style={styles.brandingTitle}>{i18n.t('login.branding.title')}</Text>
                    <Text style={styles.brandingSubtitle}>
                        {i18n.t('login.branding.subtitle')}
                    </Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.formScrollView}>
                <View style={styles.formContainer}>
                    <View style={styles.formWrapper}>
                        {!isLargeScreen && (
                            <Image
                                source={require('@/assets/images/edbuild.png')}
                                style={styles.formLogo}
                            />
                        )}
                        <Text style={styles.formTitle}>{i18n.t('register.title')}</Text>
                        <Text style={styles.formSubtitle}>{i18n.t('register.subtitle')}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{i18n.t('register.companyName')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={i18n.t('register.companyName')}
                                placeholderTextColor={theme.icon}
                                value={companyName}
                                onChangeText={setCompanyName}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{i18n.t('register.subdomain')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={i18n.t('register.subdomain')}
                                placeholderTextColor={theme.icon}
                                value={tenantId}
                                onChangeText={handleTenantIdChange}
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{i18n.t('register.adminUsername')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={i18n.t('register.adminUsername')}
                                placeholderTextColor={theme.icon}
                                value={adminUsername}
                                onChangeText={setAdminUsername}
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{i18n.t('register.adminEmail')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={i18n.t('register.adminEmail')}
                                placeholderTextColor={theme.icon}
                                value={adminEmail}
                                onChangeText={setAdminEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{i18n.t('register.adminPassword')}</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder={i18n.t('register.adminPassword')}
                                    placeholderTextColor={theme.icon}
                                    value={adminPassword}
                                    onChangeText={(text) => {
                                        setAdminPassword(text);
                                        setPasswordStrength(calculateStrength(text));
                                    }}
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={theme.icon} />
                                </Pressable>
                            </View>
                        {adminPassword.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBarBackground}>
                                    <View style={[styles.strengthBarFill, { width: `${(passwordStrength / 5) * 100}%`, backgroundColor: getStrengthColor(passwordStrength) }]} />
                                </View>
                                <Text style={[styles.strengthText, { color: getStrengthColor(passwordStrength) }]}>{getStrengthLabel(passwordStrength)}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{i18n.t('profile.confirmNewPassword')}</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder={i18n.t('profile.confirmNewPassword')}
                                placeholderTextColor={theme.icon}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={theme.icon} />
                            </Pressable>
                        </View>
                    </View>

                    <StyledButton
                        title={i18n.t('register.complete')}
                        onPress={handleRegister}
                        isLoading={loading}
                        variant="primary"
                        fullWidth
                    />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const getThemedStyles = (scheme: 'light' | 'dark' | null | undefined) => {
    const theme = Colors[scheme || 'light'];

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        containerLarge: {
            flexDirection: 'row',
        },
        brandingContainer: {
            flex: 1,
            backgroundColor: scheme === 'dark' ? Colors.dark.card : '#1A202C',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 48,
        },
        brandingLogo: {
            width: 150,
            height: 150,
            marginBottom: 24,
            borderRadius: 20,
        },
        brandingTitle: {
            fontFamily: Fonts.title,
            fontSize: 42,
            color: Colors.dark.text,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
        },
        brandingSubtitle: {
            fontFamily: Fonts.regular,
            fontSize: 18,
            color: Colors.dark.icon,
            textAlign: 'center',
            lineHeight: 28,
        },
        formScrollView: {
            flexGrow: 1,
            justifyContent: 'center',
        },
        formContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
        },
        formWrapper: {
            width: '100%',
            maxWidth: 400,
        },
        formLogo: {
            width: 100,
            height: 100,
            marginBottom: 24,
            alignSelf: 'center',
            borderRadius: 20,
        },
        formTitle: {
            fontFamily: Fonts.title,
            fontSize: 28,
            color: theme.text,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 8,
        },
        formSubtitle: {
            fontFamily: Fonts.regular,
            fontSize: 16,
            color: theme.icon,
            textAlign: 'center',
            marginBottom: 32,
        },
        inputGroup: {
            marginBottom: 16,
        },
        label: {
            fontFamily: Fonts.medium,
            fontSize: 14,
            color: theme.text,
            marginBottom: 8,
        },
        input: {
            height: 50,
            backgroundColor: theme.card,
            borderRadius: 8,
            paddingHorizontal: 16,
            fontSize: 16,
            fontFamily: Fonts.regular,
            color: theme.text,
            borderWidth: 1,
            borderColor: theme.border,
        },
        passwordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 50,
            backgroundColor: theme.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 16,
        },
        passwordInput: {
            flex: 1,
            height: '100%',
            fontSize: 16,
            fontFamily: Fonts.regular,
            color: theme.text,
        },
        eyeIcon: {
            marginLeft: 8,
        },
        strengthContainer: {
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        strengthBarBackground: {
            flex: 1,
            height: 4,
            backgroundColor: theme.border,
            borderRadius: 2,
            marginRight: 10,
            overflow: 'hidden',
        },
        strengthBarFill: {
            height: '100%',
        },
        strengthText: {
            fontSize: 12,
            fontFamily: Fonts.medium,
            minWidth: 40,
            textAlign: 'right',
        },
    });
};
