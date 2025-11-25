import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';
import { formatBRL, formatCPF, formatPhone } from '../lib/format.js';

function DashboardPage() {
  const { session, token, user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!session || !token) return;
    let active = true;
    async function load() {
      setLoadingData(true);
      setError('');
      try {
        const [me, refs] = await Promise.all([
          apiFetch('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch('/api/referrals', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!active) return;
        setProfile(me.profile);
        setReferrals(refs.data || []);
      } catch (err) {
        if (active) setError(err.message || 'Falha ao carregar dados');
      } finally {
        if (active) setLoadingData(false);
      }
    }
    load();
    return () => { active = false; };
  }, [session, token]);

  const PER_PAGE = 10;
  const counts = useMemo(() => {
    const total = referrals.length;
    const purchased = referrals.filter((r) => r.has_purchased || r.hasPurchased).length;
    return { total, purchased };
  }, [referrals]);

  useEffect(() => {
    setPage((prev) => {
      const totalPages = Math.max(1, Math.ceil(referrals.length / PER_PAGE));
      return Math.min(prev, totalPages);
    });
  }, [referrals]);

  const totalPages = Math.max(1, Math.ceil(referrals.length / PER_PAGE));
  const paginatedReferrals = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return referrals.slice(start, start + PER_PAGE);
  }, [referrals, page]);

  const referralLink = useMemo(() => {
    if (!profile?.referral_code) return '';
    const url = new URL('/register', window.location.origin);
    url.searchParams.set('ref', profile.referral_code);
    return url.toString();
  }, [profile]);

  const formatUsedDate = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
      return '';
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    const shareMessage = [
      'Lembrei de você!  Faço parte de um *grupo de viagem incrível*, a Priori Travel! Consegui um bônus para presentear algumas pessoas.. Seria incrível você ir com a gente na próxima viagem. Para e *resgatar o seu presente*, é só clicar no link abaixo e se inscrever:',
      '',
      referralLink,
    ].join('\n');

    const copyFallback = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
        return true;
      }
      if (fallbackCopy(shareMessage)) return true;
      return false;
    };

    try {
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
      if (isMobile && navigator.share) {
        try {
          await navigator.share({ text: shareMessage });
          setToast('Mensagem pronta para envio!');
          setTimeout(() => setToast(''), 2500);
          return;
        } catch (shareErr) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      const copied = await copyFallback();
      if (!copied) throw new Error('copy-failed');
      setToast('Mensagem copiada!');
      setTimeout(() => setToast(''), 2500);
    } catch {
      setToast('Não foi possível compartilhar o link');
      setTimeout(() => setToast(''), 2500);
    }
  };

  if (!authLoading && !session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col fixed-page-bg dashboard-page-bg">
      <header className="py-8 px-6 sticky top-0 z-50" style={{ background: '#09344b' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Priori Senior" className="h-12 w-auto" />
            <div>
              <p className="text-xl font-bold" style={{ color: '#d8ad5e' }}>Plataforma de Indicações</p>
              <p className="text-sm" style={{ color: '#f1f5f9' }}>{profile?.name ? `Bem-vindo, ${profile.name}` : 'Carregando perfil...'}</p>
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-lg font-semibold"
            style={{ background: '#e2e8f0', color: '#09344b' }}
            onClick={signOut}
          >
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1 py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {toast && (
            <div className="p-3 rounded text-sm" style={{ background: '#bbf7d0', color: '#166534' }}>
              {toast}
            </div>
          )}
          {error && (
            <div className="p-3 rounded text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {error}
            </div>
          )}
          <section className="p-6 rounded-lg surface">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-2xl font-bold mb-3" style={{ color: '#d8ad5e' }}>
                  Olá viajante, {profile?.name || '-'}!
                </p>
                <p className="text-sm mb-2" style={{ color: '#64748b' }}>Seu ID de Indicação</p>
                <p className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                  {profile?.referral_code || '????????'}
                </p>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                  CPF: <span className="font-mono">{profile?.cpf ? formatCPF(profile.cpf) : '-'}</span>
                  <span className="mx-2">&middot;</span>
                  Email: <span className="font-mono">{user?.email || '-'}</span>
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-6 py-3 rounded-lg font-semibold transition-colors"
                style={{ background: '#d8ad5e', color: '#09344b' }}
              >
                Compartilhar Link
              </button>
            </div>
            <div className="mt-4 p-4 rounded-lg flex items-center gap-3" style={{ background: '#f1f5f9' }}>
              <span className="text-2xl">&#128279;</span>
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-transparent outline-none"
                style={{ color: '#475569' }}
              />
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg surface">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#09344b' }}>Total de Indicações</h3>
              <p className="text-4xl font-bold" style={{ color: '#3b648a' }}>{counts.total}</p>
            </div>
            <div className="p-6 rounded-lg surface">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#09344b' }}>Indicações que Compraram</h3>
              <p className="text-4xl font-bold" style={{ color: '#d8ad5e' }}>{counts.purchased}</p>
            </div>
            <div className="p-6 rounded-lg surface">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#09344b' }}>Cashback</h3>
              <p className="text-4xl font-bold" style={{ color: '#0f766e' }}>{formatBRL(profile?.valor_cashback ?? 0)}</p>
            </div>
          </section>
          <section className="p-6 rounded-lg surface space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#09344b' }}>Todas as Indicações</h2>
            </div>
            {loadingData ? (
              <p className="text-center py-8" style={{ color: '#64748b' }}>Carregando indicações...</p>
            ) : referrals.length === 0 ? (
              <p className="text-center py-8" style={{ color: '#94a3b8' }}>Nenhuma indicação cadastrada.</p>
            ) : (
              <div className="space-y-6">
                {paginatedReferrals.map((ref) => {
                  const valorIndRaw = ref.valor_ind ?? ref.valorInd;
                  const hasValorInd = valorIndRaw !== undefined && valorIndRaw !== null && !Number.isNaN(Number(valorIndRaw));
                  const valorIndFormatted = hasValorInd ? formatBRL(Number(valorIndRaw)) : '';

                  return (
                    <div key={ref.id || ref.email} className="p-3 rounded-lg flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div>
                        <p className="font-semibold" style={{ color: '#09344b' }}>{ref.name || '-'}</p>
                        <p className="text-sm" style={{ color: '#64748b' }}>{ref.email || '-'}</p>
                        {(ref.has_purchased || ref.hasPurchased) && (ref.used_date || hasValorInd) && (
                          <p className="text-xs mt-1" style={{ color: '#475569' }}>
                            {ref.used_date && <span>Válido até {formatUsedDate(ref.used_date)}</span>}
                            {ref.used_date && hasValorInd ? <span> &middot; </span> : null}
                            {hasValorInd && <span>Valor {valorIndFormatted}</span>}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-right" style={{ color: '#475569' }}>
                        <p>{formatPhone(ref.whatsapp)}</p>
                        <span
                          className={`inline-flex mt-1 px-2 py-1 rounded text-xs font-semibold ${ref.has_purchased ? 'text-green-900 bg-green-100' : 'text-amber-900 bg-amber-100'}`}
                        >
                          {ref.has_purchased ? 'Viajante Priori' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded border"
                      style={{ borderColor: '#cbd5e1', color: page === 1 ? '#94a3b8' : '#09344b' }}
                    >
                      Anterior
                    </button>
                    <span style={{ color: '#475569' }}>
                      Página {page} de {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 rounded border"
                      style={{ borderColor: '#cbd5e1', color: page === totalPages ? '#94a3b8' : '#09344b' }}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
