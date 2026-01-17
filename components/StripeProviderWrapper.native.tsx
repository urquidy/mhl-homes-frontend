import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

export default function StripeProviderWrapper({ children }: { children: React.ReactNode }) {
    // The publishable key from your Stripe dashboard.
    // It is recommended to load this from environment variables.
    const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!stripePublishableKey) {
        // You can return a loading state or an error message if the key is not available
        console.warn("Stripe publishable key is not set. Payments will not work.");
        return <>{children}</>;
    }

    return (
        <StripeProvider
            publishableKey={stripePublishableKey}
            // You can add other props here like merchantIdentifier for Apple Pay
        >
            {children}
        </StripeProvider>
    );
}
