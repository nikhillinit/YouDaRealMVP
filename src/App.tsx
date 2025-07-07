import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './components/MVP/ErrorBoundary';
import { FinancialErrorBoundary } from './components/MVP/FinancialErrorBoundary';
import { LoadingScreen } from './components/common/LoadingScreen';
import { AppProvider } from './contexts/AppContext';
import { Toaster } from 'react-hot-toast';

// Lazy load main routes for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FundSetup = lazy(() => import('./pages/FundSetup'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Reports = lazy(() => import('./pages/Reports'));

/**
 * Production-grade app wrapper with comprehensive error handling
 * and performance optimizations
 */
export default function App() {
  return (
    <ErrorBoundary
      fallback={<AppErrorFallback />}
      onError={(error, errorInfo) => {
        // Log to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          console.error('App Error:', error, errorInfo);
          // TODO: Send to Sentry/LogRocket
        }
      }}
    >
      <AppProvider>
        <FinancialErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            <AppRouter />
          </Suspense>
        </FinancialErrorBoundary>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AppProvider>
    </ErrorBoundary>
  );
}

/**
 * Main app router
 */
function AppRouter() {
  // Simple client-side routing
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Route mapping
  const getComponent = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard':
        return <Dashboard navigate={navigate} />;
      case '/setup':
        return <FundSetup navigate={navigate} />;
      case '/scenarios':
        return <Scenarios navigate={navigate} />;
      case '/portfolio':
        return <Portfolio navigate={navigate} />;
      case '/reports':
        return <Reports navigate={navigate} />;
      default:
        return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPath={currentPath} navigate={navigate} />
      <main className="container mx-auto px-4 py-8">
        {getComponent()}
      </main>
    </div>
  );
}

/**
 * Navigation component
 */
function Navigation({ currentPath, navigate }: { currentPath: string; navigate: (path: string) => void }) {
  const links = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/setup', label: 'Fund Setup', icon: '⚙️' },
    { path: '/scenarios', label: 'Scenarios', icon: '🔀' },
    { path: '/portfolio', label: 'Portfolio', icon: '💼' },
    { path: '/reports', label: 'Reports', icon: '📄' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">POVC Fund Model</h1>
          </div>
          <div className="flex space-x-4">
            {links.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPath === link.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

/**
 * Error fallback component
 */
function AppErrorFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Financial calculation error boundary
 */
function FinancialErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Calculation Error</h3>
          <p className="text-red-600 mt-1">
            There was an error in the financial calculations. Please check your inputs and try again.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Loading screen component
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}