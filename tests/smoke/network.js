const VIDEO_MEDIA_RE = /\.(mp4|webm)(?:\?.*)?$/i;

const EXTERNAL_MARKETING_URLS = [
  /https:\/\/www\.googletagmanager\.com\/gtm\.js.*/i,
  /https:\/\/www\.googletagmanager\.com\/ns\.html.*/i,
  /https:\/\/static\.klaviyo\.com\/.*/i,
  /https:\/\/.*\.klaviyo\.com\/.*/i,
];

const EXTERNAL_FORM_URLS = [
  /https:\/\/hcaptcha\.com\/.*/i,
  /https:\/\/.*\.hcaptcha\.com\/.*/i,
];

async function blockHeavyMedia(page) {
  await page.route(VIDEO_MEDIA_RE, (route) => route.abort());
}

async function blockExternalMarketing(page) {
  for (const pattern of EXTERNAL_MARKETING_URLS) {
    await page.route(pattern, (route) => route.abort());
  }
}

async function blockExternalForms(page) {
  for (const pattern of EXTERNAL_FORM_URLS) {
    await page.route(pattern, (route) => route.abort());
  }
}

async function prepareSmokePage(page) {
  await blockHeavyMedia(page);
  await blockExternalMarketing(page);
  await blockExternalForms(page);
}

module.exports = {
  blockExternalForms,
  blockExternalMarketing,
  blockHeavyMedia,
  prepareSmokePage,
};
