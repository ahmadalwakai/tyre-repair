import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { router, Link } from 'expo-router';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { useSession } from '@/components/auth/SessionProvider';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const loginLogo = require('../../assets/images/tyrerepair-login-logo.png') as number;
const loginSuccessSound = require('../../assets/sounds/login-success.mp3') as number;

async function playLoginSuccessSound(): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(loginSuccessSound, {
      shouldPlay: true,
      volume: 1.0,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    // best-effort — never block login
  }
}

export default function LoginScreen(): React.JSX.Element {
  const { signIn } = useSession();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (): Promise<void> => {
    if (loading) return;
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim().toLowerCase(), password);
      await signIn(res.token, res.admin);
      void playLoginSuccessSound();
      router.replace('/(tabs)/today');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Logo sized to roughly one-third of the original full-screen hero.
  const logoSize = Math.min(Math.round(width / 1.5), 320);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={loginLogo}
            resizeMode="contain"
            style={{ width: logoSize, height: logoSize, marginBottom: 24 }}
            accessibilityLabel="TyreRepair UK"
          />

          <View style={{ width: '100%', maxWidth: 420, padding: 16 }}>
            <Text
              style={{
                color: '#D4AF37',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: 1,
                marginBottom: 14,
              }}
            >
              ADMIN LOGIN
            </Text>

            <View style={{ gap: 12 }}>
              <GoldInput
                label="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="admin@tyrerepair.uk"
              />
              <GoldInput
                label="Password"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />

              <View style={{ alignItems: 'flex-end' }}>
                <Link href="/forgot-password" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={{ color: '#D4AF37', fontSize: 13 }}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </Link>
              </View>

              {error ? (
                <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
              ) : null}

              <GoldButton
                label={loading ? 'Signing in…' : 'Sign in'}
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
