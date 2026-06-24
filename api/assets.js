const TOKEN = '989f715374f4d4d86db1db0d122e26c5b5694e788f15ed0bf105157ce2c8fa81';
const COLLECTION = '69af8962ca190fcd5aa92c49';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    let all = [], offset = 0;
    while (true) {
      const r = await fetch(`https://api.webflow.com/v2/collections/${COLLECTION}/items/live?limit=100&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'accept': 'application/json' }
      });
      if (!r.ok) throw new Error('Webflow ' + r.status);
      const d = await r.json();
      const items = d.items || [];
      all = all.concat(items);
      offset += items.length;
      if (items.length < 100 || offset >= (d.pagination?.total || 0)) break;
    }
    const assets = all.map(item => {
      const fd = item.fieldData || {};
      const g = f => !f ? '' : typeof f === 'string' ? f : f.url || '';
      const thumb = g(fd['main-image']) || g(fd['thumbnail']) || g(fd['image']) || g(fd['photo']) || '';
      return {
        id: item.id,
        name: fd['name'] || fd['title'] || fd['slug'] || item.id,
        code: fd['code'] || fd['slug'] || '',
        thumbnail: thumb,
        downloadUrl: g(fd['asset-file']) || g(fd['file']) || g(fd['download']) || thumb,
        slug: fd['slug'] || '',
        premium: fd['premium'] === true,
      };
    });
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(200).json({ assets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
