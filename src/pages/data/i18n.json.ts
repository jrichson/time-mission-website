import i18nData from '../../data/site/i18n.json';

export function GET() {
    return new Response(JSON.stringify(i18nData), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
