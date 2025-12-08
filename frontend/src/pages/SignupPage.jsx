import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase.js';
import { apiFetch } from '../lib/api.js';
import { formatCPF, formatPhone, normalizeCPF, formatBirthDateInput } from '../lib/format.js';

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    whatsapp: '',
    cpf: '',
    data_nasc: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, sanitizer) => (event) => {
    const raw = event.target.value;
    const nextValue = typeof sanitizer === 'function' ? sanitizer(raw) : raw;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const maskedCpf = useMemo(() => formatCPF(form.cpf), [form.cpf]);
  const maskedPhone = useMemo(() => formatPhone(form.whatsapp), [form.whatsapp]);
  const sanitizeCpf = (value) => value.replace(/\D+/g, '').slice(0, 11);
  const sanitizePhone = (value) => value.replace(/\D+/g, '').slice(0, 11);
  const sanitizeBirthDate = (value) => formatBirthDateInput(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        cpf: normalizeCPF(form.cpf),
        ref: new URLSearchParams(window.location.search).get('ref') || '',
      };
      const data = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data?.access_token && data?.refresh_token && supabase) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Falha ao criar conta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg auth-page-bg">
      <main className="flex-1 py-10 px-6">
        <div className="max-w-md mx-auto p-6 rounded-lg surface">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#09344b' }}>Comece agora</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Crie sua conta para indicar e acompanhar resultados.</p>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Nome</label>
              <input className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={form.name} onChange={handleChange('name')} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>CPF</label>
              <input className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={maskedCpf} onChange={handleChange('cpf', sanitizeCpf)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Email</label>
              <input type="email" className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={form.email} onChange={handleChange('email')} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Data de nascimento</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
                required
                value={form.data_nasc}
                onChange={handleChange('data_nasc', sanitizeBirthDate)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Senha</label>
              <input type="password" minLength={6} className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={form.password} onChange={handleChange('password')} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>WhatsApp</label>
              <input className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={maskedPhone} onChange={handleChange('whatsapp', sanitizePhone)} />
            </div>
            <button type="submit" disabled={submitting} className="w-full px-4 py-2 rounded-lg font-semibold" style={{ background: '#d8ad5e', color: '#09344b' }}>
              {submitting ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
          <div className="text-sm mt-6" style={{ color: '#475569' }}>
            Já possui conta?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#3b648a' }}>Entrar</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RegisterPage;
