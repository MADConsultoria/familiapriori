import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length) {
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  }));
} else {
  app.use(cors());
}
app.use(express.json());

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_RESET_REDIRECT_URL = process.env.PASSWORD_RESET_REDIRECT_URL;
const REFERRAL_WEBHOOK_URL = process.env.REFERRAL_WEBHOOK_URL || 'https://n8napisecret.priorisenior.com.br/webhook/refferal-familia-priori';
const DIRECT_REFERRAL_WEBHOOK_URL = process.env.DIRECT_REFERRAL_WEBHOOK_URL || 'https://n8npriorisenior.beontech.com.br/webhook/refferal-familia-priori';
const clientOptions = () => ({ auth: { autoRefreshToken: false, persistSession: false } });
const admin = (SUPABASE_URL && SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SERVICE_ROLE, clientOptions())
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST_PATH = path.resolve(__dirname, '../../dist');
const FRONTEND_INDEX_FILE = path.join(FRONTEND_DIST_PATH, 'index.html');
const SERVE_FRONTEND = process.env.SERVE_FRONTEND !== 'false' && fs.existsSync(FRONTEND_INDEX_FILE);

function newServiceClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE, clientOptions());
}

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_MAX_ATTEMPTS = 40;

function randomReferralCode(len = REFERRAL_CODE_LENGTH) {
  return Array.from({ length: len }, () => REFERRAL_CODE_ALPHABET[Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length)]).join('');
}

async function postReferralWebhook(payload, customUrl) {
  const url = (customUrl || REFERRAL_WEBHOOK_URL || '').trim();
  if (!url) return;
  try {
    const fetcher = globalThis.fetch;
    if (typeof fetcher !== 'function') {
      console.warn('referral webhook skipped: fetch API indisponível no runtime');
      return;
    }
    const resp = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.warn('referral webhook responded with non-OK status', resp.status, body);
    }
  } catch (err) {
    console.warn('referral webhook request failed', err);
  }
}

async function generateUniqueReferralCode() {
  if (!admin) throw new Error('Supabase não configurado');
  for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt++) {
    const code = randomReferralCode();
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new Error('Falha ao gerar referral code único após várias tentativas');
}

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api', ts: Date.now() });
});

// Helper: normaliza CPF mantendo apenas dígitos
function onlyDigits(str = '') {
  return String(str).replace(/\D+/g, '');
}

function normalizeBirthDate(value) {
  let str = (value ?? '').toString().trim();
  if (!str) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('/');
    str = `${yyyy}-${mm}-${dd}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const date = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (str > todayStr) return null;
  return str;
}

function normalizeDateInput(value) {
  let str = (value ?? '').toString().trim();
  if (!str) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split('/');
    str = `${yyyy}-${mm}-${dd}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const date = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return str;
}

