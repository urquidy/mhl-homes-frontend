import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Button, StyleSheet, Pressable } from 'react-native';
import * as Updates from 'expo-updates';
import { Feather } from '@expo/vector-icons';
import i18n from '../constants/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an external service here
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.error("Failed to reload app:", e);
      // Fallback for web or when updates are disabled
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Feather name="alert-triangle" size={48} color="#E53E3E" />
          <Text style={styles.title}>{i18n.t('errors.unexpectedErrorTitle')}</Text>
          <Text style={styles.message}>
            {i18n.t('errors.unexpectedErrorMessage')}
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.devErrorContainer}>
              <Text style={styles.devErrorText}>{this.state.error.toString()}</Text>
            </View>
          )}

          <Pressable style={styles.reloadButton} onPress={this.handleReload}>
            <Text style={styles.reloadButtonText}>{i18n.t('errors.reloadApp')}</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFF'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A202C',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: '#4A5568',
        textAlign: 'center',
        marginBottom: 24
    },
    reloadButton: {
      backgroundColor: '#3182CE',
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
    },
    reloadButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    devErrorContainer: {
      backgroundColor: '#F7FAFC',
      borderRadius: 8,
      padding: 12,
      marginVertical: 16,
      maxHeight: 150,
    },
    devErrorText: {
      color: '#E53E3E',
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }
});

export default ErrorBoundary;
