console.log('🔥 Background.js loaded');

const FIREBASE_CONFIG = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
};

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

console.log('🔥 Firebase config loaded:', {
  projectId: FIREBASE_CONFIG.projectId,
  apiKeySet: !!FIREBASE_CONFIG.apiKey
});

// ========== メッセージ受信 ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 Message received:', request.action);

  if (request.action === 'saveToFirestore') {
    console.log('💾 Saving products:', request.products.length);

    saveProductData(request.products)
      .then(() => {
        console.log('✅ Save completed successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Firestore保存エラー:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 非同期レスポンスを有効化
  }
});

// ========== データ保存メイン ==========
async function saveProductData(products) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      const productId = extractProductId(product.url);
      if (!productId) {
        console.warn('商品IDを抽出できませんでした:', product.url);
        errorCount++;
        continue;
      }

      await saveProductInfo(productId, product);
      await saveProductHistory(productId, today, product);

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`✓ 保存進捗: ${successCount}/${products.length}件`);
      }
    } catch (error) {
      errorCount++;
      console.error('保存エラー:', error.message, product.name?.substring(0, 30));
    }
  }

  console.log(`📊 保存結果: 成功 ${successCount}件 / 失敗 ${errorCount}件`);
}

// ========== 商品基本情報保存（初回のみ） ==========
async function saveProductInfo(productId, product) {
  const docPath = `products/${productId}`;
  const url = `${FIRESTORE_BASE_URL}/${docPath}?key=${FIREBASE_CONFIG.apiKey}`;

  try {
    // 既存データを確認
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
        throw new Error(`Firestore API error: ${response.status} - ${errorText}`);
      }
    }
  } catch (error) {
    console.error(`商品情報保存エラー (${productId}):`, error);
    throw error;
  }
}

// ========== 履歴データ保存（日毎・最新値で上書き） ==========
async function saveProductHistory(productId, date, product) {
  const docPath = `products/${productId}/history/${date}`;
  const url = `${FIRESTORE_BASE_URL}/${docPath}?key=${FIREBASE_CONFIG.apiKey}`;

  try {
    // 価格から数値のみ抽出（例: "15.57" → 15.57）
    const priceValue = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;

    const fields = {
      price:        { doubleValue: priceValue },
      soldCount:    { integerValue: String(product.soldCount || 0) },
      displayOrder: { integerValue: String(product.displayOrder || 0) },
      timestamp:    { timestampValue: new Date().toISOString() }
    };

    // discountRate: 値があればstringValue、なければnullValue
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
      throw new Error(`Firestore API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`履歴保存エラー (${productId}/${date}):`, error);
    throw error;
  }
}

// ========== URLから商品IDを抽出 ==========
function extractProductId(url) {
  // 例: https://shopee.sg/product-name-i.123456.789012345
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (match) {
    return `${match[1]}_${match[2]}`;
  }
  return null;
}
