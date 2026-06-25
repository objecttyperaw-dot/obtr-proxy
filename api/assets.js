const TOKEN = '989f715374f4d4d86db1db0d122e26c5b5694e788f15ed0bf105157ce2c8fa81';
const COLLECTION = '69af8962ca190fcd5aa92c49';

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let all = [], offset = 0;

    while (true) {
      const r = await fetch(
        `https://api.webflow.com/v2/collections/${COLLECTION}/items/live?limit=100&offset=${offset}`,
        { headers: { 'Authorization': `Bearer ${TOKEN}`, 'accept': 'application/json' } }
      );
      if (!r.ok) throw new Error('Webflow ' + r.status);
      const d = await r.json();
      const items = d.items || [];
      all = all.concat(items);
      offset += items.length;
      if (items.length < 100 || offset >= (d.pagination ? d.pagination.total : 0)) break;
    }

    const assets = all.map(function(item) {
      const fd = item.fieldData || {};

      // Helper: extract URL from Webflow image/file field (object or string)
      function url(f) {
        if (!f) return '';
        if (typeof f === 'string') return f;
        if (f.url) return f.url;
        return '';
      }

      // Thumbnail: small preview for grid display (fast loading)
      const thumbnail = url(fd['thumbnail']);

      // 4K image: "large-preview" field — 3240×4050px
      const largePreview = url(fd['large-preview']);

      // Download asset: "asset" field — full 4K file
      const assetFile = url(fd['asset']);

      // downloadUrl priority: asset field → large-preview → thumbnail
      const downloadUrl = assetFile || largePreview || thumbnail;

      // Thumbnail for grid: use thumbnail field for fast loading
      // If no thumbnail, fall back to large-preview
      const gridThumb = thumbnail || largePreview;

      return {
        id:          item.id,
        name:        fd['object-name'] || fd['name'] || fd['title'] || fd['slug'] || item.id,
        code:        fd['object-code'] || fd['code'] || fd['slug'] || '',
        thumbnail:   gridThumb,
        largePreview: largePreview,
        downloadUrl: downloadUrl,
        slug:        fd['slug'] || '',
        premium:     fd['premium'] === true || fd['is-premium'] === true,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ assets: assets, total: assets.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
