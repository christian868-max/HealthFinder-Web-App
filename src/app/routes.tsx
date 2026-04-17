import { createBrowserRouter } from 'react-router';
import { SearchPage } from './components/SearchPage';
import { ResultsPage } from './components/ResultsPage';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppointmentsPage } from './components/AppointmentsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <SearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/results',
    element: (
      <ProtectedRoute>
        <ResultsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/appointments',
    element: (
      <ProtectedRoute>
        <AppointmentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/signin',
    Component: SignInPage,
  },
  {
    path: '/signup',
    Component: SignUpPage,
  },
  {
    path: '*',
    Component: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-gray-600 mb-4">Page not found</p>
          <a href="/" className="text-blue-600 hover:underline">Go to Home</a>
        </div>
      </div>
    ),
  },
]);