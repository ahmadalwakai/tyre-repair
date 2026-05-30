import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AdminButton } from '@/components/ui/AdminButton';
import { EmptyIllustration } from '@/components/ui/EmptyIllustration';

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Called whenever the boundary catches — useful for screen-level logging. */
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
}

interface State {
  error: Error | null;
}

/**
 * Screen-level ErrorBoundary. Renders a friendly fallback (illustration +
 * message + retry) and reports the error to Sentry. Reset clears the boundary
 * so a child can re-attempt rendering.
 *
 * Wrap each route's content inside `withScreenBoundary` (or this component
 * directly) so a thrown render error never blanks the whole app.
 */
export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    try {
      Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack ?? '' } } });
    } catch {
      /* sentry not initialised — ignore */
    }
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} onReset={this.reset} />;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }): React.JSX.Element {
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <View style={{ marginBottom: 16 }}>
        <EmptyIllustration kind="offline" size={140} />
      </View>
      <Text className="text-text text-xl font-semibold mb-2 text-center">Something went wrong</Text>
      <Text className="text-text-muted text-center mb-4 max-w-[320px]">
        {error.message || 'An unexpected error occurred while rendering this screen.'}
      </Text>
      <AdminButton label="Try again" variant="primary" size="md" onPress={onReset} />
    </ScrollView>
  );
}

/** HOC: wrap a screen component with the boundary. Convenient for `default export`. */
export function withScreenBoundary<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ScreenErrorBoundary>
      <Component {...props} />
    </ScreenErrorBoundary>
  );
  Wrapped.displayName = `withScreenBoundary(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return Wrapped;
}
