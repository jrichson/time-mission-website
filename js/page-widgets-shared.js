(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function shouldLimitAutoplayMedia() {
        var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        var effectiveType = connection && typeof connection.effectiveType === 'string'
            ? connection.effectiveType
            : '';
        return prefersReducedMotion()
            || Boolean(connection && connection.saveData)
            || effectiveType === 'slow-2g'
            || effectiveType === '2g';
    }

    function runAfterFirstPaint(callback) {
        var run = function () {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(callback, { timeout: 1800 });
            } else {
                window.setTimeout(callback, 800);
            }
        };
        if (document.readyState === 'complete') {
            run();
        } else {
            window.addEventListener('load', run, { once: true });
        }
    }

    function runWhenVisible(element, onEnter, onExit, rootMargin) {
        if (!element || typeof onEnter !== 'function') return null;
        if (!('IntersectionObserver' in window)) {
            onEnter();
            return null;
        }
        var wasVisible = false;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    if (!wasVisible) {
                        wasVisible = true;
                        onEnter();
                    }
                } else if (wasVisible) {
                    wasVisible = false;
                    if (typeof onExit === 'function') onExit();
                }
            });
        }, { rootMargin: rootMargin || '200px 0px', threshold: 0.01 });
        observer.observe(element);
        return observer;
    }

    widgets.prefersReducedMotion = prefersReducedMotion;
    widgets.shouldLimitAutoplayMedia = shouldLimitAutoplayMedia;
    widgets.runAfterFirstPaint = runAfterFirstPaint;
    widgets.runWhenVisible = runWhenVisible;
})();
