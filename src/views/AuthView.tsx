/**
 * Authentication View (v4.0.1: Auth Logic Fix)
 * 
 * Clean, centered authentication card with email magic link and Google sign-in.
 * Uses Supabase directly with proper redirect configuration.
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, LogIn } from 'lucide-react';

export function AuthView() {
  const { signInAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sentState, setSentState] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setSentState(false);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }, // CRITICAL FIX
      });
      setLoading(false);
      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to send magic link' });
        setSentState(false);
      } else {
        setSentState(true); // Show "Check Email" screen
        setEmail('');
      }
    } catch (err) {
      setLoading(false);
      const errorText = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessage({
        type: 'error',
        text: errorText,
      });
      setSentState(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }, // CRITICAL FIX
      });
      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to sign in with Google' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-primary, #f8fafc)',
        padding: '2rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '3rem 2.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1
            style={{
              margin: 0,
              marginBottom: '0.5rem',
              fontSize: '1.875rem',
              fontWeight: 700,
              color: 'var(--text-primary, #1e293b)',
            }}
          >
            Hospitality Financial Modeler
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #64748b)',
              fontWeight: 500,
            }}
          >
            Enterprise Edition
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: 'var(--radius, 8px)',
              backgroundColor:
                message.type === 'success'
                  ? 'var(--success-bg, #d1fae5)'
                  : 'var(--error-bg, #fee2e2)',
              color:
                message.type === 'success'
                  ? 'var(--success-text, #065f46)'
                  : 'var(--error-text, #991b1b)',
              fontSize: '0.875rem',
              border: `1px solid ${
                message.type === 'success'
                  ? 'var(--success-border, #a7f3d0)'
                  : 'var(--error-border, #fecaca)'
              }`,
              whiteSpace: 'pre-line', // Preserve line breaks for multi-line error messages
            }}
          >
            {message.text}
          </div>
        )}

        {/* Email Sent State - Show prominent message instead of form */}
        {sentState && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}
            >
              ✉️
            </div>
            <h2
              style={{
                margin: 0,
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--text-primary, #1e293b)',
              }}
            >
              Magic Link Sent!
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #64748b)',
                lineHeight: '1.5',
              }}
            >
              Check your email on this device to log in.
            </p>
            <button
              type="button"
              onClick={() => {
                setSentState(false);
                setMessage(null);
                setEmail('');
              }}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: 'var(--primary, #2196F3)',
                border: '1px solid var(--primary, #2196F3)',
                borderRadius: 'var(--radius, 8px)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary, #2196F3)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--primary, #2196F3)';
              }}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* Email Magic Link Form - Hide when email is sent */}
        {!sentState && (
          <form onSubmit={handleEmailLogin} style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-primary, #1e293b)',
            }}
          >
            Email Address
          </label>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Mail
              size={20}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary, #64748b)',
              }}
            />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                border: '1px solid var(--border-soft, #e2e8f0)',
                borderRadius: 'var(--radius, 8px)',
                fontSize: '1rem',
                backgroundColor: 'var(--surface, white)',
                color: 'var(--text-primary, #1e293b)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary, #2196F3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-soft, #e2e8f0)';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: loading || !email ? 'var(--surface-hover, #f1f5f9)' : 'var(--primary, #2196F3)',
              color: loading || !email ? 'var(--text-secondary, #64748b)' : 'white',
              border: 'none',
              borderRadius: 'var(--radius, 8px)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading || !email ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading && email) {
                e.currentTarget.style.backgroundColor = 'var(--primary-hover, #1976D2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && email) {
                e.currentTarget.style.backgroundColor = 'var(--primary, #2196F3)';
              }
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Sending...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In with Email
              </>
            )}
          </button>
        </form>
        )}

        {/* Divider - Hide when email is sent */}
        {!sentState && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              backgroundColor: 'var(--border-soft, #e2e8f0)',
            }}
          />
          <span
            style={{
              padding: '0 1rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #64748b)',
            }}
          >
            OR
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              backgroundColor: 'var(--border-soft, #e2e8f0)',
            }}
          />
        </div>
        )}

        {/* Google Sign In - Hide when email is sent */}
        {!sentState && (
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--surface, white)',
            color: 'var(--text-primary, #1e293b)',
            border: '1px solid var(--border-soft, #e2e8f0)',
            borderRadius: 'var(--radius, 8px)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f8fafc)';
              e.currentTarget.style.borderColor = 'var(--border, #cbd5e1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = 'var(--surface, white)';
              e.currentTarget.style.borderColor = 'var(--border-soft, #e2e8f0)';
            }
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Signing in...
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                style={{ marginRight: '0.25rem' }}
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign In with Google
            </>
          )}
        </button>
        )}

        {/* Guest Access - Hide when email is sent */}
        {!sentState && (
          <>
            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: 'var(--border-soft, #e2e8f0)',
                }}
              />
              <span
                style={{
                  padding: '0 1rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #64748b)',
                }}
              >
                OR
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: 'var(--border-soft, #e2e8f0)',
                }}
              />
            </div>

            {/* Enter as Guest Button */}
            <button
              type="button"
              onClick={signInAsGuest}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary, #64748b)',
                border: '1px solid var(--border-soft, #e2e8f0)',
                borderRadius: 'var(--radius, 8px)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f8fafc)';
                  e.currentTarget.style.borderColor = 'var(--border, #cbd5e1)';
                  e.currentTarget.style.color = 'var(--text-primary, #1e293b)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-soft, #e2e8f0)';
                  e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
                }
              }}
            >
              Continue as Guest (Demo Mode)
            </button>
          </>
        )}

        <p
          style={{
            marginTop: '1.5rem',
            marginBottom: 0,
            fontSize: '0.75rem',
            color: 'var(--text-secondary, #64748b)',
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Spinner Animation */}
      <style>
        {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

