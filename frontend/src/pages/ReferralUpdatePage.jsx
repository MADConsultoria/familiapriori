import { useState } from 'react';
import { apiFetch } from '../lib/api.js';

function ReferralUpdatePage() {
  const [form, setForm] = useState({
    email: '',
    valor_ind: '',
    used_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await apiFetch('/api/admin/referrals/mark-used', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          valor_ind: Number(form.valor_ind),
          used_date: form.used_date,
        }),
      });
      setSuccessMessage('Cashback atualizado com sucesso.');
      setForm({ email: '', valor_ind: '', used_date: '' });
    } catch (err) {
      const msg = err.message || 'Não foi possível atualizar o cashback.';
      if (/já gerou um cashback anteriormente/i.test(msg)) {
        window.alert('Esse usuário já gerou um cashback anteriormente.');
      }
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg auth-page-bg">
      <main className="flex-1 py-10 px-6">
        <div className="max-w-lg mx-auto p-6 rounded-lg surface">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#09344b' }}>Atualizar Cashback</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Informe o e-mail do contato e os dados da compra para gerar o cashback correspondente.</p>
          {errorMessage && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200 text-sm">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm">
              {successMessage}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>E-mail cadastrado</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={handleChange('email')}
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Valor do cashback (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.valor_ind}
                onChange={handleChange('valor_ind')}
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Data de uso</label>
              <input
                type="date"
                required
                value={form.used_date}
                onChange={handleChange('used_date')}
                className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                style={{ borderColor: '#cbd5e1' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg font-semibold"
              style={{ background: '#d8ad5e', color: '#09344b' }}
            >
              {submitting ? 'Atualizando...' : 'Confirmar cashback'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ReferralUpdatePage;
