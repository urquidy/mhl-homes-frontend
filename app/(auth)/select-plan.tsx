import { useCustomAlert } from '@/components/ui/CustomAlert';
import i18n from '@/constants/i18n';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import { FontAwesome5 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export default function SelectPlanScreen() {
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN');
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const { showAlert, AlertComponent } = useCustomAlert();
    const { theme } = useTheme();

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true);
                const response = await api.get('api/public/plans');
                setPlans(response.data);
                const recommendedPlan = response.data.find((p: any) => p.recommended);
                if (recommendedPlan) {
                    setSelectedPlanId(recommendedPlan.id);
                } else if (response.data.length > 0) {
                    setSelectedPlanId(response.data[0].id);
                }
            } catch (err) {
                setError(i18n.t('plan.loadError'));
                showAlert(i18n.t('plan.error'), i18n.t('plan.loadError'));
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);

    const handleSelectPlan = (planId: string) => {
        router.push({ pathname: '/(auth)/register', params: { plan: planId, currency } });
    };
    
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.primaryColor} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
                <AlertComponent />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AlertComponent />
            <Stack.Screen options={{ title: i18n.t('plan.title'), headerStyle: { backgroundColor: '#F7FAFC' }, headerTintColor: '#1A202C', headerTitleStyle: { fontFamily: Fonts.bold } }} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>{i18n.t('plan.title')}</Text>
                    <Text style={styles.subtitle}>{i18n.t('plan.subtitle')}</Text>
                </View>
                
                <View style={styles.currencyToggle}>
                    <Pressable onPress={() => setCurrency('MXN')} style={[styles.toggleButton, currency === 'MXN' && styles.toggleButtonActive]}>
                        <Text style={[styles.toggleButtonText, currency === 'MXN' && styles.toggleButtonTextActive]}>MXN</Text>
                    </Pressable>
                    <Pressable onPress={() => setCurrency('USD')} style={[styles.toggleButton, currency === 'USD' && styles.toggleButtonActive]}>
                         <Text style={[styles.toggleButtonText, currency === 'USD' && styles.toggleButtonTextActive]}>USD</Text>
                    </Pressable>
                </View>

                <View style={[styles.plansContainer, isLargeScreen && styles.plansContainerLarge]}>
                    {plans.map((plan) => {
                        const isSelected = plan.id === selectedPlanId;
                        return (
                            <Pressable key={plan.id} onPress={() => setSelectedPlanId(plan.id)} style={[isLargeScreen && styles.planPressableLarge]}>
                                <View style={[
                                    styles.planContainer,
                                    isLargeScreen && styles.planContainerLarge,
                                    isSelected && styles.selectedPlan,
                                    isSelected && { borderColor: theme.primaryColor },
                                    plan.recommended && styles.recommendedPlan
                                ]}>
                                    {plan.recommended && (
                                        <View style={[styles.recommendedBadge, { backgroundColor: theme.primaryColor }]}>
                                            <Text style={styles.recommendedText}>{i18n.t('plan.recommended')}</Text>
                                        </View>
                                    )}
                                    
                                    <Text style={[styles.planName, isSelected && styles.selectedPlanText]}>{i18n.t(plan.nameKey)}</Text>
                                    <Text style={[styles.planDescription, isSelected && styles.selectedPlanText]}>{i18n.t(plan.descriptionKey)}</Text>
                                    
                                    <View style={styles.priceContainer}>
                                        <Text style={[styles.price, isSelected && styles.selectedPlanText]}>${plan.prices[currency].toFixed(2)}</Text>
                                        <Text style={[styles.pricePeriod, isSelected && styles.selectedPlanText, {color: '#A0AEC0'}]}>{i18n.t('plan.month')}</Text>
                                    </View>
                                    
                                    <View style={styles.featuresContainer}>
                                        {plan.featuresKeys.map((feature: string) => (
                                            <View key={feature} style={styles.feature}>
                                                <FontAwesome5 name="check" size={14} color={isSelected ? '#FFFFFF' : theme.primaryColor} />
                                                <Text style={[styles.featureText, isSelected && styles.selectedPlanText]}>{i18n.t(feature)}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Pressable 
                                        style={[styles.selectButton, isSelected && { backgroundColor: '#2D3748' }]} 
                                        onPress={() => handleSelectPlan(plan.id)}
                                    >
                                        <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextSelected]}>
                                            {i18n.t('plan.getStarted')}
                                        </Text>
                                    </Pressable>
                                </View>
                            </Pressable>
                        )
                    })}
                </View>
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
    },
    errorText: {
        fontSize: 16,
        color: '#E53E3E',
        textAlign: 'center',
    },
    header: {
        paddingTop: 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 34,
        fontFamily: Fonts.title,
        textAlign: 'center',
        color: '#1A202C',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        color: '#718096',
        marginTop: 10,
    },
    currencyToggle: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
        alignSelf: 'center',
        backgroundColor: '#E2E8F0',
        borderRadius: 20,
        padding: 4,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 18,
    },
    toggleButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    toggleButtonText: {
        fontFamily: Fonts.medium,
        fontSize: 16,
        color: '#4A5568'
    },
    toggleButtonTextActive: {
        color: '#2D3748'
    },
    plansContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    plansContainerLarge: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    planPressableLarge: {
        width: '31%',
        marginHorizontal: 10,
    },
    planContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 30,
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        position: 'relative',
        overflow: 'hidden'
    },
    planContainerLarge: {
    },
    selectedPlan: {
        backgroundColor: '#2D3748',
    },
    selectedPlanText: {
        color: '#FFFFFF'
    },
    recommendedPlan: {
    },
    recommendedBadge: {
        position: 'absolute',
        top: 20,
        right: -30,
        paddingHorizontal: 40,
        paddingVertical: 6,
        transform: [{ rotate: '45deg' }],
    },
    recommendedText: {
        color: 'white',
        fontSize: 10,
        fontFamily: Fonts.bold,
        textAlign: 'center',
    },
    planName: {
        fontSize: 26,
        fontFamily: Fonts.bold,
        color: '#2D3748',
        textAlign: 'center',
        marginBottom: 12,
    },
    planDescription: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 25,
        minHeight: 45,
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'baseline',
        marginBottom: 30,
    },
    price: {
        fontSize: 48,
        fontFamily: Fonts.title,
        color: '#1A202C',
    },
    pricePeriod: {
        fontSize: 16,
        fontFamily: Fonts.medium,
        color: '#A0AEC0',
        marginLeft: 4,
    },
    featuresContainer: {
        marginBottom: 30,
        alignSelf: 'center'
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    featureText: {
        marginLeft: 12,
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: '#4A5568',
    },
    selectButton: {
        backgroundColor: '#EDF2F7',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent'
    },
    selectButtonSelected: {
        backgroundColor: '#4A5568',
    },
    selectButtonText: {
        color: '#2D3748',
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
    selectButtonTextSelected: {
        color: '#FFFFFF',
    }
});
