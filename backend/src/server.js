import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const clientOptions = () => ({ auth: { autoRefreshToken: false, persistSession: false } });
const admin = (SUPABASE_URL && SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SERVICE_ROLE, clientOptions())
  : null;
const travelQuizSessions = new Map();
const TRAVEL_QUIZ_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const TRAVEL_PROFILE_KEYS = ['aventura', 'cultural', 'conforto', 'social'];
const TRAVEL_PROFILE_DEFS = {
  aventura: {
    title: 'Explorador de Aventuras',
    description: 'Você busca movimento, natureza e experiências fora do roteiro tradicional. Viagens com trilhas, mar, montanha e descobertas são sua zona de felicidade.',
    tips: [
      'Combine destinos urbanos com escapadas em natureza.',
      'Inclua ao menos uma atividade nova por viagem.',
      'Prefira hospedagens com acesso rápido aos passeios.',
    ],
  },
  cultural: {
    title: 'Curador Cultural',
    description: 'Você viaja para conhecer história, arte, gastronomia e identidade local. Seu prazer está em voltar para casa com repertório e boas histórias.',
    tips: [
      'Monte um roteiro com bairros e museus menos óbvios.',
      'Reserve experiências gastronômicas com guias locais.',
      'Inclua tempo livre para explorar sem pressa.',
    ],
  },
  conforto: {
    title: 'Viajante Conforto Premium',
    description: 'Você valoriza organização, comodidade e bem-estar. Prefere viagens fluidas, com bons serviços e foco em qualidade da experiência.',
    tips: [
      'Priorize voos e deslocamentos mais diretos.',
      'Busque hotéis com estrutura de descanso e serviços.',
      'Adote roteiros com menos deslocamentos por dia.',
    ],
  },
  social: {
    title: 'Conector Social',
    description: 'Seu motor de viagem é compartilhar momentos. Você gosta de grupos, celebrações e viagens com energia coletiva e memórias em conjunto.',
    tips: [
      'Inclua atividades em grupo no início da viagem.',
      'Monte roteiros com mix entre lazer e vida noturna.',
      'Escolha destinos com experiências coletivas marcantes.',
    ],
  },
};
const TRAVEL_QUIZ_QUESTIONS = [
  'Quando você pensa na viagem perfeita, o que não pode faltar?',
  'Quais foram os melhores destinos que você já visitou e por que eles foram especiais?',
  'Entre mar, montanha, cidade histórica ou resort, qual cenário te chama mais atenção e por quê?',
  'Como você prefere organizar seus dias de viagem: roteiro cheio, ritmo equilibrado ou bem tranquilo?',
  'Para os próximos 6 a 12 meses, quais destinos ou tipos de viagem estão nos seus planos?',
  'Você já viajou com a Priori? Se sim, como foi sua experiência?',
  'Qual dessas experiências mais te anima: atividade de aventura, passeio cultural, descanso com conforto ou programa em grupo?',
  'Na hora de escolher hospedagem, o que pesa mais para você?',
  'Você prefere viajar sozinho, em casal, família ou com amigos? O que você mais valoriza nessa companhia?',
];
const TRAVEL_QUIZ_QUESTION_COUNT = TRAVEL_QUIZ_QUESTIONS.length;
const QUIZ_KEYWORDS = {
  aventura: [
    'aventura', 'trilha', 'radical', 'adrenalina', 'natureza', 'montanha', 'surf', 'mergulho', 'explorar',
    'road trip', 'ecoturismo', 'esporte', 'mochila', 'descobrir',
  ],
  cultural: [
    'cultura', 'historia', 'história', 'museu', 'arte', 'arquitetura', 'gastronomia', 'local', 'tradicao',
    'tradição', 'cidade', 'passeio guiado', 'feira', 'teatro',
  ],
  conforto: [
    'conforto', 'hotel', 'resort', 'spa', 'descanso', 'tranquilo', 'comodidade', 'luxo', 'servico',
    'serviço', 'bem-estar', 'facilidade', 'planejado', 'seguranca', 'segurança',
  ],
  social: [
    'amigos', 'familia', 'família', 'grupo', 'festa', 'evento', 'vida noturna', 'balada', 'companhia',
    'celebrar', 'conectar', 'social', 'galera',
  ],
};

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
      console.warn('referral webhook skipped: fetch API indisponï¿½vel no runtime');
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
  if (!admin) throw new Error('Supabase nï¿½o configurado');
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
  throw new Error('Falha ao gerar referral code ï¿½nico apï¿½s vï¿½rias tentativas');
}

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api', ts: Date.now() });
});

