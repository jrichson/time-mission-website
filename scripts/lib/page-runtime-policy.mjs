export function compilePageRuntimeContract(source) {
  const text = String(source || '');
  return {
    exposesFacade: text.includes('window.TMPage'),
    hasCityInitializer: text.includes('initCity'),
    hasIndexInitializer: text.includes('initIndex'),
    supportsInlineConfig: text.includes('window.__TM_PAGE_INIT__'),
    gatesHeroMediaAfterPaint: text.includes('runAfterFirstPaint(function ()') && text.includes('source[data-src]'),
    preservesEyebrowHook: text.includes('window.updateEyebrowLocation'),
  };
}

export function inspectPageRuntime(source, relPath = 'js/page-widgets.js') {
  const contract = compilePageRuntimeContract(source);
  const errors = [];
  if (!contract.exposesFacade) errors.push(`${relPath} must expose window.TMPage`);
  if (!contract.hasCityInitializer) errors.push(`${relPath} must keep the city page initializer`);
  if (!contract.hasIndexInitializer) errors.push(`${relPath} must keep the index page initializer`);
  if (!contract.supportsInlineConfig) errors.push(`${relPath} must support window.__TM_PAGE_INIT__ auto-init`);
  if (!contract.gatesHeroMediaAfterPaint) errors.push(`${relPath} must lazy-load hero media after first paint`);
  if (!contract.preservesEyebrowHook) errors.push(`${relPath} must preserve the nav eyebrow hook`);
  return errors;
}
