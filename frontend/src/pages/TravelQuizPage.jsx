import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

function TravelQuizPage() {
  const [lead, setLead] = useState({ name: '', email: '', phone: '' });
  const [phase, setPhase] = useState('gate');
  const [sessionId, setSessionId] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [whatsappPayload, setWhatsappPayload] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');

  const progress = useMemo(() => {
    const answered = messages.filter((msg) => msg.role === 'user').length;
    return Math.min(totalQuestions, answered);
  }, [messages, totalQuestions]);

  const updateLeadField = (key, value) => {
    setLead((prev) => ({ ...prev, [key]: value }));
  };

  const resetAll = () => {
    setPhase('gate');
    setSessionId('');
    setMessages([]);
    setText('');
    setResult(null);
    setWhatsappPayload(null);
    setProfileImageUrl('');
    setError('');
  };

  const buildProfileImageSvg = (payload, fallbackTitle, fallbackResult) => {
    const brief = payload?.image_brief || {};
    const title = (brief.title || fallbackTitle || 'Seu Perfil de Viajante').slice(0, 80);
    const phrase = (brief.main_phrase || 'Priori Viagens').slice(0, 90);
    const colors = Array.isArray(brief.colors) && brief.colors.length >= 3
      ? brief.colors
      : ['#09344b', '#d8ad5e', '#f8fafc'];
    const visual = (brief.visual_style || 'Conforto, segurança e boas experiências').slice(0, 80);
    const styles = [];
    const summary = payload?.quiz_summary || {};
    if (summary.estilo_predominante) styles.push(`Estilo: ${summary.estilo_predominante}`);
    if (summary.perfil_companhia) styles.push(`Companhia: ${summary.perfil_companhia}`);
    if (summary.janela_viagem) styles.push(`Janela: ${summary.janela_viagem.replaceAll('_', ' ')}`);
    const traits = styles.join(' | ').slice(0, 95) || 'Perfil personalizado a partir do seu quiz';
    const routes = Array.isArray(payload?.recommended_routes) ? payload.recommended_routes : [];
    const routeNames = routes
      .map((route) => String(route?.name || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const destinationsLine = routeNames.length
      ? `Destinos para você: ${routeNames.join(' • ')}`
      : `Destinos sugeridos pelo seu perfil: ${fallbackResult?.title || 'Seleção Priori'}`;
    const profileDesc = (summary.resumo_emocional || fallbackResult?.description || '').slice(0, 120);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${colors[0]}"/>
            <stop offset="55%" stop-color="${colors[1]}"/>
            <stop offset="100%" stop-color="${colors[2]}"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <rect x="55" y="55" width="1090" height="520" rx="26" fill="rgba(255,255,255,0.86)"/>
        <text x="100" y="138" font-family="Arial, sans-serif" font-size="34" fill="#09344b" font-weight="700">Diagnóstico Priori</text>
        <text x="100" y="210" font-family="Arial, sans-serif" font-size="52" fill="#0f172a" font-weight="800">${title}</text>
        <text x="100" y="285" font-family="Arial, sans-serif" font-size="30" fill="#134e4a">${phrase}</text>
        <text x="100" y="350" font-family="Arial, sans-serif" font-size="24" fill="#1e293b">${profileDesc}</text>
        <text x="100" y="402" font-family="Arial, sans-serif" font-size="23" fill="#0f766e">${traits}</text>
        <text x="100" y="458" font-family="Arial, sans-serif" font-size="24" fill="#1e293b">${destinationsLine}</text>
        <text x="100" y="520" font-family="Arial, sans-serif" font-size="22" fill="#334155">${visual}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const handleStart = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const payload = {
        name: lead.name.trim(),
        email: lead.email.trim(),
        phone: lead.phone.trim(),
      };
      const response = await apiFetch('/api/travel-quiz/session', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSessionId(response.sessionId);
      setTotalQuestions(Number(response.totalQuestions) || 6);
      setMessages([{ role: 'assistant', content: response.assistantMessage }]);
      setPhase('chat');
    } catch (err) {
      setError(err.message || 'Nao foi possivel iniciar o quiz.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!text.trim() || !sessionId || sending || phase !== 'chat') return;

    const userMessage = text.trim();
    setText('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    setSending(true);
    try {
      const response = await apiFetch('/api/travel-quiz/message', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: userMessage }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: response.assistantMessage }]);
      if (response.done) {
        setResult(response.result || null);
        setWhatsappPayload(response.whatsappPayload || null);
        const imageUrl = response.profileImageUrl
          || buildProfileImageSvg(response.whatsappPayload, response.result?.title, response.result);
        setProfileImageUrl(imageUrl);
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'Preparei também uma imagem com o seu perfil de viajante:',
          imageUrl,
        }]);
        setPhase('done');
      }
    } catch (err) {
      setError(err.message || 'Falha ao enviar resposta.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg auth-page-bg">
      <header className="py-8 px-6" style={{ background: '#09344b' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Priori Senior" className="h-12 w-auto" />
            <div>
              <p className="text-xl font-bold" style={{ color: '#d8ad5e' }}>Quiz de Perfil de Viajante</p>
              <p className="text-sm" style={{ color: '#f1f5f9' }}>Conversa guiada para descobrir seu estilo ideal de viagem.</p>
            </div>
          </div>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg font-semibold"
            style={{ background: '#e2e8f0', color: '#09344b' }}
          >
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="flex-1 py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && (
            <div className="p-3 rounded text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          {phase === 'gate' && (
            <section className="p-6 rounded-lg surface">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#09344b' }}>Libere seu acesso ao chat</h2>
              <p className="text-sm mb-6" style={{ color: '#64748b' }}>
                Preencha seus dados para iniciar o quiz personalizado de viagens.
              </p>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleStart}>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Nome completo</label>
                  <input
                    type="text"
                    required
                    value={lead.name}
                    onChange={(event) => updateLeadField('name', event.target.value)}
                    className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                    style={{ borderColor: '#cbd5e1' }}
                    placeholder="Ex.: Marina Costa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>E-mail</label>
                  <input
                    type="email"
                    required
                    value={lead.email}
                    onChange={(event) => updateLeadField('email', event.target.value)}
                    className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                    style={{ borderColor: '#cbd5e1' }}
                    placeholder="voce@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#475569' }}>Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={lead.phone}
                    onChange={(event) => updateLeadField('phone', event.target.value)}
                    className="w-full px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                    style={{ borderColor: '#cbd5e1' }}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="md:col-span-2 px-4 py-2 rounded-lg font-semibold"
                  style={{ background: '#d8ad5e', color: '#09344b' }}
                >
                  {sending ? 'Liberando...' : 'Iniciar quiz no chat'}
                </button>
              </form>
            </section>
          )}

          {(phase === 'chat' || phase === 'done') && (
            <section className="p-6 rounded-lg surface">
              <div className="mb-4 p-4 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: '#09344b' }}>Progresso: {progress}/{totalQuestions}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>Responda com naturalidade para um perfil mais preciso.</p>
                </div>
                <div className="mt-3 h-2 rounded-full" style={{ background: '#e2e8f0' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(progress / Math.max(totalQuestions, 1)) * 100}%`, background: '#3b648a' }}
                  />
                </div>
              </div>

              <div
                className="mb-4 rounded-lg p-4"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minHeight: '360px', maxHeight: '460px', overflowY: 'auto' }}
              >
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`mb-3 max-w-[88%] px-4 py-3 rounded-lg text-sm ${message.role === 'assistant' ? '' : 'ml-auto'}`}
                    style={message.role === 'assistant'
                      ? { background: '#ffffff', border: '1px solid #dbe3ec', color: '#1e293b' }
                      : { background: '#3b648a', color: '#ffffff' }}
                  >
                    {message.content}
                    {message.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={message.imageUrl}
                          alt="Imagem personalizada do perfil de viajante"
                          className="rounded-lg border"
                          style={{ borderColor: '#cbd5e1', width: '100%', maxWidth: '520px' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="mb-3 max-w-[88%] px-4 py-3 rounded-lg text-sm" style={{ background: '#ffffff', border: '1px solid #dbe3ec', color: '#475569' }}>
                    Agente analisando sua resposta...
                  </div>
                )}
              </div>

              {phase === 'chat' && (
                <form className="flex gap-3" onSubmit={handleSend}>
                  <input
                    type="text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Digite sua resposta..."
                    disabled={sending}
                    required
                    className="flex-1 px-4 py-2 rounded-lg border outline-none focus:border-blue-500"
                    style={{ borderColor: '#cbd5e1' }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="px-5 py-2 rounded-lg font-semibold"
                    style={{ background: '#d8ad5e', color: '#09344b' }}
                  >
                    Enviar
                  </button>
                </form>
              )}

              {phase === 'done' && result && (
                <div className="mt-4 p-4 rounded-lg" style={{ background: '#ecfeff', border: '1px solid #99f6e4' }}>
                  <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#0f766e' }}>Seu resultado</p>
                  <h3 className="mt-1 text-2xl font-bold" style={{ color: '#09344b' }}>{result.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: '#134e4a' }}>{result.description}</p>
                  {Array.isArray(result.tips) && result.tips.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 space-y-1 text-sm" style={{ color: '#134e4a' }}>
                      {result.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  )}
                  {profileImageUrl && (
                    <div className="mt-4">
                      <img
                        src={profileImageUrl}
                        alt="Imagem final do perfil de viajante"
                        className="rounded-lg border"
                        style={{ borderColor: '#cbd5e1', width: '100%', maxWidth: '560px' }}
                      />
                    </div>
                  )}
                  {whatsappPayload?.image_brief && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0f766e' }}>
                        Material visual sugerido
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#134e4a' }}>
                        {whatsappPayload.image_brief.main_phrase || 'Imagem personalizada pronta para envio por WhatsApp.'}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-4 px-4 py-2 rounded-lg font-semibold border"
                    style={{ borderColor: '#0f766e', color: '#0f766e', background: '#ffffff' }}
                  >
                    Refazer quiz
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default TravelQuizPage;