// Helper: normaliza CPF mantendo apenas dï¿½gitos
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
      return res.status(400).json({ ok: false, error: 'CPF ou senha invï¿½lidos' });
    }
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase nï¿½o configurado no backend' });

    const cpfMasked = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id')
      .or(`cpf.eq.${cpfDigits},cpf.eq.${cpfMasked}`)
      .maybeSingle();
    if (profErr) return res.status(500).json({ ok: false, error: 'Falha ao consultar CPF' });
    if (!profile?.id) return res.status(400).json({ ok: false, error: 'CPF ou senha invï¿½lidos' });

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(profile.id);
    if (userErr || !userRes?.user?.email) return res.status(400).json({ ok: false, error: 'CPF ou senha invï¿½lidos' });

    const authClient = newServiceClient();
    if (!authClient) return res.status(500).json({ ok: false, error: 'Supabase nï¿½o configurado no backend' });
    const { data: sessionData, error: signErr } = await authClient.auth.signInWithPassword({
      email: userRes.user.email,
      password,
    });
    if (signErr || !sessionData?.session) return res.status(400).json({ ok: false, error: 'CPF ou senha invï¿½lidos' });

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
      return res.status(400).json({ ok: false, error: 'Informe um e-mail vï¿½lido.' });
    }
    const client = newServiceClient();
    if (!client) return res.status(500).json({ ok: false, error: 'Supabase nï¿½o configurado' });
    console.log('request-password-reset redirectTo', PASSWORD_RESET_REDIRECT_URL || '(fallback)'); 
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL || undefined,
    });
    if (error) {
      return res.status(400).json({ ok: false, error: error.message || 'Nï¿½o foi possï¿½vel enviar o e-mail.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('request-password-reset error', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Cadastro via backend (enforce CPF ï¿½nico + login automï¿½tico)
app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase nï¿½o configurado' });
    let { name, email, password, whatsapp, cpf, ref, data_nasc } = req.body || {};
    name = (name ?? '').toString().trim();
    email = (email ?? '').toString().trim();
    whatsapp = (whatsapp ?? '').toString().trim();
    password = (password ?? '').toString();
    const cpfDigits = onlyDigits(cpf);
    const birthDate = normalizeBirthDate(data_nasc);
    if (!name || !email || !password || !whatsapp || cpfDigits.length !== 11 || !birthDate) {
      return res.status(400).json({ ok: false, error: 'Dados invï¿½lidos: nome, email, senha, WhatsApp, data de nascimento e CPF (11 dï¿½gitos) sï¿½o obrigatï¿½rios' });
    }

    // Verifica CPF jï¿½ existente (aceita dï¿½gitos e mï¿½scara)
    const cpfMasked = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const { data: existing, error: existErr } = await admin
      .from('profiles')
      .select('id')
      .or(`cpf.eq.${cpfDigits},cpf.eq.${cpfMasked}`)
      .maybeSingle();
    if (existErr) return res.status(500).json({ ok: false, error: 'Falha ao verificar CPF' });
    if (existing?.id) return res.status(409).json({ ok: false, error: 'CPF jï¿½ cadastrado' });

    // Cria usuï¿½rio jï¿½ confirmado (ajuste se seu projeto exigir confirmaï¿½ï¿½o por email)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, whatsapp, cpf: cpfDigits, data_nasc: birthDate }
    });
    if (createErr || !created?.user?.id) {
      return res.status(400).json({ ok: false, error: createErr?.message || 'Falha ao criar usuï¿½rio' });
    }

    // Garante registro em profiles (sem depender de trigger)
    try {
      const uid = created.user.id;
      // Jï¿½ existe profile para este usuï¿½rio?
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
        // Se jï¿½ existir (ex.: trigger), garante referral_code e completa dados essenciais
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

    // Upsert do prï¿½prio usuï¿½rio como indicado (referrals)  executa independente do login automï¿½tico
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
    // Login automï¿½tico para devolver tokens ao front (nï¿½o bloqueia criaï¿½ï¿½o de referrals)
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

// Pï¿½blico: captura dados para resgate de desconto (sem login)
app.post('/api/public/referrals', async (req, res) => {
  try {
    const { name, email, whatsapp, data_nasc, ref } = req.body || {};
    const cleanName = (name ?? '').toString().trim();
    const cleanEmail = (email ?? '').toString().trim();
    const cleanPhone = onlyDigits(whatsapp).slice(0, 15);
    const birthDate = normalizeBirthDate(data_nasc);
    if (!cleanName || !cleanEmail || !cleanPhone || !birthDate) {
      return res.status(400).json({ ok: false, error: 'Preencha nome, email, WhatsApp e data de nascimento vï¿½lidos.' });
    }

    const { data: dup, error: dupErr } = await admin
      .from('referrals')
      .select('id')
      .or(`email.eq.${cleanEmail},whatsapp.eq.${cleanPhone}`)
      .maybeSingle();
    if (dupErr) return res.status(500).json({ ok: false, error: 'Falha ao verificar contatos existentes' });
    if (dup?.id) {
      return res.status(409).json({ ok: false, error: 'Esse email ou WhatsApp jï¿½ foi cadastrado.' });
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
    if (insertErr) return res.status(500).json({ ok: false, error: 'Nï¿½o foi possï¿½vel registrar seu pedido.' });
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
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase nï¿½o configurado' });
    const { email, valor_ind: valorIndInput, used_date: usedDateInput } = req.body || {};
    const cleanEmail = (email ?? '').toString().trim();
    const valorInd = Number(valorIndInput);
    const usedDate = normalizeDateInput(usedDateInput);

    if (!cleanEmail || !Number.isFinite(valorInd) || valorInd < 0 || !usedDate) {
      return res.status(400).json({ ok: false, error: 'Informe email vï¿½lido, valor numï¿½rico e data vï¿½lida (YYYY-MM-DD).' });
    }

    const { data: referral, error: refErr } = await admin
      .from('referrals')
      .select('id, has_purchased')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (refErr) return res.status(500).json({ ok: false, error: 'Falha ao localizar o registro.' });
    if (!referral?.id) return res.status(404).json({ ok: false, error: 'Contato nï¿½o encontrado.' });
    if (referral.has_purchased) {
      return res.status(409).json({ ok: false, error: 'Esse usuï¿½rio jï¿½ gerou um cashback anteriormente.' });
    }

    const { error: updErr } = await admin
      .from('referrals')
      .update({ has_purchased: true, used_date: usedDate, valor_ind: valorInd })
      .eq('id', referral.id);
    if (updErr) return res.status(500).json({ ok: false, error: 'Nï¿½o foi possï¿½vel atualizar o registro.' });

    return res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/referrals/mark-used', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Middleware de autenticaï¿½ï¿½o (Authorization: Bearer <access token>)
async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers['authorization'] || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Token ausente' });
    if (!admin) return res.status(500).json({ ok: false, error: 'Supabase nï¿½o configurado' });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ ok: false, error: 'Token invï¿½lido' });
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

// Listar indicaï¿½ï¿½es
app.get('/api/referrals', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { data, error } = await admin
      .from('referrals')
      .select('*')
      .eq('referrer_user', uid)
      .order('registered_at', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: 'Falha ao listar indicaï¿½ï¿½es' });
    return res.json({ ok: true, data });
  } catch (e) {
    console.error('GET /api/referrals', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Criar indicaï¿½ï¿½o
app.post('/api/referrals', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { name, email, whatsapp } = req.body || {};
    if (!name || !email) return res.status(400).json({ ok: false, error: 'Nome e email sï¿½o obrigatï¿½rios' });
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
    if (error) return res.status(500).json({ ok: false, error: 'Falha ao criar indicaï¿½ï¿½o' });

    // Atualiza contador n_ind para o perfil do usuï¿½rio
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
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID invï¿½lido' });
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

// Excluir indicaï¿½ï¿½o
app.delete('/api/referrals/:id', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID invï¿½lido' });
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

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(value = '') {
  return String(value).replace(/\D+/g, '').slice(0, 15);
}

function normalizeName(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function isEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function cleanOldTravelSessions() {
  const now = Date.now();
  for (const [key, session] of travelQuizSessions.entries()) {
    const createdAt = new Date(session.createdAt).getTime();
    if (!createdAt || Number.isNaN(createdAt) || (now - createdAt) > TRAVEL_QUIZ_SESSION_TTL_MS) {
      travelQuizSessions.delete(key);
    }
  }
}

function safeJsonFromText(text = '') {
  if (!text) return null;
  const str = String(text);
  const match = str.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function extractLeadPayloadAndCleanMessage(text = '') {
  const raw = String(text || '');
  const match = raw.match(/<lead_payload_json>\s*([\s\S]*?)\s*<\/lead_payload_json>/i);
  if (!match) {
    return {
      cleanMessage: raw.trim(),
      leadPayload: null,
      payloadError: null,
    };
  }
  const jsonText = (match[1] || '').trim();
  let leadPayload = null;
  let payloadError = null;
  try {
    leadPayload = JSON.parse(jsonText);
  } catch (err) {
    payloadError = 'invalid_json_payload';
  }
  const cleanMessage = raw.replace(match[0], '').trim();
  return {
    cleanMessage,
    leadPayload,
    payloadError,
  };
}

function buildFallbackLeadPayload(session, result, finalMessage) {
  return {
    event: 'travel_quiz_completed',
    timestamp_iso: new Date().toISOString(),
    lead: {
      name: session?.lead?.name || '',
      email: session?.lead?.email || '',
      phone: session?.lead?.phone || '',
    },
    quiz_summary: {
      perfil_companhia: '',
      estilo_predominante: result?.profileKey || '',
      sensibilidade_seguranca: '',
      prontidao_compra: '',
      janela_viagem: '',
      destino_sonho: '',
      fit_priori: 0,
      resumo_emocional: result?.description || '',
    },
    recommended_routes: [],
    final_message_for_whatsapp: String(finalMessage || ''),
    image_brief: {
      title: 'Seu Jeito Priori de Viajar',
      visual_style: '',
      main_phrase: '',
      colors: ['#09344b', '#d8ad5e', '#f8fafc'],
    },
    pdf_brief: {
      title: 'Diagnostico de Perfil de Viajante',
      sections: [
        'Resumo do perfil',
        'Pontos de seguranca e conforto',
        'Roteiros recomendados',
        'Proximos passos',
      ],
    },
  };
}

async function openAiResponseText({ system = '', prompt = '', temperature = 0.4 }) {
  if (!OPENAI_API_KEY) return null;
  const fetcher = globalThis.fetch;
  if (typeof fetcher !== 'function') return null;
  try {
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: system }] },
          { role: 'user', content: [{ type: 'input_text', text: prompt }] },
        ],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.warn('OpenAI quiz request failed', response.status, errText);
      return null;
    }
    const data = await response.json();
    if (typeof data?.output_text === 'string' && data.output_text.trim()) {
      return data.output_text.trim();
    }
    const segments = [];
    if (Array.isArray(data?.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item?.content)) continue;
        for (const c of item.content) {
          if (typeof c?.text === 'string') segments.push(c.text);
        }
      }
    }
    return segments.join('\n').trim() || null;
  } catch (err) {
    console.warn('OpenAI quiz request exception', err?.message || err);
    return null;
  }
}

function buildTravelImagePrompt(session, result, whatsappPayload) {
  const name = session?.lead?.name || 'Viajante';
  const profileTitle = result?.title || 'Perfil de Viajante';
  const summary = whatsappPayload?.quiz_summary || {};
  const style = summary?.estilo_predominante || result?.profileKey || 'cultural';
  const company = summary?.perfil_companhia || 'grupo';
  const mood = summary?.resumo_emocional || result?.description || 'viagem com bem-estar, descoberta e boa companhia';
  const routes = Array.isArray(whatsappPayload?.recommended_routes) ? whatsappPayload.recommended_routes : [];
  const routeNames = routes.map((r) => r?.name).filter(Boolean).slice(0, 3);
  const destinations = routeNames.length ? routeNames.join(', ') : 'destinos inspiradores da Priori';
  return [
    'Crie uma arte editorial fotorealista para perfil de viagem personalizado.',
    `Persona principal: ${name}, perfil "${profileTitle}".`,
    `Estilo de viagem predominante: ${style}. Companhia preferida: ${company}.`,
    `Sensação emocional da cena: ${mood}.`,
    `Elementos obrigatórios: cenário de viagem encantador, pessoas em grupo interagindo com naturalidade, clima acolhedor, diversidade etária madura (50+), sensação de segurança e conforto.`,
    `Incluir referências visuais a destinos compatíveis: ${destinations}.`,
    'Composição rica: plano de fundo com paisagens de destino, plano médio com viajantes felizes, detalhes de viagem (mapa, mala elegante, câmera, guia local).',
    'Estilo visual premium, cinematográfico, iluminação de fim de tarde, cores sofisticadas (azul profundo, dourado suave, tons naturais).',
    'Adicionar palavras curtas integradas ao design (não exagerar): "Descoberta", "Conforto", "Cultura", "Conexão".',
    'Sem logos, sem marcas d’água, sem texto longo, sem layout de card, sem aparência de infográfico.',
    'Formato horizontal 1536x1024.',
  ].join('\n');
}

async function generateTravelProfileImage(session, result, whatsappPayload) {
  if (!OPENAI_API_KEY) return null;
  const fetcher = globalThis.fetch;
  if (typeof fetcher !== 'function') return null;
  try {
    const prompt = buildTravelImagePrompt(session, result, whatsappPayload);
    const response = await fetcher('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size: '1536x1024',
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.warn('OpenAI image generation failed', response.status, errText);
      return null;
    }
    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;
    if (typeof b64 === 'string' && b64) {
      return `data:image/png;base64,${b64}`;
    }
    if (typeof url === 'string' && url) {
      return url;
    }
    return null;
  } catch (err) {
    console.warn('OpenAI image generation exception', err?.message || err);
    return null;
  }
}

async function generateTravelProfileImageWithTimeout(session, result, whatsappPayload, timeoutMs = 10000) {
  try {
    return await Promise.race([
      generateTravelProfileImage(session, result, whatsappPayload),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

function scoreAnswerByKeywords(answer = '') {
  const text = String(answer).toLowerCase();
  const scores = { aventura: 0, cultural: 0, conforto: 0, social: 0 };
  for (const key of TRAVEL_PROFILE_KEYS) {
    const words = QUIZ_KEYWORDS[key] || [];
    for (const word of words) {
      if (text.includes(word)) scores[key] += 1;
    }
  }
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    scores.conforto = 1;
    scores.cultural = 1;
  }
  return scores;
}

async function analyzeAnswer(question, answer) {
  const localScores = scoreAnswerByKeywords(answer);
  if (!OPENAI_API_KEY) return localScores;
  const prompt = [
    'Analise a resposta de um quiz de perfil de viajante.',
    'Retorne somente JSON sem markdown com esta estrutura:',
    '{"scores":{"aventura":0-3,"cultural":0-3,"conforto":0-3,"social":0-3}}',
    `Pergunta: ${question}`,
    `Resposta: ${answer}`,
  ].join('\n');
  const text = await openAiResponseText({
    system: 'Você classifica respostas de quiz em pontuação objetiva.',
    prompt,
    temperature: 0,
  });
  const parsed = safeJsonFromText(text || '');
  const aiScores = parsed?.scores || {};
  for (const key of TRAVEL_PROFILE_KEYS) {
    const score = Number(aiScores[key]);
    if (Number.isFinite(score)) {
      localScores[key] += Math.max(0, Math.min(3, Math.round(score)));
    }
  }
  return localScores;
}

function getTopTravelProfile(scores) {
  let winner = 'conforto';
  let best = -1;
  for (const key of TRAVEL_PROFILE_KEYS) {
    const value = Number(scores[key] || 0);
    if (value > best) {
      best = value;
      winner = key;
    }
  }
  return winner;
}

async function composeQuestionMessage(name, question, questionIndex) {
  const fallback = `${name ? `${name}, ` : ''}perfeito. ${question}`;
  if (!OPENAI_API_KEY) return fallback;
  const text = await openAiResponseText({
    system: 'Você é um agente de quiz de viagem em português do Brasil.',
    prompt: [
      `Nome do usuário: ${name || 'Visitante'}`,
      `Numero da pergunta: ${questionIndex + 1}/${TRAVEL_QUIZ_QUESTION_COUNT}`,
      `Pergunta obrigatória: ${question}`,
      'Responda com no máximo 2 frases e termine exatamente com a pergunta obrigatória.',
    ].join('\n'),
    temperature: 0.6,
  });
  return text || fallback;
}

async function composeFinalMessage(name, result, answers) {
  const fallback = `${name ? `${name}, ` : ''}fechamos seu quiz. Seu perfil de viajante é: ${result.title}. ${result.description}`;
  if (!OPENAI_API_KEY) return fallback;
  const text = await openAiResponseText({
    system: 'Você é consultor de viagens e comunica perfis de forma clara e empolgante.',
    prompt: [
      `Nome: ${name || 'Visitante'}`,
      `Perfil escolhido: ${result.title}`,
      `Descrição base: ${result.description}`,
      `Dicas: ${(result.tips || []).join(' | ')}`,
      `Respostas do usuário: ${answers.map((a) => `${a.question} => ${a.answer}`).join(' || ')}`,
      'Crie um texto final curto (até 4 frases), amigável e objetivo.',
    ].join('\n'),
    temperature: 0.7,
  });
  return text || fallback;
}

app.post('/api/travel-quiz/session', async (req, res) => {
  try {
    cleanOldTravelSessions();
    const name = normalizeName(req.body?.name || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = normalizePhone(req.body?.phone || '');
    if (!name || !isEmail(email) || phone.length < 10) {
      return res.status(400).json({ ok: false, error: 'Informe nome, email e telefone válidos.' });
    }

    const id = randomUUID();
    const session = {
      id,
      createdAt: nowIso(),
      lead: { name, email, phone },
      questionIndex: 0,
      answers: [],
      scores: { aventura: 0, cultural: 0, conforto: 0, social: 0 },
      done: false,
    };
    travelQuizSessions.set(id, session);

    const assistantMessage = await composeQuestionMessage(name, TRAVEL_QUIZ_QUESTIONS[0], 0);
    return res.status(201).json({
      ok: true,
      sessionId: id,
      assistantMessage,
      totalQuestions: TRAVEL_QUIZ_QUESTION_COUNT,
    });
  } catch (e) {
    console.error('POST /api/travel-quiz/session', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

app.post('/api/travel-quiz/message', async (req, res) => {
  try {
    cleanOldTravelSessions();
    const sessionId = String(req.body?.sessionId || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!sessionId || !message) {
      return res.status(400).json({ ok: false, error: 'Sessão e mensagem são obrigatórias.' });
    }

    const session = travelQuizSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Sessão não encontrada ou expirada.' });
    }
    if (session.done) {
      return res.status(409).json({ ok: false, error: 'Quiz finalizado. Inicie uma nova sessão.' });
    }

    const currentQuestion = TRAVEL_QUIZ_QUESTIONS[session.questionIndex];
    session.answers.push({
      question: currentQuestion,
      answer: message,
      at: nowIso(),
    });

    const answerScores = await analyzeAnswer(currentQuestion, message);
    for (const key of TRAVEL_PROFILE_KEYS) {
      session.scores[key] += Number(answerScores[key] || 0);
    }

    if (session.questionIndex < TRAVEL_QUIZ_QUESTION_COUNT - 1) {
      session.questionIndex += 1;
      const nextQuestion = TRAVEL_QUIZ_QUESTIONS[session.questionIndex];
      const assistantMessage = await composeQuestionMessage(session.lead.name, nextQuestion, session.questionIndex);
      return res.json({
        ok: true,
        done: false,
        assistantMessage,
        progress: { current: session.questionIndex + 1, total: TRAVEL_QUIZ_QUESTION_COUNT },
      });
    }

    const winnerKey = getTopTravelProfile(session.scores);
    const profile = TRAVEL_PROFILE_DEFS[winnerKey] || TRAVEL_PROFILE_DEFS.conforto;
    const result = {
      profileKey: winnerKey,
      title: profile.title,
      description: profile.description,
      tips: profile.tips,
      scores: session.scores,
      lead: session.lead,
    };
    session.done = true;
    session.result = result;
    session.finishedAt = nowIso();

    const assistantMessage = await composeFinalMessage(session.lead.name, result, session.answers);
    const { cleanMessage, leadPayload, payloadError } = extractLeadPayloadAndCleanMessage(assistantMessage);
    const whatsappPayload = leadPayload || buildFallbackLeadPayload(session, result, cleanMessage);
    const profileImageUrl = await generateTravelProfileImageWithTimeout(session, result, whatsappPayload);
    return res.json({
      ok: true,
      done: true,
      assistantMessage: cleanMessage,
      result,
      whatsappPayload,
      profileImageUrl,
      payloadError,
      progress: { current: TRAVEL_QUIZ_QUESTION_COUNT, total: TRAVEL_QUIZ_QUESTION_COUNT },
    });
  } catch (e) {
    console.error('POST /api/travel-quiz/message', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});



