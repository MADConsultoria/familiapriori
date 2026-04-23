import { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import './direct-referral.css';

const INITIAL_FORM = {
  affiliateName: '',
  affiliatePhone: '',
  referralName: '',
  referralPhone: '',
};

function onlyDigits(value = '') {
  return String(value).replace(/\D+/g, '');
}

function formatPhone(value = '') {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function DirectReferralPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const updateField = (key, value) => {
    if (key.toLowerCase().includes('phone')) {
      setForm((prev) => ({ ...prev, [key]: formatPhone(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await apiFetch('/api/public/direct-referral', {
        method: 'POST',
        body: JSON.stringify({
          affiliate_name: form.affiliateName.trim(),
          affiliate_phone: onlyDigits(form.affiliatePhone),
          referral_name: form.referralName.trim(),
          referral_phone: onlyDigits(form.referralPhone),
        }),
      });

      setSuccess(true);
      setForm(INITIAL_FORM);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'Nao foi possivel enviar sua indicacao.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="eu-indico-page">
      <main className="eu-indico-main">
        <section className="eu-indico-hero" aria-hidden="true">
          <div className="eu-indico-overlay" />
          <div className="eu-indico-brand">
            <img className="eu-indico-logo" src="/logo.png" alt="Priori Senior Travel" />
          </div>
        </section>

        <section className="eu-indico-form-area">
          <div className="eu-indico-form-wrapper">
            <h1 className="eu-indico-title">Formulario para Indicacao</h1>
            <p className="eu-indico-subtitle">Preencha os dados e nossa equipe entra em contato.</p>

            {success && (
              <div className="eu-indico-success" role="status">
                Indicacao enviada com sucesso.
              </div>
            )}

            {error && (
              <div className="eu-indico-error" role="alert">
                {error}
              </div>
            )}

            <form className="eu-indico-form" onSubmit={handleSubmit}>
              <label className="eu-indico-label" htmlFor="affiliateName">Nome do afiliado Priori Travel</label>
              <input
                id="affiliateName"
                className="eu-indico-input"
                value={form.affiliateName}
                onChange={(event) => updateField('affiliateName', event.target.value)}
                required
              />

              <label className="eu-indico-label" htmlFor="affiliatePhone">Telefone do afiliado</label>
              <input
                id="affiliatePhone"
                className="eu-indico-input"
                value={form.affiliatePhone}
                onChange={(event) => updateField('affiliatePhone', event.target.value)}
                inputMode="numeric"
                required
              />

              <label className="eu-indico-label" htmlFor="referralName">Nome do indicado</label>
              <input
                id="referralName"
                className="eu-indico-input"
                value={form.referralName}
                onChange={(event) => updateField('referralName', event.target.value)}
                required
              />

              <label className="eu-indico-label" htmlFor="referralPhone">Telefone do indicado</label>
              <input
                id="referralPhone"
                className="eu-indico-input"
                value={form.referralPhone}
                onChange={(event) => updateField('referralPhone', event.target.value)}
                inputMode="numeric"
                required
              />

              <button className="eu-indico-button" type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar indicacao'}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="eu-indico-footer">
        <span>contato@priorisenior.com.br</span>
        <span>+55 (11) 97166-7700</span>
      </footer>
    </div>
  );
}
