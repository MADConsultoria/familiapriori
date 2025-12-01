import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase.js';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signErr) throw new Error(signErr.message || 'Falha no login');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setInfo('');
    const targetEmail = email.trim();
    if (!targetEmail) {
      setError('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    try {
      await apiFetch('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail }),
      });
      setInfo('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o link de recuperação.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg auth-page-bg">
      <main className="flex-1 py-10 px-6">
        <div className="max-w-md mx-auto p-6 rounded-lg surface">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#09344b' }}>Bem-vindo de volta</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Informe seu email e senha para continuar.</p>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm">
              {info}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>E-mail</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 rounded-lg font-semibold"
                style={{ background: '#d8ad5e', color: '#09344b' }}
              >
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="w-full px-4 py-2 rounded-lg font-semibold border"
                style={{ borderColor: '#d8ad5e', color: '#09344b' }}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
