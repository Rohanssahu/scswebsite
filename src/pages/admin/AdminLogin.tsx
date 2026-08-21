// Route 1 — /admin/login
//
// The browser holds no credential logic: it posts the pair to Supabase Auth,
// then the database decides whether this account is staff. A signed-in account
// without an active admin_users row is signed straight back out by
// signInAdmin() before this component ever renders dashboard chrome.

import { useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AdminLoginCard from '@/components/admin/AdminLoginCard';
import { useAdminHead } from '@/components/admin/AdminLayout';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { AdminAuthError, signInAdmin } from '@/services/admin/adminAuth';
import {
  ADMIN_SIGN_IN_MESSAGES,
  returnPathFromSearch,
} from '@/services/admin/adminAuthCore';

const AdminLogin = () => {
  const { status, notice, setNotice, refresh } = useAdminAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Second line of defence against a double submit (Enter + click, fast taps).
  const inFlight = useRef(false);

  useAdminHead('Owner Dashboard sign-in · SCS Softwares');

  if (status === 'authorized') {
    return <Navigate to={returnPathFromSearch(location.search)} replace />;
  }

  const handleSubmit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      await signInAdmin(email, password);
      // The provider re-verifies membership and flips status to `authorized`,
      // which renders the <Navigate> above. No manual navigation, no loop.
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof AdminAuthError ? error.message : ADMIN_SIGN_IN_MESSAGES.unknown,
      );
      setPassword('');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AdminLoginCard
      email={email}
      password={password}
      showPassword={showPassword}
      submitting={submitting}
      errorMessage={errorMessage}
      notice={errorMessage ? null : notice}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePassword={() => setShowPassword((value) => !value)}
      onSubmit={() => void handleSubmit()}
    />
  );
};

export default AdminLogin;
