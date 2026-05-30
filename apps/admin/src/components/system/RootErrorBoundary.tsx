import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

const CANVAS = '#0B0B0F';
const SURFACE = '#15151B';
const TEXT = '#F5F5F7';
const MUTED = '#A0A0A8';
const ACCENT = '#E30613';

/**
 * App-root error boundary. Renders a fully styled fallback using only React
 * Native primitives so the user never sees a blank white screen, even when
 * NativeWind, providers or asset loading fail. Catches synchronous errors
 * thrown anywhere below it (including provider mount errors).
 */
export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack ?? '' } },
        tags: { boundary: 'root' },
      });
    } catch {
      /* sentry not initialised */
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: CANVAS }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: SURFACE,
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: '#2A2A33',
            }}
          >
            <Text style={{ color: TEXT, fontSize: 20, fontWeight: '600', marginBottom: 8 }}>
              The app hit an unexpected error
            </Text>
            <Text style={{ color: MUTED, marginBottom: 16, lineHeight: 20 }}>
              Tap Try again to reload the screen. If it keeps happening, close the app from
              recents and reopen.
            </Text>
            <Pressable
              onPress={this.reset}
              style={{
                backgroundColor: ACCENT,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: TEXT, fontWeight: '600' }}>Try again</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }
}
