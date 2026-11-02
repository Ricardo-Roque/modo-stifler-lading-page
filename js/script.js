// Configuração do Supabase: use apenas a chave publishable/anon (nunca a service_role).
const SUPABASE_URL = '[SUPABASE_URL]';
const SUPABASE_ANON_KEY = '[SUPABASE_ANON_KEY]';
const LEAD_SOURCE = 'maxwell-modo-stifler-ebook';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fallback de imagens: só mostra a foto depois que ela carrega.
  document.querySelectorAll('.about-expert__image img').forEach((img) => {
    const markLoaded = () => img.parentElement.classList.add('has-image');
    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    } else {
      img.addEventListener('load', markLoaded, { once: true });
    }
  });

  // 2. Reveal on scroll.
  const revealItems = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // Carrossel "Vida real": duplica as fotos para a animação em CSS dar a volta sem emenda.
  document.querySelectorAll('.lifestyle-track__inner').forEach((inner) => {
    Array.from(inner.children).forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelector('img').alt = '';
      inner.appendChild(clone);
    });
  });

  // Pausa o carrossel fora da tela para não gastar CPU/bateria à toa.
  if ('IntersectionObserver' in window) {
    const trackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
    });
    document.querySelectorAll('.lifestyle-track').forEach((track) => trackObserver.observe(track));
  }

  // Ano no rodapé.
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // 3. Modal.
  const modal = document.getElementById('lead-modal');
  const dialog = modal.querySelector('.lead-modal__dialog');
  const form = document.getElementById('lead-form');
  const errorBox = document.getElementById('lead-form-error');
  const success = document.getElementById('lead-success');
  const submitButton = form.querySelector('.lead-form__submit');
  let lastTrigger = null;

  const pageRegions = document.querySelectorAll('body > header, body > main, body > footer');

  const openModal = (trigger) => {
    lastTrigger = trigger;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    pageRegions.forEach((el) => { el.inert = true; });
    // Se o formulário ainda está aberto, já começa pelo primeiro campo.
    const firstField = form.hidden ? null : form.elements.name;
    (firstField && window.matchMedia('(pointer: fine)').matches ? firstField : dialog).focus();
  };

  const closeModal = () => {
    if (!selectList.hidden) closeSelect(false);
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    pageRegions.forEach((el) => { el.inert = false; });
    if (lastTrigger) lastTrigger.focus();
  };

  // Mantém o Tab dentro do modal (fallback para navegadores sem suporte a inert).
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button, a[href], input, textarea, [tabindex="0"]'))
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.querySelectorAll('[data-open-lead-form]').forEach((button) => {
    button.addEventListener('click', () => openModal(button));
  });

  modal.querySelectorAll('[data-close-lead-modal]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Máscara de telefone: (00) 00000-0000
  const phoneInput = form.elements.phone;
  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    phoneInput.value = masked;
  });

  // Lista de dificuldade: substitui o dropdown nativo e mantém o <select> escondido em sincronia.
  const painSelect = form.elements.pain_description;
  const selectBox = painSelect.closest('.lead-select');
  const selectButton = selectBox.querySelector('.lead-select__button');
  const selectValue = selectBox.querySelector('.lead-select__value');
  const selectList = selectBox.querySelector('.lead-select__list');
  const placeholder = painSelect.options[0].textContent;
  const selectOptions = Array.from(painSelect.options).slice(1).map((option, index) => {
    const item = document.createElement('li');
    item.className = 'lead-select__option';
    item.id = `pain-option-${index}`;
    item.setAttribute('role', 'option');
    item.textContent = option.textContent;
    item.dataset.value = option.value;
    selectList.appendChild(item);
    return item;
  });
  let activeIndex = 0;

  const setActive = (index) => {
    activeIndex = (index + selectOptions.length) % selectOptions.length;
    selectOptions.forEach((item, i) => item.classList.toggle('is-active', i === activeIndex));
    selectList.setAttribute('aria-activedescendant', selectOptions[activeIndex].id);
    selectOptions[activeIndex].scrollIntoView({ block: 'nearest' });
  };

  // Campo livre que só aparece quando a pessoa escolhe "Outra".
  const otherField = form.querySelector('.lead-form__other');
  const otherInput = form.elements.pain_other;

  const renderSelect = () => {
    otherField.hidden = painSelect.value !== 'Outra';
    selectValue.textContent = painSelect.value || placeholder;
    selectValue.classList.toggle('is-placeholder', !painSelect.value);
    selectOptions.forEach((item) => {
      item.setAttribute('aria-selected', String(item.dataset.value === painSelect.value));
    });
  };

  const openSelect = () => {
    selectList.hidden = false;
    selectButton.setAttribute('aria-expanded', 'true');
    const selected = selectOptions.findIndex((item) => item.dataset.value === painSelect.value);
    setActive(Math.max(selected, 0));
    selectList.focus();
    selectList.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const closeSelect = (returnFocus = true) => {
    selectList.hidden = true;
    selectButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) selectButton.focus();
  };

  const chooseOption = (index) => {
    painSelect.value = selectOptions[index].dataset.value;
    painSelect.setAttribute('aria-invalid', 'false');
    renderSelect();
    if (otherField.hidden) closeSelect();
    else {
      closeSelect(false);
      otherInput.focus();
    }
  };

  selectButton.addEventListener('click', () => {
    if (selectList.hidden) openSelect();
    else closeSelect();
  });

  selectButton.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openSelect();
    }
  });

  selectList.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') setActive(activeIndex + 1);
    else if (event.key === 'ArrowUp') setActive(activeIndex - 1);
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(selectOptions.length - 1);
    else if (event.key === 'Enter' || event.key === ' ') chooseOption(activeIndex);
    else if (event.key === 'Escape') {
      event.stopPropagation(); // fecha só a lista, não o modal
      closeSelect();
    } else if (event.key === 'Tab') {
      closeSelect(false);
      return;
    } else return;
    event.preventDefault();
  });

  selectOptions.forEach((item, index) => {
    item.addEventListener('mousemove', () => {
      if (index !== activeIndex) setActive(index);
    });
    item.addEventListener('click', () => chooseOption(index));
  });

  document.addEventListener('click', (event) => {
    if (!selectList.hidden && !selectBox.contains(event.target)) closeSelect(false);
  });

  form.addEventListener('reset', () => setTimeout(renderSelect));
  renderSelect();

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  const validate = () => {
    let firstInvalid = null;
    form.querySelectorAll('input, select').forEach((field) => {
      let valid = field.checkValidity();
      if (field.name === 'name') valid = field.value.trim().length >= 2;
      if (field.name === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim());
      if (field.name === 'phone') valid = /^[1-9]{2}9?\d{8}$/.test(field.value.replace(/\D/g, ''));
      field.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      showError('Confira os campos destacados e tente de novo.');
      (firstInvalid === painSelect ? selectButton : firstInvalid).focus();
      return false;
    }
    return true;
  };

  const showSuccess = (name) => {
    success.querySelector('[data-lead-name]').textContent = name.split(' ')[0] || 'pro';
    form.hidden = true;
    success.hidden = false;
    success.querySelector('a').focus();
  };

  // Erro some e campo deixa de ficar vermelho assim que a pessoa corrige.
  form.addEventListener('input', (event) => {
    if (event.target.getAttribute('aria-invalid') === 'true') event.target.setAttribute('aria-invalid', 'false');
    errorBox.hidden = true;
  });

  // "Outra" + texto livre vira "Outra: texto" na mesma coluna do Supabase.
  const painDescription = (data) => {
    const pain = String(data.get('pain_description')).trim();
    const other = String(data.get('pain_other') || '').trim();
    return pain === 'Outra' && other ? `Outra: ${other}` : pain;
  };

  // 4. Envio do formulário.
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    errorBox.hidden = true;
    if (!validate()) return;

    const data = new FormData(form);
    const payload = {
      name: String(data.get('name')).trim(),
      email: String(data.get('email')).trim().toLowerCase(),
      phone: String(data.get('phone')).trim(),
      pain_description: painDescription(data),
      source: LEAD_SOURCE,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    };

    if (SUPABASE_URL.startsWith('[') || SUPABASE_ANON_KEY.startsWith('[')) {
      console.warn('Supabase não configurado: lead não foi salvo.', payload);
      showSuccess(payload.name);
      return;
    }

    sending = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    // Não deixa o botão preso em "Enviando..." se a rede travar.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        signal: controller.signal,
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      // 409 = lead já cadastrado (e-mail único): libera o download mesmo assim.
      if (!response.ok && response.status !== 409) throw new Error(`HTTP ${response.status}`);

      form.reset();
      showSuccess(payload.name);
    } catch (error) {
      console.error(error);
      showError('Não foi possível enviar agora. Verifique sua conexão e tente de novo.');
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Liberar meu e-book';
    }
  });
});
