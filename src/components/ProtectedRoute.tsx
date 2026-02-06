import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, isApproved } = useAuth();
  const location = useLocation();

  // Not logged in - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not approved - show message
  if (!isApproved) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-2xl font-bold text-yellow-900 mb-4">Access Pending</h2>
        <p className="text-yellow-800 mb-4">
          Your account ({currentUser.email}) is not authorized to edit songs.
        </p>
        <p className="text-yellow-700 text-sm">
          Please contact the administrator to request editing access.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          ← Back to Songs
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
