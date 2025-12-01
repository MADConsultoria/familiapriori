import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase.js';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data?.session) {
        setError('Link inválido ou expirado. Solicite uma nova recuperação de senha.');
      }
      setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setError('');
    setSuccess('');
    if (!password || password.length < 6) {
      setError('Informe uma nova senha com ao menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação precisa ser igual à nova senha.');
      return;
    }
    try {
      setSubmitting(true);
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw new Error(updErr.message || 'Não foi possível atualizar a senha.');
      setSuccess('Senha atualizada com sucesso! Você já pode entrar com a nova senha.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Falha ao redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg auth-page-bg">
      <main className="flex-1 py-10 px-6">
        <div className="max-w-md mx-auto p-6 rounded-lg surface">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#09344b' }}>Redefinir senha</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>
            Escolha uma nova senha para a sua conta.
          </p>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm">
              {success}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Nova senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready || submitting}
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Confirme a nova senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!ready || submitting}
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
              />
            </div>
            <button
              type="submit"
              disabled={!ready || submitting}
              className="w-full px-4 py-2 rounded-lg font-semibold"
              style={{ background: '#d8ad5e', color: '#09344b' }}
            >
              {submitting ? 'Salvando...' : 'Atualizar senha'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ResetPasswordPage;
