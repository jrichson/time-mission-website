(function () {
    'use strict';

    var widgets = window.TMPageWidgets || {};

    function requireWidget(name) {
        if (typeof widgets[name] !== 'function') {
            throw new Error('TMPageWidgets missing required initializer: ' + name);
        }
        return widgets[name];
    }

    var initHeroVideo = requireWidget('initHeroVideo');
    var initTagline = requireWidget('initTagline');
    var initMinutesCycler = requireWidget('initMinutesCycler');
    var initPointsCounter = requireWidget('initPointsCounter');
    var initExperiencesCarousel = requireWidget('initExperiencesCarousel');
    var initMiniFaq = requireWidget('initMiniFaq');
    var initTestimonialsSimple = requireWidget('initTestimonialsSimple');
    var initTestimonialsTransform = requireWidget('initTestimonialsTransform');
    var initPressTicker = requireWidget('initPressTicker');
    var initRevealOnScroll = requireWidget('initRevealOnScroll');
    var initSmoothScroll = requireWidget('initSmoothScroll');
    var initGamePopup = requireWidget('initGamePopup');

    function initCommonPage(config, options) {
        var opts = options || {};
        var taglines = Array.isArray(config.taglines) ? config.taglines : [];
        if (config.heroVideo !== false) initHeroVideo();
        var tagline = initTagline(taglines, {
            initialCity: opts.initialCity || null,
            initialHoldMs: opts.initialHoldMs || 3000,
            mobileLocationHoldMs: 5000,
            translationKey: 'home.taglines'
        });
        window.updateEyebrowLocation = opts.updateEyebrow === false
            ? function () {}
            : function (newCity) { tagline.setEyebrowToLocation(newCity); };
        if (opts.updateEyebrow !== false && window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
            window.TM.ready.then(function () {
                var loc = window.TM.current || null;
                if (loc && (loc.shortName || loc.name)) window.updateEyebrowLocation(loc.shortName || loc.name);
            });
        }

        initMinutesCycler();
        initPointsCounter();
        initExperiencesCarousel();
        initMiniFaq();
        if (opts.testimonials === 'transform') initTestimonialsTransform();
        else initTestimonialsSimple();
        initPressTicker();
        initRevealOnScroll();
        initSmoothScroll();
        initGamePopup(config.gamePopup === true);
    }

    function initCity(config) {
        if (!config || typeof config !== 'object') return;
        initCommonPage(config, {
            initialCity: config.city || '',
            initialHoldMs: 3500,
            testimonials: 'simple',
            updateEyebrow: true,
        });
    }

    function initIndex(config) {
        if (!config || typeof config !== 'object') return;
        initCommonPage(config, {
            initialCity: null,
            initialHoldMs: 3000,
            testimonials: 'transform',
            updateEyebrow: true,
        });
    }

    function initFromPageInit(pageInit) {
        if (!pageInit || typeof pageInit !== 'object') return;
        if (pageInit.mode === 'city') {
            initCity(pageInit.config);
            return;
        }
        if (pageInit.mode === 'index') {
            initIndex(pageInit.config);
        }
    }

    window.TMPage = {
        initCity: initCity,
        initIndex: initIndex,
        initFromPageInit: initFromPageInit,
    };

    initFromPageInit(window.__TM_PAGE_INIT__);
})();
