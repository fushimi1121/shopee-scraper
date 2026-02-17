importScripts('config.js');


const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// 同時並列数（多すぎるとFirestoreのレートリミットに当たる）
const CONCURRENCY_LIMIT = 10;

// ========== メッセージ受信 ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);

  if (request.action === 'saveToFirestore') {
    console.log('Saving products:', request.products.length);

    saveProductData(request.products)
      .then(() => {
        console.log('OK: Save completed successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('NG: Firestore保存エラー:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

// ========== データ保存メイン（並列バッチ処理） ==========
async function saveProductData(products) {
  const today = new Date().toISOString().split('T')[0];
  const saveStart = performance.now();
  let successCount = 0;
  let errorCount = 0;

  console.log('─────────────────────────────────');
  console.log(`[BG] 保存開始: ${products.length}件 / ${today}`);
  console.log(`[BG] 並列数: ${CONCURRENCY_LIMIT}件/バッチ`);
  console.log('─────────────────────────────────');

  // CONCURRENCY_LIMITずつバッチに分割して並列実行
  for (let i = 0; i < products.length; i += CONCURRENCY_LIMIT) {
    const batch = products.slice(i, i + CONCURRENCY_LIMIT);
    const batchNum = Math.floor(i / CONCURRENCY_LIMIT) + 1;
    const totalBatches = Math.ceil(products.length / CONCURRENCY_LIMIT);
    const batchStart = performance.now();

    console.log(`[BG] バッチ ${batchNum}/${totalBatches} 開始 (${batch.length}件)`);

    // バッチ内を並列実行
    const results = await Promise.allSettled(
      batch.map(product => saveProduct(product, today))
    );

    const batchTime = (performance.now() - batchStart).toFixed(0);
    const batchSuccess = results.filter(r => r.status === 'fulfilled').length;
    const batchError = results.filter(r => r.status === 'rejected').length;

    // エラーがあればログ出力
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(`   NG: [BG] バッチ${batchNum}[${idx}] 失敗:`, result.reason?.message);
      }
    });

    successCount += batchSuccess;
    errorCount += batchError;

    const elapsed = (performance.now() - saveStart).toFixed(0);
    console.log(`   OK: バッチ ${batchNum}/${totalBatches} 完了 | ${batchTime}ms | 成功:${batchSuccess} 失敗:${batchError} | 累計:${successCount}件 / ${elapsed}ms経過`);
  }

  const totalTime = (performance.now() - saveStart).toFixed(0);
  const avg = (totalTime / (successCount || 1)).toFixed(0);

  console.log('─────────────────────────────────');
  console.log(`  [BG] 保存完了サマリ`);
  console.log(`   OK: 成功: ${successCount}件 / NG: 失敗: ${errorCount}件`);
  console.log(`   TIME: 全体所要時間: ${totalTime}ms`);
  console.log(`   AVG: 1件あたり平均: ${avg}ms/件`);
  console.log('─────────────────────────────────');
}

// ========== 1商品の保存（info + history を並列実行） ==========
async function saveProduct(product, date) {
  const productId = extractProductId(product.url);
  if (!productId) {
    throw new Error(`商品ID抽出失敗: ${product.url}`);
  }

  // saveProductInfo と saveProductHistory を並列実行
  await Promise.all([
    saveProductInfo(productId, product),
    saveProductHistory(productId, date, product)
  ]);
}

// ========== 商品基本情報保存（初回のみ） ==========
async function saveProductInfo(productId, product) {
  const docPath = `products/${productId}`;
  const url = `${FIRESTORE_BASE_URL}/${docPath}?key=${FIREBASE_CONFIG.apiKey}`;

  // GET: 既存データ確認
  const existingDoc = await fetch(url).then(r => r.ok ? r.json() : null);

  if (!existingDoc) {
    const data = {
      fields: {
        name: { stringValue: product.name },
        url:  { stringValue: product.url },
        firstSeenAt: { timestampValue: new Date().toISOString() }
      }
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`INFO PATCH error: ${response.status} - ${errorText}`);
    }
  }
}

// ========== 履歴データ保存（日毎・最新値で上書き） ==========
async function saveProductHistory(productId, date, product) {
  const docPath = `products/${productId}/history/${date}`;
  const url = `${FIRESTORE_BASE_URL}/${docPath}?key=${FIREBASE_CONFIG.apiKey}`;

  const priceValue = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;

  const fields = {
    price:        { doubleValue: priceValue },
    soldCount:    { integerValue: String(product.soldCount || 0) },
    displayOrder: { integerValue: String(product.displayOrder || 0) },
    timestamp:    { timestampValue: new Date().toISOString() }
  };

  if (product.discountRate !== null && product.discountRate !== undefined) {
    fields.discountRate = { stringValue: String(product.discountRate) };
  } else {
    fields.discountRate = { nullValue: null };
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HIST PATCH error: ${response.status} - ${errorText}`);
  }
}

// ========== URLから商品IDを抽出 ==========
function extractProductId(url) {
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (match) {
    return `${match[1]}_${match[2]}`;
  }
  return null;
}
