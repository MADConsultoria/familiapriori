import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
const QUESTIONS = [
  {
    id: 'travelPreference',
    title: 'Preferência de viagem',
    prompt: 'Pensando nas suas próximas viagens, o que mais te atrai neste momento?',
    options: [
      'Viagens pelo Brasil',
      'Viagens internacionais',
    ],
  },
  {
    id: 'travelWindow',
    title: 'Janela de viagem',
    prompt: 'Pensando nessa próxima viagem, quando ela seria mais provável?',
    options: [
      '2º semestre de 2026',
      '1º semestre de 2027',
      '2º semestre de 2027',
      'Ainda não tenho uma data definida',
    ],
  },
  {
    id: 'decisionTime',
    title: 'Tempo de decisão',
    prompt: 'Com quanto tempo você costuma decidir ou comprar uma viagem?',
    options: [
      'Mais de 12 meses antes',
      'Entre 8 e 12 meses antes',
      'Entre 4 e 7 meses antes',
      'Próximo da viagem',
    ],
  },
  {
    id: 'hotelPreference',
    title: 'Hospedagem',
    prompt: 'Pensando na hospedagem durante a viagem, qual dessas opções você prefere?',
    options: [
      'Hotel 4 estrelas, podendo ser mais afastado do centro',
      'Hotel 3 estrelas bem localizado',
      'Não abro mão de hotéis 4 estrelas bem localizados',
      'Não abro mão de hotéis 5 estrelas bem localizados',
    ],
  },
  {
    id: 'travelPriority',
    title: 'Prioridade da viagem',
    prompt: 'Pensando nas suas viagens nos próximos anos, o que faz mais sentido para você?',
    options: [
      'Prefiro viajar mais vezes, mesmo com escolhas mais simples',
      'Prefiro viajar menos, mas com experiências mais completas e confortáveis',
    ],
  },
];

const INITIAL_ANSWERS = {
  name: '',
  whatsapp: '',
  travelPreference: '',
  travelWindow: '',
  decisionTime: '',
  hotelPreference: '',
  travelPriority: '',
  desiredDestination: '',
};

const CONTACT_STEP = 0;
const TOTAL_STEPS = QUESTIONS.length + 2;

function onlyDigits(value = '') {
  return String(value).replace(/\D+/g, '');
}

