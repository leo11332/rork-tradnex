import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { tradnexTheme, tradnexFonts } from '@/constants/tradnex-theme';
import { TRADING_SESSIONS, TradingSessionId, SESSION_LABEL_COLORS } from '@/constants/trading-sessions';
import { useTradnex } from '@/providers/tradnex-provider';
import { testSupabaseConnection } from '@/utils/supabase';

type AuthMode = 'login' | 'signup' | 'forgot' | 'session-select';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signInMutation, signUpMutation, resetPasswordMutation, isAuthenticated } = useAuth();
  const { updateSettings } = useTradnex();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedSessions, setSelectedSessions] = useState<TradingSessionId[]>(['newyork']);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('[auth] user authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    void testSupabaseConnection().then((result) => {
      console.log('[auth] connection test:', result);
      if (!result.ok) {
        setConnectionStatus(result.message);
      }
      if (result.debug) {
        setDebugInfo(result.debug);
      }
    });
  }, [logoScale, logoOpacity]);

  const switchMode = useCallback((nextMode: AuthMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuccessMessage('');
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setMode(nextMode);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const isLoading = signInMutation.isPending || signUpMutation.isPending || resetPasswordMutation.isPending;
  const error = signInMutation.error || signUpMutation.error || resetPasswordMutation.error;

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSuccessMessage('');

    try {
      if (mode === 'login') {
        console.log('[auth] attempting sign in...');
        await signInMutation.mutateAsync({ email: email.trim(), password });
        console.log('[auth] sign in succeeded, navigating...');
        router.replace('/(tabs)');
        return;
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setSuccessMessage('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        console.log('[auth] attempting sign up...');
        await signUpMutation.mutateAsync({ email: email.trim(), password });
        console.log('[auth] sign up succeeded, showing session selection...');
        setMode('session-select');
        return;
      } else {
        await resetPasswordMutation.mutateAsync({ email: email.trim() });
        setSuccessMessage('Email de réinitialisation envoyé.');
      }
      setConnectionStatus(null);
    } catch (e: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setConnectionStatus('Impossible de joindre le serveur. Vérifiez votre connexion internet ou réessayez.');
      }
    }
  }, [email, password, mode, signInMutation, signUpMutation, resetPasswordMutation]);

  const toggleSession = useCallback((id: TradingSessionId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSessions((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  }, []);

  const confirmSessions = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings({ tradingSessions: selectedSessions });
    console.log('[auth] sessions selected:', selectedSessions);
    router.replace('/(tabs)');
  }, [selectedSessions, updateSettings]);

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Connexion';
      case 'signup': return 'Créer un compte';
      case 'forgot': return 'Mot de passe oublié';
      case 'session-select': return 'Vos sessions';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Accédez à vos données de performance';
      case 'signup': return 'Commencez votre suivi biométrique';
      case 'forgot': return 'Recevez un lien de réinitialisation';
      case 'session-select': return 'Quelles sessions de trading tradez-vous ?';
    }
  };

  const getButtonLabel = () => {
    if (isLoading) return '';
    switch (mode) {
      case 'login': return 'Se connecter';
      case 'signup': return 'Créer mon compte';
      case 'forgot': return 'Envoyer le lien';
      case 'session-select': return 'Continuer';
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['#020206', '#080A14', '#0A1020']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.glowOrb} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.logoArea, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Image
              source={require('@/assets/images/tradnex-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>TRADNEX</Text>
            <Text style={styles.logoTagline}>Performance biométrique</Text>
          </Animated.View>

          <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>

            {connectionStatus ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{connectionStatus}</Text>
                {debugInfo ? (
                  <Text style={[styles.warningText, { fontSize: 11, marginTop: 6, opacity: 0.7 }]}>{debugInfo}</Text>
                ) : null}
                <Pressable
                  onPress={async () => {
                    setConnectionStatus(null);
                    setDebugInfo(null);
                    const result = await testSupabaseConnection();
                    if (result.debug) setDebugInfo(result.debug);
                    if (!result.ok) {
                      setConnectionStatus(result.message);
                    } else {
                      setConnectionStatus(null);
                      setSuccessMessage('Connexion rétablie !');
                    }
                  }}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : null}

            {error && !connectionStatus ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {error.message.toLowerCase().includes('fetch')
                    ? 'Erreur de connexion au serveur. Vérifiez votre connexion internet.'
                    : error.message}
                </Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {mode === 'session-select' ? (
              <View style={styles.sessionsGroup}>
                {TRADING_SESSIONS.map((session) => {
                  const isActive = selectedSessions.includes(session.id);
                  return (
                    <Pressable
                      key={session.id}
                      style={[styles.sessionCard, isActive && styles.sessionCardActive]}
                      onPress={() => toggleSession(session.id)}
                      testID={`session-${session.id}`}
                    >
                      <View style={styles.sessionCardInner}>
                        <View style={[styles.sessionDot, { backgroundColor: SESSION_LABEL_COLORS[session.id] }]} />
                        <View style={styles.sessionInfo}>
                          <Text style={[styles.sessionName, isActive && styles.sessionNameActive]}>{session.label}</Text>
                          <Text style={styles.sessionHours}>
                            {Math.floor(session.localOpen).toString().padStart(2, '0')}h – {Math.floor(session.localClose).toString().padStart(2, '0')}h
                          </Text>
                        </View>
                      </View>
                      {isActive ? (
                        <View style={styles.sessionCheck}>
                          <Check color={tradnexTheme.accent} size={16} strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
                <Text style={styles.sessionHint}>Sélectionnez au moins une session. Le journal zoomera sur ces plages horaires.</Text>
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Mail color={tradnexTheme.textMuted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor={tradnexTheme.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      testID="auth-email-input"
                    />
                  </View>

                  {mode !== 'forgot' && (
                    <View style={styles.inputWrapper}>
                      <Lock color={tradnexTheme.textMuted} size={18} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Mot de passe"
                        placeholderTextColor={tradnexTheme.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        testID="auth-password-input"
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        hitSlop={12}
                      >
                        {showPassword
                          ? <EyeOff color={tradnexTheme.textMuted} size={18} />
                          : <Eye color={tradnexTheme.textMuted} size={18} />}
                      </Pressable>
                    </View>
                  )}
                </View>

                {mode === 'login' && (
                  <Pressable onPress={() => switchMode('forgot')} style={styles.forgotLink}>
                    <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                  </Pressable>
                )}
              </>
            )}

            <Pressable
              onPress={mode === 'session-select' ? confirmSessions : handleSubmit}
              disabled={mode !== 'session-select' && (isLoading || !email.trim())}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                mode !== 'session-select' && (isLoading || !email.trim()) && styles.submitButtonDisabled,
              ]}
              testID="auth-submit-button"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.submitContent}>
                  <Text style={styles.submitText}>{getButtonLabel()}</Text>
                  <ArrowRight color="#fff" size={18} />
                </View>
              )}
            </Pressable>
          </Animated.View>

          {mode !== 'session-select' ? (
            <View style={styles.switchArea}>
              {mode === 'login' ? (
                <Pressable onPress={() => switchMode('signup')}>
                  <Text style={styles.switchText}>
                    Pas encore de compte ?{' '}
                    <Text style={styles.switchLink}>Créer un compte</Text>
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => switchMode('login')}>
                  <Text style={styles.switchText}>
                    Déjà un compte ?{' '}
                    <Text style={styles.switchLink}>Se connecter</Text>
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020206',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  glowOrb: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(10,132,255,0.06)',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: tradnexTheme.white,
    letterSpacing: 4,
    fontFamily: tradnexFonts.regular,
  },
  logoTagline: {
    fontSize: 13,
    color: tradnexTheme.textMuted,
    marginTop: 4,
    letterSpacing: 1,
    fontFamily: tradnexFonts.regular,
  },
  formCard: {
    backgroundColor: 'rgba(18,19,26,0.85)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: tradnexTheme.white,
    marginBottom: 4,
    fontFamily: tradnexFonts.regular,
  },
  subtitle: {
    fontSize: 14,
    color: tradnexTheme.textSecondary,
    marginBottom: 20,
    fontFamily: tradnexFonts.regular,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  errorText: {
    color: tradnexTheme.danger,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: tradnexFonts.regular,
  },
  successBox: {
    backgroundColor: 'rgba(0,196,140,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,196,140,0.2)',
  },
  successText: {
    color: tradnexTheme.success,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: tradnexFonts.regular,
  },
  inputGroup: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: tradnexTheme.white,
    height: 52,
    fontFamily: tradnexFonts.regular,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 13,
    color: tradnexTheme.accent,
    fontFamily: tradnexFonts.regular,
  },
  submitButton: {
    backgroundColor: tradnexTheme.accent,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    fontFamily: tradnexFonts.regular,
  },
  switchArea: {
    alignItems: 'center',
    marginTop: 28,
  },
  switchText: {
    fontSize: 14,
    color: tradnexTheme.textSecondary,
    fontFamily: tradnexFonts.regular,
  },
  switchLink: {
    color: tradnexTheme.accent,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
  },
  warningBox: {
    backgroundColor: 'rgba(255,159,10,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.25)',
  },
  warningText: {
    color: '#FF9F0A',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: tradnexFonts.regular,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,159,10,0.15)',
  },
  retryText: {
    color: '#FF9F0A',
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
  },
  sessionsGroup: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sessionCardActive: {
    borderColor: 'rgba(10,132,255,0.4)',
    backgroundColor: 'rgba(10,132,255,0.08)',
  },
  sessionCardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  sessionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sessionInfo: {
    gap: 2,
  },
  sessionName: {
    color: tradnexTheme.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: tradnexFonts.regular,
  },
  sessionNameActive: {
    color: tradnexTheme.white,
  },
  sessionHours: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontFamily: tradnexFonts.regular,
  },
  sessionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10,132,255,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sessionHint: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontFamily: tradnexFonts.regular,
  },
});