// Login com CPF: recebe cpf + password, resolve email e faz sign-in
app.post('/api/auth/login-cpf', async (req, res) => {
  try {
    const { cpf, password } = req.body || {};
    const cpfDigits = onlyDigits(cpf);
    if (!cpfDigits || cpfDigits.length !== 11 || !password) {
      return res.status(400).json({ ok: false, error: 'CPF ou senha inválidos' });
    }
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase não configurado no backend' });

    const cpfMasked = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id')
      .or(`cpf.eq.${cpfDigits},cpf.eq.${cpfMasked}`)
      .maybeSingle();
    if (profErr) return res.status(500).json({ ok: false, error: 'Falha ao consultar CPF' });
    if (!profile?.id) return res.status(400).json({ ok: false, error: 'CPF ou senha inválidos' });

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(profile.id);
    if (userErr || !userRes?.user?.email) return res.status(400).json({ ok: false, error: 'CPF ou senha inválidos' });

    const authClient = newServiceClient();
    if (!authClient) return res.status(500).json({ ok: false, error: 'Supabase não configurado no backend' });
    const { data: sessionData, error: signErr } = await authClient.auth.signInWithPassword({
      email: userRes.user.email,
      password,
    });
    if (signErr || !sessionData?.session) return res.status(400).json({ ok: false, error: 'CPF ou senha inválidos' });

    const { access_token, refresh_token } = sessionData.session;
    return res.json({ ok: true, access_token, refresh_token });
  } catch (e) {
    console.error('login-cpf error', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = (email ?? '').toString().trim();
    if (!cleanEmail) {
      return res.status(400).json({ ok: false, error: 'Informe um e-mail válido.' });
    }
    const client = newServiceClient();
    if (!client) return res.status(500).json({ ok: false, error: 'Supabase não configurado' });
    console.log('request-password-reset redirectTo', PASSWORD_RESET_REDIRECT_URL || '(fallback)'); 
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL || undefined,
    });
    if (error) {
      return res.status(400).json({ ok: false, error: error.message || 'Não foi possível enviar o e-mail.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('request-password-reset error', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Cadastro via backend (enforce CPF único + login automático)
app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase não configurado' });
    let { name, email, password, whatsapp, cpf, ref, data_nasc } = req.body || {};
    name = (name ?? '').toString().trim();
    email = (email ?? '').toString().trim();
    whatsapp = (whatsapp ?? '').toString().trim();
    password = (password ?? '').toString();
    const cpfDigits = onlyDigits(cpf);
    const birthDate = normalizeBirthDate(data_nasc);
    if (!name || !email || !password || !whatsapp || cpfDigits.length !== 11 || !birthDate) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos: nome, email, senha, WhatsApp, data de nascimento e CPF (11 dígitos) são obrigatórios' });
    }

    // Verifica CPF já existente (aceita dígitos e máscara)
    const cpfMasked = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const { data: existing, error: existErr } = await admin
      .from('profiles')
      .select('id')
      .or(`cpf.eq.${cpfDigits},cpf.eq.${cpfMasked}`)
      .maybeSingle();
    if (existErr) return res.status(500).json({ ok: false, error: 'Falha ao verificar CPF' });
    if (existing?.id) return res.status(409).json({ ok: false, error: 'CPF já cadastrado' });

    // Cria usuário já confirmado (ajuste se seu projeto exigir confirmação por email)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, whatsapp, cpf: cpfDigits, data_nasc: birthDate }
    });
    if (createErr || !created?.user?.id) {
      return res.status(400).json({ ok: false, error: createErr?.message || 'Falha ao criar usuário' });
    }

    // Garante registro em profiles (sem depender de trigger)
    try {
      const uid = created.user.id;
      // Já existe profile para este usuário?
      const { data: existingProfile, error: profSelErr } = await admin
        .from('profiles')
        .select('id, referral_code, name, whatsapp, cpf, valor_cashback, data_nasc')
        .eq('id', uid)
        .maybeSingle();

      if (!profSelErr && !existingProfile) {
        const referralCode = await generateUniqueReferralCode();
        await admin.from('profiles').insert([{
          id: uid,
          name,
          whatsapp,
          cpf: cpfDigits,
          referral_code: referralCode,
          data_nasc: birthDate,
          valor_cashback: 0,
        }]);
      } else if (existingProfile) {
        // Se já existir (ex.: trigger), garante referral_code e completa dados essenciais
        const patch = {};
        if (!existingProfile.referral_code) patch.referral_code = await generateUniqueReferralCode();
        if (!existingProfile.name && name) patch.name = name;
        if (!existingProfile.whatsapp && whatsapp) patch.whatsapp = whatsapp;
        if (!existingProfile.cpf && cpfDigits) patch.cpf = cpfDigits;
        if (!existingProfile.data_nasc && birthDate) patch.data_nasc = birthDate;
        if (Object.keys(patch).length) {
          await admin.from('profiles').update(patch).eq('id', uid);
        }
      }
    } catch (profErr) {
      console.warn('signup profile insert skipped', profErr);
    }

    // Upsert do próprio usuário como indicado (referrals) — executa independente do login automático
    try {
      let referrerUser = null;
      if (ref) {
        const { data: refProf } = await admin
          .from('profiles')
          .select('id')
          .eq('referral_code', ref)
          .maybeSingle();
        referrerUser = refProf?.id || null;
      }

      const orFilter = `email.eq.${email},cpf.eq.${cpfDigits}`;
      const { data: found } = await admin
        .from('referrals')
        .select('*')
        .or(orFilter)
        .limit(1);
      const existingRef = Array.isArray(found) && found.length ? found[0] : null;

      if (existingRef?.id) {
        const patch = {
          name,
          whatsapp,
        };
        if (!existingRef.cpf && cpfDigits) patch.cpf = cpfDigits;
        if (!existingRef.referrer_code && ref) patch.referrer_code = ref;
        if (!existingRef.referrer_user && referrerUser) patch.referrer_user = referrerUser;
        if (!existingRef.registered_at) patch.registered_at = new Date().toISOString();
        await admin.from('referrals').update(patch).eq('id', existingRef.id);
      } else {
        await admin.from('referrals').insert([{
          name,
          email,
          whatsapp,
          cpf: cpfDigits,
          has_purchased: false,
          referrer_code: ref || null,
          referrer_user: referrerUser,
          registered_at: new Date().toISOString(),
        }]);
      }
    } catch (refErr) {
      console.warn('signup referrals upsert failed', refErr);
    }
    // Login automático para devolver tokens ao front (não bloqueia criação de referrals)
    let access_token, refresh_token;
    try {
      const authClient = newServiceClient();
      if (authClient) {
        const { data: sessionData, error: signErr } = await authClient.auth.signInWithPassword({ email, password });
        if (!signErr && sessionData?.session) {
          access_token = sessionData.session.access_token;
          refresh_token = sessionData.session.refresh_token;
        }
      }
    } catch (e) {
      console.warn('signup post-login failed (non-blocking)', e);
    }

    return res.status(201).json({ ok: true, created: true, access_token, refresh_token });
  } catch (e) {
    console.error('signup error', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Público: captura dados para resgate de desconto (sem login)
app.post('/api/public/referrals', async (req, res) => {
  try {
    const { name, email, whatsapp, data_nasc, ref } = req.body || {};
    const cleanName = (name ?? '').toString().trim();
    const cleanEmail = (email ?? '').toString().trim();
    const cleanPhone = onlyDigits(whatsapp).slice(0, 15);
    const birthDate = normalizeBirthDate(data_nasc);
    if (!cleanName || !cleanEmail || !cleanPhone || !birthDate) {
      return res.status(400).json({ ok: false, error: 'Preencha nome, email, WhatsApp e data de nascimento válidos.' });
    }

    const { data: dup, error: dupErr } = await admin
      .from('referrals')
      .select('id')
      .or(`email.eq.${cleanEmail},whatsapp.eq.${cleanPhone}`)
      .maybeSingle();
    if (dupErr) return res.status(500).json({ ok: false, error: 'Falha ao verificar contatos existentes' });
    if (dup?.id) {
      return res.status(409).json({ ok: false, error: 'Esse email ou WhatsApp já foi cadastrado.' });
    }

    let referrerUser = null;
    let refCode = (ref ?? '').toString().trim();
    if (refCode) {
      const { data: refProf } = await admin
        .from('profiles')
        .select('id, referral_code')
        .ilike('referral_code', refCode)
        .maybeSingle();
      if (refProf?.referral_code) {
        refCode = refProf.referral_code;
        referrerUser = refProf.id;
      }
    } else {
      refCode = null;
    }

    const insertPayload = {
      name: cleanName,
      email: cleanEmail,
      whatsapp: cleanPhone,
      data_nasc: birthDate,
      has_purchased: false,
      referrer_code: refCode,
      referrer_user: referrerUser,
      registered_at: new Date().toISOString(),
    };
    const { error: insertErr } = await admin
      .from('referrals')
      .insert([insertPayload]);
    if (insertErr) return res.status(500).json({ ok: false, error: 'Não foi possível registrar seu pedido.' });
    await postReferralWebhook({
      name: cleanName,
      email: cleanEmail,
      birth_date: birthDate,
      whatsapp: cleanPhone,
    });
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('POST /api/public/referrals', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Publico: formulario /eu-indico (afiliado + indicado)
app.post('/api/public/direct-referral', async (req, res) => {
  try {
    const {
      affiliate_name: affiliateNameInput,
      affiliate_phone: affiliatePhoneInput,
      referral_name: referralNameInput,
      referral_phone: referralPhoneInput,
    } = req.body || {};

    const affiliateName = (affiliateNameInput ?? '').toString().trim();
    const affiliatePhone = onlyDigits(affiliatePhoneInput).slice(0, 15);
    const referralName = (referralNameInput ?? '').toString().trim();
    const referralPhone = onlyDigits(referralPhoneInput).slice(0, 15);

    if (!affiliateName || !affiliatePhone || !referralName || !referralPhone) {
      return res.status(400).json({
        ok: false,
        error: 'Preencha nome e telefone do afiliado e do indicado.',
      });
    }

    await postReferralWebhook({
      source: 'eu-indico',
      affiliate_name: affiliateName,
      affiliate_phone: affiliatePhone,
      referral_name: referralName,
      referral_phone: referralPhone,
    }, DIRECT_REFERRAL_WEBHOOK_URL);

    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('POST /api/public/direct-referral', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

app.post('/api/admin/referrals/mark-used', async (req, res) => {
  try {
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase não configurado' });
    const { email, valor_ind: valorIndInput, used_date: usedDateInput } = req.body || {};
    const cleanEmail = (email ?? '').toString().trim();
    const valorInd = Number(valorIndInput);
    const usedDate = normalizeDateInput(usedDateInput);

    if (!cleanEmail || !Number.isFinite(valorInd) || valorInd < 0 || !usedDate) {
      return res.status(400).json({ ok: false, error: 'Informe email válido, valor numérico e data válida (YYYY-MM-DD).' });
    }

    const { data: referral, error: refErr } = await admin
      .from('referrals')
      .select('id, has_purchased')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (refErr) return res.status(500).json({ ok: false, error: 'Falha ao localizar o registro.' });
    if (!referral?.id) return res.status(404).json({ ok: false, error: 'Contato não encontrado.' });
    if (referral.has_purchased) {
      return res.status(409).json({ ok: false, error: 'Esse usuário já gerou um cashback anteriormente.' });
    }

    const { error: updErr } = await admin
      .from('referrals')
      .update({ has_purchased: true, used_date: usedDate, valor_ind: valorInd })
      .eq('id', referral.id);
    if (updErr) return res.status(500).json({ ok: false, error: 'Não foi possível atualizar o registro.' });

    return res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/referrals/mark-used', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Middleware de autenticação (Authorization: Bearer <access token>)
async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers['authorization'] || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Token ausente' });
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase não configurado' });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ ok: false, error: 'Token inválido' });
    req.user = data.user; // { id, email, user_metadata }
    next();
  } catch (e) {
    console.error('requireAuth error', e);
    return res.status(500).json({ ok: false, error: 'Auth error' });
  }
}

// Perfil atual
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const email = req.user.email;
    const meta = req.user.user_metadata || {};

    const { data: profile0, error: selErr } = await admin
      .from('profiles')
      .select('id,name,whatsapp,cpf,referral_code,valor_cashback,created_at,data_nasc')
      .eq('id', uid)
      .maybeSingle();
    if (selErr) return res.status(500).json({ ok: false, error: 'Falha ao buscar perfil' });

    let profile = profile0 || null;
    if (!profile) {
      // Cria perfil se ausente (ex.: sem trigger)
      const referral_code = await generateUniqueReferralCode();
      const cpfDigits = String(meta.cpf || '').replace(/\D+/g, '').slice(0, 11) || null;
      const birthDate = normalizeBirthDate(meta.data_nasc);
      const cashbackValue = typeof meta.valor_cashback === 'number'
        ? meta.valor_cashback
        : Number(meta.valor_cashback || 0) || 0;
      const insertPayload = {
        id: uid,
        name: meta.name || null,
        whatsapp: meta.whatsapp || null,
        cpf: cpfDigits,
        referral_code,
        data_nasc: birthDate,
        valor_cashback: cashbackValue,
      };
      const { error: insErr } = await admin.from('profiles').insert([insertPayload]);
      if (insErr) console.warn('GET /api/me profile insert failed', insErr);
      const { data: p2 } = await admin
        .from('profiles')
        .select('id,name,whatsapp,cpf,referral_code,valor_cashback,created_at,data_nasc')
        .eq('id', uid)
        .maybeSingle();
      profile = p2 || insertPayload;
    } else {
      // Completa dados ausentes, inclusive referral_code
      const patch = {};
      if (!profile.referral_code) patch.referral_code = await generateUniqueReferralCode();
      if (!profile.name && meta.name) patch.name = meta.name;
      if (!profile.whatsapp && meta.whatsapp) patch.whatsapp = meta.whatsapp;
      const cpfDigits = String(meta.cpf || '').replace(/\D+/g, '').slice(0, 11);
      if (!profile.cpf && cpfDigits) patch.cpf = cpfDigits;
      const birthDate = normalizeBirthDate(meta.data_nasc);
      if (!profile.data_nasc && birthDate) patch.data_nasc = birthDate;
      const cashbackValue = Number(meta.valor_cashback ?? profile.valor_cashback ?? 0);
      if (profile.valor_cashback == null && !Number.isNaN(cashbackValue)) {
        patch.valor_cashback = cashbackValue;
      }
      if (Object.keys(patch).length) {
        const { error: updErr } = await admin.from('profiles').update(patch).eq('id', uid);
        if (updErr) console.warn('GET /api/me profile update failed', updErr);
        profile = { ...profile, ...patch };
      }
    }

    return res.json({ ok: true, user: { id: uid, email }, profile });
  } catch (e) {
    console.error('GET /api/me', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Listar indicações
app.get('/api/referrals', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { data, error } = await admin
      .from('referrals')
      .select('*')
      .eq('referrer_user', uid)
      .order('registered_at', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: 'Falha ao listar indicações' });
    return res.json({ ok: true, data });
  } catch (e) {
    console.error('GET /api/referrals', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Criar indicação
app.post('/api/referrals', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { name, email, whatsapp } = req.body || {};
    if (!name || !email) return res.status(400).json({ ok: false, error: 'Nome e email são obrigatórios' });
    const { data: prof } = await admin
      .from('profiles')
      .select('referral_code')
      .eq('id', uid)
      .maybeSingle();
    const payload = {
      name,
      email,
      whatsapp: whatsapp || null,
      has_purchased: false,
      referrer_code: prof?.referral_code || null,
      referrer_user: uid,
      registered_at: new Date().toISOString(),
    };
    const { data, error } = await admin
      .from('referrals')
      .insert([payload])
      .select()
      .single();
    if (error) return res.status(500).json({ ok: false, error: 'Falha ao criar indicação' });

    // Atualiza contador n_ind para o perfil do usuário
    try {
      const { count, error: countErr } = await admin
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_user', uid);
      if (countErr) throw countErr;
      await admin
        .from('profiles')
        .update({ n_ind: count ?? 0 })
        .eq('id', uid);
    } catch (nIndErr) {
      console.warn('n_ind sync failed', nIndErr);
    }

    return res.status(201).json({ ok: true, data });
  } catch (e) {
    console.error('POST /api/referrals', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Marcar como comprada
app.patch('/api/referrals/:id/purchased', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const { error } = await admin
      .from('referrals')
      .update({ has_purchased: true })
      .eq('id', id)
      .eq('referrer_user', uid);
    if (error) return res.status(500).json({ ok: false, error: 'Falha ao atualizar' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/referrals/:id/purchased', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Excluir indicação
app.delete('/api/referrals/:id', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const { error } = await admin
      .from('referrals')
      .delete()
      .eq('id', id)
      .eq('referrer_user', uid);
    if (error) return res.status(500).json({ ok: false, error: 'Falha ao excluir' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/referrals/:id', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

if (SERVE_FRONTEND) {
  app.use(express.static(FRONTEND_DIST_PATH));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(FRONTEND_INDEX_FILE);
  });
}

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