function formatWhatsapp(value = '') {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function TravelSurveyPage() {
  const location = useLocation();
  const isFamilySurvey = location.pathname.replace(/\/+$/, '') === '/pesquisa-familia';
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const answeredCount = useMemo(() => {
    const selectedAnswers = QUESTIONS.filter((question) => answers[question.id]).length;
    return selectedAnswers + (answers.desiredDestination.trim() ? 1 : 0);
  }, [answers]);

  const contactComplete = Boolean(answers.name.trim()) && onlyDigits(answers.whatsapp).length >= 10;
  const canSubmit = answeredCount === 6;
  const isContactStep = currentStep === CONTACT_STEP;
  const questionStepIndex = currentStep - 1;
  const isDestinationStep = currentStep === TOTAL_STEPS - 1;
  const currentQuestion = QUESTIONS[questionStepIndex] || null;
  const currentAnswer = isContactStep
    ? contactComplete
    : isDestinationStep
    ? answers.desiredDestination.trim()
    : answers[currentQuestion?.id] || '';
  const canGoNext = Boolean(currentAnswer);
  const stepProgress = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);
  const surveySource = isFamilySurvey ? 'familia' : 'geral';
  const voucherValue = isFamilySurvey ? 151 : 150;

  const updateAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: key === 'whatsapp' ? formatWhatsapp(value) : value }));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const goToNextStep = () => {
    if (!canGoNext) return;
    setCurrentStep((prev) => Math.min(TOTAL_STEPS - 1, prev + 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!contactComplete || !canSubmit || submitting) return;

    setSubmitting(true);
    setSubmitError('');

    const payload = {
      name: answers.name.trim(),
      whatsapp: onlyDigits(answers.whatsapp),
      whatsapp_formatted: answers.whatsapp,
      voucher_value: voucherValue,
      voucher_valid_until: '2026-08-31',
      answers: {
        travel_preference: answers.travelPreference,
        travel_window: answers.travelWindow,
        decision_time: answers.decisionTime,
        hotel_preference: answers.hotelPreference,
        travel_priority: answers.travelPriority,
        desired_destination: answers.desiredDestination.trim(),
      },
      submitted_at: new Date().toISOString(),
      source: surveySource,
    };

    try {
      await apiFetch('/api/public/travel-survey', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSubmitted(true);

      const stored = JSON.parse(window.localStorage.getItem('prioriTravelSurvey') || '[]');
      stored.push(payload);
      window.localStorage.setItem('prioriTravelSurvey', JSON.stringify(stored));
    } catch (error) {
      setSubmitError(error.message || 'Não foi possível enviar a pesquisa. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers(INITIAL_ANSWERS);
    setSubmitted(false);
    setCurrentStep(0);
    setSubmitting(false);
    setSubmitError('');
  };

  if (submitted) {
    return (
      <div className="survey-page">
        <main className="survey-main survey-main-centered">
          <section className="voucher-art" aria-labelledby="voucher-title">
            <div className="voucher-art-top">
              <div className="voucher-ribbon" aria-hidden="true">
                <span className="voucher-ribbon-line" />
              </div>
              <img src="/logo.png" alt="Priori Senior Travel" className="voucher-art-logo" />
            </div>

            <div className="voucher-art-bottom">
              <div className="voucher-art-spacer" aria-hidden="true" />
              <div className="voucher-art-content">
                <h1 id="voucher-title">Você ganhou um voucher Priori</h1>
                <strong>R$ {voucherValue}</strong>
                <p>Voucher válido apenas para roteiros aéreos. Não válido para day use</p>
                <span>Válido até agosto 2026</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="survey-page">
      <main className="survey-main">
        <section className="survey-intro" aria-labelledby="survey-title">
          <h1 id="survey-title">Sua próxima viagem começa aqui</h1>
        </section>

        <form className="survey-form" onSubmit={handleSubmit}>
          <div className="survey-progress" aria-label={`Progresso da pesquisa: ${stepProgress}%`}>
            <div className="survey-progress-text">
              <span>{isContactStep ? 'Identificação' : `Pergunta ${currentStep} de 6`}</span>
              <strong>{stepProgress}%</strong>
            </div>
            <div className="survey-progress-track">
              <div className="survey-progress-bar" style={{ width: `${stepProgress}%` }} />
            </div>
          </div>

          <section className="survey-step-card">
            {isContactStep && (
              <fieldset className="survey-question">
                <legend>
                  <span>1</span>
                  <strong>Antes de começar</strong>
                </legend>
                <p>Informe seus dados para receber o voucher ao final da pesquisa.</p>

                <div className="survey-contact-fields">
                  <label className="survey-field" htmlFor="surveyName">
                    <span>Nome</span>
                    <input
                      id="surveyName"
                      type="text"
                      value={answers.name}
                      onChange={(event) => updateAnswer('name', event.target.value)}
                      required
                      placeholder="Seu nome completo"
                    />
                  </label>

                  <label className="survey-field" htmlFor="surveyWhatsapp">
                    <span>WhatsApp</span>
                    <input
                      id="surveyWhatsapp"
                      type="tel"
                      inputMode="numeric"
                      value={answers.whatsapp}
                      onChange={(event) => updateAnswer('whatsapp', event.target.value)}
                      required
                      placeholder="(11) 99999-9999"
                    />
                  </label>
                </div>
              </fieldset>
            )}

            {!isDestinationStep && currentQuestion && (
              <fieldset className="survey-question">
              <legend>
                <span>{currentStep}</span>
                <strong>{currentQuestion.title}</strong>
              </legend>
              <p>{currentQuestion.prompt}</p>

              <div className="survey-options">
                {currentQuestion.options.map((option, optionIndex) => {
                  const optionId = `${currentQuestion.id}-${optionIndex}`;
                  return (
                    <label className="survey-option" htmlFor={optionId} key={option}>
                      <input
                        id={optionId}
                        type="radio"
                        name={currentQuestion.id}
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
                        required
                      />
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <strong>{option}</strong>
                    </label>
                  );
                })}
              </div>
              </fieldset>
            )}

            {isDestinationStep && (
              <fieldset className="survey-question">
                <legend>
                  <span>6</span>
                  <strong>Próxima viagem desejada</strong>
                </legend>
                <p>Para onde você gostaria de fazer a sua próxima viagem?</p>
                <textarea
                  value={answers.desiredDestination}
                  onChange={(event) => updateAnswer('desiredDestination', event.target.value)}
                  required
                  rows={4}
                  placeholder="Pode ser um destino no Brasil ou no exterior. Se quiser citar mais de um, escreva separados por vírgula."
                  className="survey-textarea"
                />
              </fieldset>
            )}

            <div className="survey-step-actions">
              <button
                type="button"
                className="survey-secondary-action"
                onClick={goToPreviousStep}
                disabled={currentStep === 0 || submitting}
              >
                Voltar
              </button>

              {isDestinationStep ? (
                <button type="submit" className="survey-submit" disabled={!contactComplete || !canSubmit || submitting}>
                  {submitting ? 'Enviando...' : 'Finalizar e liberar voucher'}
                </button>
              ) : (
                <button
                  type="button"
                  className="survey-submit"
                  onClick={goToNextStep}
                  disabled={!canGoNext || submitting}
                >
                  Continuar
                </button>
              )}
            </div>

            {submitError && (
              <p className="survey-submit-error" role="alert">{submitError}</p>
            )}
            <p className="survey-answer-count">{answeredCount} de 6 respostas preenchidas</p>
          </section>
        </form>
      </main>
    </div>
  );
}

export default TravelSurveyPage;
