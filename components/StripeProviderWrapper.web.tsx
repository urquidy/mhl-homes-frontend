import React from 'react';

// On web, we don't need the native provider from @stripe/stripe-react-native,
// especially for a redirect-to-checkout flow which is handled by the browser.
// This empty wrapper prevents native-only code from being bundled into the web app.
export default function StripeProviderWrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
