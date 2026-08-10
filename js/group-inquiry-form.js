/**
 * Jotform group inquiry source-code embed helpers.
 * Keeps location/page context non-PII and prepares Jotform's existing hidden fields.
 */
(function () {
    'use strict';

    function formElement() {
        return document.querySelector('[data-tm-group-inquiry-form]');
    }

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        return fallback;
    }

    function setValue(form, selector, value) {
        var field = form && form.querySelector(selector);
        if (field) field.value = value;
    }

    function twoDigits(value) {
        return String(value).padStart(2, '0');
    }

    function dateParts() {
        var now = new Date();
        return {
            month: twoDigits(now.getMonth() + 1),
            day: twoDigits(now.getDate()),
            year: String(now.getFullYear()),
        };
    }

    function cleanText(value, maxLength) {
        return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 120);
    }

    function sourcePageUrl() {
        var origin = (window.location && window.location.origin) || '';
        var pathname = (window.location && window.location.pathname) || '';
        return origin + pathname;
    }

    function dealTitlePrefix(form, locationSlug) {
        var configured = cleanText((form && form.dataset.dealTitlePrefix) || '', 12)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
        return configured || String(locationSlug || '').toUpperCase().slice(0, 3);
    }

    function prepareContext(form) {
        if (!form) return;
        var dates = dateParts();
        var locationName = cleanText(form.dataset.locationName, 120);
        var locationSlug = cleanText(form.dataset.locationSlug, 80);
        var pipedriveLocationName = cleanText(form.dataset.pipedriveLocationName || locationName, 120);
        var fullName = cleanText((form.querySelector('#input_8') || {}).value, 120);
        var organization = cleanText((form.querySelector('#input_10') || {}).value, 120);
        var subject = cleanText(form.dataset.formSubject, 80);
        var dealSubject = subject === 'default' ? 'general-group-inquiry' : subject;
        var leadLabel = organization || fullName || locationName;

        setValue(form, '#submitDate', new Date().toISOString());
        setValue(form, '#input_21', pipedriveLocationName);
        setValue(form, '#input_23', sourcePageUrl());
        setValue(
            form,
            '#input_20',
            dealTitlePrefix(form, locationSlug) + ': ' + leadLabel + ' / ' + dealSubject + ' / FormDate: '
                + dates.month + '-' + dates.day + '-' + dates.year
        );
        setValue(form, '#month_27', dates.month);
        setValue(form, '#day_27', dates.day);
        setValue(form, '#year_27', dates.year);
    }

    function captchaStatus(form, message) {
        var wrapper = form && form.querySelector('.group-inquiry-form__captcha');
        var status = form && form.querySelector('[data-captcha-status]');
        if (wrapper && wrapper.classList) {
            if (message) wrapper.classList.add('is-error');
            else wrapper.classList.remove('is-error');
        }
        if (status) status.textContent = message || '';
    }

    window.hcaptchaCallbackinput_19 = function () {
        var form = formElement();
        setValue(form, '#input_19', '1');
        captchaStatus(form, '');
    };

    window.hcaptchaExpiredCallbackinput_19 = function () {
        var form = formElement();
        setValue(form, '#input_19', '');
        captchaStatus(form, translate('form.verifyHuman', 'Please verify that you are human.'));
    };

    function init() {
        var form = formElement();
        if (!form) return;
        prepareContext(form);
        form.addEventListener('submit', function (event) {
            prepareContext(form);
            var captcha = form.querySelector('#input_19');
            if (!captcha || !captcha.value) {
                event.preventDefault();
                captchaStatus(form, translate('form.verifyHuman', 'Please verify that you are human.'));
                var captchaFrame = form.querySelector('.h-captcha');
                if (captchaFrame && typeof captchaFrame.scrollIntoView === 'function') {
                    captchaFrame.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            var submit = form.querySelector('#input_6');
            if (submit) {
                submit.disabled = true;
                submit.textContent = translate('form.sending', 'Sending…');
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
