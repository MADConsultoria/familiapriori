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
  const [showRepeatPrompt, setShowRepeatPrompt] = useState(false);
  const [showShareStep, setShowShareStep] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [savedAffiliate, setSavedAffiliate] = useState({
    affiliateName: '',
    affiliatePhone: '',
  });
  const [lastReferral, setLastReferral] = useState({
    referralName: '',
  });

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

      setSavedAffiliate({
        affiliateName: form.affiliateName,
        affiliatePhone: form.affiliatePhone,
      });
      setLastReferral({
        referralName: form.referralName,
      });
      setShowRepeatPrompt(true);
      setShowShareStep(false);
      setCopyStatus('');
    } catch (err) {
      setError(err.message || 'Nao foi possivel enviar sua indicacao.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepeatYes = () => {
    setForm({
      affiliateName: savedAffiliate.affiliateName,
      affiliatePhone: savedAffiliate.affiliatePhone,
      referralName: '',
      referralPhone: '',
    });
    setShowRepeatPrompt(false);
    setShowShareStep(false);
    setError('');
    setCopyStatus('');
  };

  const handleRepeatNo = () => {
    setShowRepeatPrompt(false);
    setShowShareStep(true);
  };

  const shareMessage = [
    `Oi ${lastReferral.referralName || 'tudo bem'}!`,
    'Te indiquei para a equipe da Priori Senior Travel.',
    'Eles vao entrar em contato com voce em breve.',
    '',
    `Nome de quem indicou: ${savedAffiliate.affiliateName || '-'}`,
    `WhatsApp de quem indicou: ${savedAffiliate.affiliatePhone || '-'}`,
  ].join('\n');

  const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
  const canNativeShare = isMobileDevice && typeof navigator.share === 'function';

  const handleCopyMessage = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareMessage;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyStatus('Mensagem copiada.');
    } catch {
      setCopyStatus('Nao foi possivel copiar.');
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({ text: shareMessage });
      setCopyStatus('Mensagem compartilhada.');
    } catch {
      setCopyStatus('');
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
            <h1 className="eu-indico-title">Indique um amigo</h1>
            <p className="eu-indico-subtitle">Preencha os dados e nossa equipe entra em contato.</p>

            {showRepeatPrompt && (
              <div className="eu-indico-success" role="status">
                <p className="eu-indico-success-title">Indicacao enviada com sucesso.</p>
                <p className="eu-indico-success-question">Deseja fazer uma nova indicacao?</p>
                <div className="eu-indico-success-actions">
                  <button type="button" className="eu-indico-secondary-button" onClick={handleRepeatYes}>Sim</button>
                  <button type="button" className="eu-indico-secondary-button" onClick={handleRepeatNo}>Nao</button>
                </div>
              </div>
            )}

            {showShareStep && (
              <div className="eu-indico-share-step" role="status">
                <h2 className="eu-indico-share-title">Nao deixe de avisar o seu amigo que iremos entrar em contato com ele...</h2>
                <p className="eu-indico-share-subtitle">Para te ajudar, compartilhe essa mensagem abaixo:</p>

                <div className="eu-indico-whatsapp-bubble">
                  <pre>{shareMessage}</pre>
                </div>

                <div className="eu-indico-share-actions">
                  <button type="button" className="eu-indico-secondary-button" onClick={handleCopyMessage}>Copiar texto</button>
                  {canNativeShare && (
                    <button type="button" className="eu-indico-secondary-button" onClick={handleNativeShare}>Compartilhar</button>
                  )}
                </div>

                {copyStatus && (
                  <p className="eu-indico-share-feedback">{copyStatus}</p>
                )}
              </div>
            )}

            {error && (
              <div className="eu-indico-error" role="alert">
                {error}
              </div>
            )}

            {!showShareStep && (
              <form className="eu-indico-form" onSubmit={handleSubmit}>
              <label className="eu-indico-label" htmlFor="affiliateName">Seu nome</label>
              <input
                id="affiliateName"
                className="eu-indico-input"
                value={form.affiliateName}
                onChange={(event) => updateField('affiliateName', event.target.value)}
                required
              />

              <label className="eu-indico-label" htmlFor="affiliatePhone">Seu WhatsApp</label>
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
            )}
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
