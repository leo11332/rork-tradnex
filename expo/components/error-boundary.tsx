import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { reportCrash } from '@/services/crash-reporter';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('[tradnex] AppErrorBoundary:error', error.message);
    void reportCrash(error, errorInfo.componentStack ?? undefined, 'ErrorBoundary');
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary-screen">
          <View style={styles.card}>
            <Text style={styles.title}>TRADNEX a rencontr{'\u00e9'} un probl{'\u00e8'}me</Text>
            <Text style={styles.body}>Relancez l{'\u2019'}{'\u00e9'}cran pour retrouver vos indicateurs.</Text>
            {this.state.errorMessage ? (
              <Text style={styles.errorDetail} numberOfLines={3}>{this.state.errorMessage}</Text>
            ) : null}
            <Pressable onPress={this.handleRetry} style={styles.button} testID="error-boundary-retry-button">
              <Text style={styles.buttonLabel}>R{'\u00e9'}essayer</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tradnexTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.borderStrong,
    gap: 12,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '700' as const,
  },
  body: {
    color: tradnexTheme.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  errorDetail: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontFamily: 'monospace' as const,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: tradnexTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: tradnexTheme.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
