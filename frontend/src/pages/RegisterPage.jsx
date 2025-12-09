import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPhone, formatBirthDateInput, isValidBirthDate } from '../lib/format.js';
import { apiFetch } from '../lib/api.js';

function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    data_nasc: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (key, sanitizer) => (event) => {
    const raw = event.target.value;
    const nextValue = typeof sanitizer === 'function' ? sanitizer(raw) : raw;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const maskedPhone = useMemo(() => formatPhone(form.whatsapp), [form.whatsapp]);
  const sanitizePhone = (value) => value.replace(/\D+/g, '').slice(0, 11);
  const sanitizeBirthDate = (value) => formatBirthDateInput(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    if (!isValidBirthDate(form.data_nasc)) {
      setSubmitting(false);
      setError('Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp,
        data_nasc: form.data_nasc,
        ref: new URLSearchParams(window.location.search).get('ref') || '',
      };
      await apiFetch('/api/public/referrals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm({
        name: '',
        email: '',
        whatsapp: '',
        data_nasc: '',
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Não foi possível enviar seus dados. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg auth-page-bg">
      <main className="flex-1 py-10 px-6">
        <div className="max-w-md mx-auto p-6 rounded-lg surface">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#09344b' }}>Garanta seu benefício</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Informe seus dados para resgatar o desconto exclusivo.</p>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}
          {success ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-lg" style={{ background: '#ecfdf5', color: '#065f46' }}>
                <p className="font-semibold text-lg">Olá! Que alegria receber você aqui! Em breve você receberá uma mensagens pelo WhatsApp (11) 9 3363-6999 com mais detalhes sobre como resgatar o seu bônus!.</p>
              </div>
              <div className="rounded-lg overflow-hidden shadow">
                <video controls style={{ width: '100%' }}>
                  <source src="/obrigado.mp4" type="video/mp4" />
                  <source src="/obrigado.MOV" type="video/quicktime" />
                  Seu navegador não suporta vídeo HTML5.
                </video>
              </div>
              <a
                href="https://chat.whatsapp.com/BD1MtYOnW8CE7ylITxvsVN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-lg font-semibold"
                style={{ background: '#25d366', color: '#09344b' }}
              >
                Entrar no canal
              </a>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Nome</label>
              <input className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={form.name} onChange={handleChange('name')} />
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
                pattern="\\d{2}/\\d{2}/\\d{4}"
                autoComplete="bday"
                title="Use o formato DD/MM/AAAA"
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
                required
                value={form.data_nasc}
                onChange={handleChange('data_nasc', sanitizeBirthDate)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>WhatsApp</label>
              <input className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500" style={{ borderColor: '#cbd5e1' }} required value={maskedPhone} onChange={handleChange('whatsapp', sanitizePhone)} />
            </div>
              <button type="submit" disabled={submitting} className="w-full px-4 py-2 rounded-lg font-semibold" style={{ background: '#d8ad5e', color: '#09344b' }}>
                {submitting ? 'Enviando...' : 'Resgatar desconto'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default RegisterPage;
