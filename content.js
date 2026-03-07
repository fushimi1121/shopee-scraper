const ITEMS_PER_PAGE = 60;

// ========== IndexedDB初期化 ==========
let db = null;

// ========== 日時フォーマット（JST） ==========
function formatDateTime(date) {
  // 日本時間（JST = UTC+9）に変換
  const jst = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  const hours = String(jst.getUTCHours()).padStart(2, '0');
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jst.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ShopeeTrackerDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[DB] IndexedDB initialized');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[DB] Object store created');
      }
    };
  });
}

// ========== カテゴリ情報取得 ==========
const MAIN_CATEGORY_MAP = {
  '11012819': "Women's-Apparel",
  '11012963': "Men's-Wear",
  '11013350': 'Mobile-Gadgets',
  '11000001': 'Home-Living',
  '11013247': 'Computers-Peripherals',
  '11012301': 'Beauty-Personal-Care',
  '11027421': 'Home-Appliances',
  '11027491': 'Health-Wellness',
  '11011871': 'Food-Beverages',
  '11011538': 'Toys-Kids-Babies',
  '11012218': 'Kids-Fashion',
  '11013478': 'Video-Games',
  '11012018': 'Sports-Outdoors',
  '11011760': 'Hobbies-Books',
  '11013548': 'Cameras-Drones',
  '11012453': 'Pet-Supplies',
  '11012592': "Women's-Bags",
  '11012659': "Men's-Bags",
  '11013077': 'Jewellery-Accessories',
  '11012515': 'Watches',
  '11012698': "Women's-Shoes",
  '11012767': "Men's-Shoes",
  '11000002': 'Automotive',
  '11080712': 'ShopeePay-Near-Me',
  '11012255': 'Dining-Travel-Services',
  '11012566': 'Travel-Luggage',
  '11029718': 'Miscellaneous',
};

function getCategoryInfo() {
  const path = window.location.pathname;
  const match = path.match(/\/([^/]+)-cat\.(\d+)(?:\.(\d+))?/);
  if (!match) return { mainCategory: null, subCategory: null };

  const nameInUrl = match[1];
  const mainCatId = match[2];
  const subCatId = match[3];

  if (subCatId) {
    const mainCategory = MAIN_CATEGORY_MAP[mainCatId] || nameInUrl;
    return { mainCategory, subCategory: nameInUrl };
  } else {
    const mainCategory = MAIN_CATEGORY_MAP[mainCatId] || nameInUrl;
    return { mainCategory, subCategory: null };
  }
}

// ========== ページタイプ判定 ==========
function getPageType() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  
  // 検索ページ
  if (path === '/search' && params.has('keyword')) {
    return 'search';
  }
  
  // カテゴリページ
  if (path.match(/\/([^/]+)-cat\.(\d+)/)) {
    return 'category';
  }
  
  return 'other';
}

// ========== 検索キーワード取得 ==========
function getSearchKeywords() {
  const params = new URLSearchParams(window.location.search);
  const keyword = params.get('keyword');
  if (!keyword) return null;
  
  // URLデコードしてスペース区切りに戻す
  return decodeURIComponent(keyword);
}

// ========== ページ番号取得 ==========
function getCurrentPageNumber() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  return page !== null ? parseInt(page, 10) : 0;
}

// ========== ナビゲーションボタンの状態チェック ==========
function checkPrevDisabled() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('page')) return true;

  const shopeePrevBtn = document.querySelector('.shopee-icon-button--left');
  if (shopeePrevBtn) {
    const href = shopeePrevBtn.getAttribute('href');
    if (shopeePrevBtn.classList.contains('shopee-icon-button--disabled') || href === '/') {
      return true;
    }
  }
  return false;
}

function checkNextDisabled() {
  const shopeeNextBtn = document.querySelector('.shopee-icon-button--right');
  if (shopeeNextBtn) {
    const href = shopeeNextBtn.getAttribute('href');
    if (shopeeNextBtn.classList.contains('shopee-icon-button--disabled') || href === '/') {
      return true;
    }
  }
  return false;
}

// ========== ページ遷移 ==========
function navigatePrev() {
  const prevBtn = document.querySelector('.shopee-icon-button--left');
  if (prevBtn) {
    const href = prevBtn.getAttribute('href');
    if (href && href !== '/') {
      window.location.href = href;
    }
  }
}

function navigateNext() {
  const nextBtn = document.querySelector('.shopee-icon-button--right');
  if (nextBtn) {
    const href = nextBtn.getAttribute('href');
    if (href && href !== '/') {
      window.location.href = href;
    }
  }
}

// ========== フローティングボタン注入 ==========
function injectFloatingButtons() {
  const existing = document.getElementById('shopee-tracker-buttons');
  if (existing) existing.remove();

  const prevDisabled = checkPrevDisabled();
  const nextDisabled = checkNextDisabled();

  const container = document.createElement('div');
  container.id = 'shopee-tracker-buttons';
  container.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 999998;
    display: flex;
    flex-direction: column;
    gap: 3px;
  `;

  const prevBtn = createButton('BACK', prevDisabled);
  prevBtn.id = 'tracker-prev-btn';
  prevBtn.addEventListener('click', () => {
    if (!prevBtn.disabled) navigatePrev();
  });

  const extractBtn = createButton('GET', false);
  extractBtn.id = 'tracker-extract-btn';
  extractBtn.addEventListener('click', () => handleExtract());

  const nextBtn = createButton('NEXT', nextDisabled);
  nextBtn.id = 'tracker-next-btn';
  nextBtn.addEventListener('click', () => {
    if (!nextBtn.disabled) navigateNext();
  });

  const dlBtn = createButton('DL', false);
  dlBtn.id = 'tracker-dl-btn';
  dlBtn.addEventListener('click', () => handleDownload());

  container.appendChild(prevBtn);
  container.appendChild(extractBtn);
  container.appendChild(nextBtn);
  container.appendChild(dlBtn);
  document.body.appendChild(container);

  console.log(`ボタン注入完了 (BACK:${prevDisabled ? '無効' : '有効'}, NEXT:${nextDisabled ? '無効' : '有効'})`);
}

function createButton(label, disabled) {
  const btn = document.createElement('button');
  if (label === 'GET') {
    btn.innerHTML = `<span class="btn-label">${label}</span>`;
  } else {
    btn.textContent = label;
  }
  btn.disabled = disabled;
  btn.style.cssText = `
    width: 52px;
    height: 52px;
    background: ${disabled ? '#aaa' : '#ee4d2d'};
    color: white;
    border: none;
    cursor: ${disabled ? 'not-allowed' : 'pointer'};
    font-size: 11px;
    font-weight: bold;
    font-family: Arial, sans-serif;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px 0 0 4px;
    box-shadow: -2px 2px 8px rgba(0,0,0,0.25);
    opacity: ${disabled ? '0.55' : '1'};
    transition: opacity 0.2s, background 0.2s;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
  `;

  if (!disabled) {
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) btn.style.background = '#d73211';
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.disabled) btn.style.background = '#ee4d2d';
    });
  }

  return btn;
}

// ========== データ抽出ハンドラ ==========
async function handleExtract() {
  const extractBtn = document.getElementById('tracker-extract-btn');
  if (!extractBtn || extractBtn.disabled) return;

  // ページタイプチェック
  const pageType = getPageType();
  if (pageType === 'other') {
    alert('この処理はカテゴリ一覧ページまたは検索ページでのみ実行可能です。');
    return;
  }

  extractBtn.disabled = true;
  extractBtn.style.background = '#aaa';
  extractBtn.style.cursor = 'not-allowed';
  extractBtn.style.opacity = '1';
  const gifUrl = chrome.runtime.getURL('loading.gif');
  extractBtn.innerHTML = `<img src="${gifUrl}" style="width:32px;height:32px;display:block;" />`;

  const totalStart = performance.now();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' [START] GETボタン押下', new Date().toLocaleTimeString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const step0Start = performance.now();
    console.log('[STEP 0] 全件レンダリングのためスクロール開始...');
    await scrollToRenderAll();
    const step0Time = (performance.now() - step0Start).toFixed(0);
    console.log(`[STEP 0] スクロール完了 (${step0Time}ms)`);

    const step1Start = performance.now();
    console.log('[STEP 1] DOM抽出 開始...');

    const products = extractProductData();

    const step1Time = (performance.now() - step1Start).toFixed(0);
    console.log(`[STEP 1] DOM抽出 完了 → ${products.length}件取得 (${step1Time}ms)`);

    if (products.length === 0) {
      console.warn('[STEP 1] 取得件数が0件のため処理中断');
      showNotification('データ取得エラーが発生しました。', true);
      return;
    }

    const step2Start = performance.now();
    console.log(`[STEP 2] IndexedDBへの保存 開始... (${products.length}件)`);

    await saveToIndexedDB(products);

    const step2Time = (performance.now() - step2Start).toFixed(0);
    console.log(`[STEP 2] IndexedDBへの保存 完了 (${step2Time}ms)`);

    showNotification(`${products.length}件のデータを保存しました。`);
  } catch (error) {
    const totalTime = (performance.now() - totalStart).toFixed(0);
    console.error(`NG: [ERROR] 処理中断 (${totalTime}ms):`, error);
    showNotification('データ取得エラーが発生しました。', true);
  } finally {
    setTimeout(() => {
      const btn = document.getElementById('tracker-extract-btn');
      if (btn) {
        btn.disabled = false;
        btn.style.background = '#ee4d2d';
        btn.style.cursor = 'pointer';
        btn.style.opacity = '1';
        btn.innerHTML = '<span class="btn-label">GET</span>';
      }
    }, 3000);
  }
}

// ========== データ抽出 ==========
function extractProductData() {
  const productItems = document.querySelectorAll('li.shopee-search-item-result__item');
  const pageNumber = getCurrentPageNumber();
  const pageType = getPageType();
  
  let mainCategory = null, subCategory = null, keywords = null;
  
  if (pageType === 'category') {
    const categoryInfo = getCategoryInfo();
    mainCategory = categoryInfo.mainCategory;
    subCategory = categoryInfo.subCategory;
    console.log(`   🔍 対象商品数: ${productItems.length}件 (page=${pageNumber})`);
    console.log(`   カテゴリ: mainCategory=${mainCategory} / subCategory=${subCategory}`);
  } else if (pageType === 'search') {
    keywords = getSearchKeywords();
    console.log(`   🔍 対象商品数: ${productItems.length}件 (page=${pageNumber})`);
    console.log(`   検索キーワード: "${keywords}"`);
  }

  const products = [];
  let skipCount = 0;

  productItems.forEach((item, index) => {
    try {
      // 商品名
      const nameElement = item.querySelector('.whitespace-normal.line-clamp-2');
      let productName = '';
      if (nameElement) {
        const textNodes = Array.from(nameElement.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .join(' ');
        productName = textNodes.trim() || nameElement.textContent.trim();
      }

      // 価格
      let price = '';
      const spanCandidates = item.querySelectorAll('span.truncate.font-medium');
      for (const span of spanCandidates) {
        if ((span.className || '').includes('text-base')) {
          price = span.textContent.trim();
          break;
        }
      }

      // 販売数（英語・日本語対応）
      const soldElement = item.querySelector('.truncate.text-shopee-black87.text-xs.min-h-4');
      let soldCount = 0;
      if (soldElement) {
        const soldRaw = soldElement.textContent.trim();
        if (soldRaw) {
          // 英語: "2k+ sold", "9 sold"
          // 日本語: "2,000個以上販売", "9個販売しました"
          
          // カンマを削除
          let soldText = soldRaw.replace(/,/g, '');
          
          // 数字とkを抽出（大文字小文字問わず）
          const match = soldText.match(/([0-9.]+)\s*k/i);
          if (match) {
            // "2k" → 2000
            soldCount = parseFloat(match[1]) * 1000;
          } else {
            // 数字のみを抽出
            const numMatch = soldText.match(/([0-9]+)/);
            if (numMatch) {
              soldCount = parseInt(numMatch[1], 10);
            }
          }
        }
      }

      // URL
      const linkElement = item.querySelector('a[href*="/"]');
      const url = linkElement ? linkElement.href : '';

      // 画像URL
      const imgElement = item.querySelector('img[src*="susercontent.com"]');
      const imgSrc = imgElement ? imgElement.src : '';

      // 割引率
      let discountRate = null;
      const discountDiv = item.querySelector('.text-shopee-primary.font-medium.bg-shopee-pink');
      if (discountDiv) {
        const discountText = discountDiv.textContent.trim();
        if (discountText) {
          discountRate = discountText;
        }
      }

      // 発送元（検索ページのみ・翻訳対応）
      let shippingAria = null;
      if (pageType === 'search') {
        // 方法1: aria-labelから取得（翻訳前）
        const locationLabel = item.querySelector('[data-testid="a11y-label"][aria-label^="location-"]');
        if (locationLabel) {
          const ariaLabel = locationLabel.getAttribute('aria-label');
          shippingAria = ariaLabel.replace('location-', '');
        }
        
        // 方法2: テキストノードから直接取得（翻訳後も対応）
        // 翻訳後: <span class="ml-[3px] align-middle"><font>中国本土</font></span>
        if (!shippingAria) {
          // CSSセレクタのエスケープ処理: [3px] → \[3px\]
          const locationSpan = item.querySelector('span.align-middle');
          if (locationSpan && locationSpan.classList.contains('ml-[3px]')) {
            shippingAria = locationSpan.textContent.trim();
          }
        }
      }

      // 表示順
      const displayOrder = pageNumber * ITEMS_PER_PAGE + (index + 1);

      // 商品ID生成（URLから抽出）
      let productId = null;
      const urlMatch = url.match(/i\.(\d+)\.(\d+)/);
      if (urlMatch) {
        productId = parseInt(`${urlMatch[1]}${urlMatch[2]}`);
      } else {
        productId = Date.now() + index;
      }

      if (productName && price && url) {
        const baseData = {
          id: productId,
          name: productName,
          name_ja: null,
          url: url,
          img_src: imgSrc,
          discount_rate: discountRate,
          display_order: displayOrder,
          price: price,
          sold_count: soldCount,
          timestamp: formatDateTime(new Date())
        };

        if (pageType === 'category') {
          products.push({
            ...baseData,
            main_category: mainCategory,
            sub_category: subCategory,
          });
        } else if (pageType === 'search') {
          products.push({
            ...baseData,
            keywords: keywords,
            shipping_aria: shippingAria,
          });
        }
      } else {
        skipCount++;
      }
    } catch (error) {
      console.error(`NG: Item ${index} 抽出エラー:`, error);
      skipCount++;
    }
  });

  if (skipCount > 0) {
    console.log(` WARN: スキップ合計: ${skipCount}件`);
  }

  return products;
}

// ========== IndexedDBに保存 ==========
async function saveToIndexedDB(products) {
  if (!db) await initDB();

  const transaction = db.transaction(['products'], 'readwrite');
  const store = transaction.objectStore('products');

  for (const product of products) {
    store.put(product);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log('[DB] 保存完了:', products.length, '件');
      resolve();
    };
    transaction.onerror = () => {
      console.error('[DB] 保存エラー:', transaction.error);
      reject(transaction.error);
    };
  });
}

// ========== CSV DL & DB削除 ==========
async function handleDownload() {
  console.log('[DL] CSV DL開始');

  if (!db) await initDB();

  const transaction = db.transaction(['products'], 'readonly');
  const store = transaction.objectStore('products');
  const request = store.getAll();

  request.onsuccess = () => {
    const products = request.result;

    if (products.length === 0) {
      alert('保存されているデータがありません');
      return;
    }

    console.log('[DL] データ取得:', products.length, '件');

    // データタイプ判定（最初の商品から）
    const isCategoryData = products.length > 0 && 'main_category' in products[0];
    const isSearchData = products.length > 0 && 'keywords' in products[0];

    // ソート
    if (isCategoryData) {
      // カテゴリページ: main_category → sub_category → display_order
      products.sort((a, b) => {
        const mainA = a.main_category || '';
        const mainB = b.main_category || '';
        if (mainA < mainB) return -1;
        if (mainA > mainB) return 1;
        
        const subA = a.sub_category ?? '';
        const subB = b.sub_category ?? '';
        if (subA !== subB) {
          if (subA === '') return 1;
          if (subB === '') return -1;
          if (subA < subB) return -1;
          if (subA > subB) return 1;
        }
        
        return (a.display_order || 0) - (b.display_order || 0);
      });
    } else if (isSearchData) {
      // 検索ページ: keywords → display_order
      products.sort((a, b) => {
        const kwA = a.keywords || '';
        const kwB = b.keywords || '';
        if (kwA < kwB) return -1;
        if (kwA > kwB) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      });
    }

    console.log('[DL] ソート完了');

    // CSV生成（データタイプに応じて）
    let headers, rows;
    
    if (isCategoryData) {
      headers = [
        'id', 'name', 'name_ja', 'main_category', 'sub_category',
        'url', 'img_src', 'discount_rate', 'display_order',
        'price', 'sold_count', 'timestamp'
      ];
      rows = products.map(p => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.name_ja || '',
        p.main_category || '',
        p.sub_category || '',
        p.url || '',
        p.img_src || '',
        p.discount_rate || '',
        p.display_order || '',
        p.price || '',
        p.sold_count || '',
        p.timestamp || ''
      ]);
    } else if (isSearchData) {
      headers = [
        'id', 'name', 'name_ja', 'keywords',
        'url', 'img_src', 'discount_rate', 'display_order',
        'price', 'sold_count', 'timestamp', 'shipping_aria'
      ];
      rows = products.map(p => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.name_ja || '',
        p.keywords || '',
        p.url || '',
        p.img_src || '',
        p.discount_rate || '',
        p.display_order || '',
        p.price || '',
        p.sold_count || '',
        p.timestamp || '',
        p.shipping_aria || ''
      ]);
    } else {
      alert('不明なデータ形式です');
      return;
    }

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 日本時間（JST = UTC+9）でファイル名生成
    const now = new Date();
    const jst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const year = jst.getUTCFullYear();
    const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jst.getUTCDate()).padStart(2, '0');
    const hours = String(jst.getUTCHours()).padStart(2, '0');
    const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jst.getUTCSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    link.download = `shopee_products_${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('[DL] CSV DL完了');

    // DB削除
    clearDatabase();
  };

  request.onerror = () => {
    console.error('[DL] データ取得エラー:', request.error);
    alert('データ取得に失敗しました');
  };
}

// ========== DB全削除 ==========
async function clearDatabase() {
  if (!db) await initDB();

  const transaction = db.transaction(['products'], 'readwrite');
  const store = transaction.objectStore('products');
  const request = store.clear();

  request.onsuccess = () => {
    console.log('[DB] 全データ削除完了');
    showNotification('CSV DL完了。データベースをクリアしました。');
  };

  request.onerror = () => {
    console.error('[DB] 削除エラー:', request.error);
  };
}

// ========== 全件レンダリング用スクロール ==========
function scrollToRenderAll() {
  return new Promise((resolve) => {
    const items = document.querySelectorAll('li.shopee-search-item-result__item');
    if (items.length === 0) {
      resolve();
      return;
    }

    let currentIndex = 0;
    const totalItems = items.length;
    const scrollStep = Math.ceil(totalItems / 6);

    console.log(`${totalItems}件を${Math.ceil(totalItems / scrollStep)}回に分けてスクロール`);

    function scrollNext() {
      const targetIndex = Math.min(currentIndex + scrollStep, totalItems - 1);
      items[targetIndex].scrollIntoView({ behavior: 'instant', block: 'center' });
      currentIndex = targetIndex;

      if (currentIndex >= totalItems - 1) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          console.log('スクロール完了、先頭に戻りました');
          setTimeout(resolve, 300);
        }, 200);
      } else {
        setTimeout(scrollNext, 150);
      }
    }

    scrollNext();
  });
}

// ========== 通知表示 ==========
function showNotification(message, isError = false) {
  const existing = document.getElementById('shopee-tracker-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'shopee-tracker-notification';
  notification.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: ${isError ? '#e74c3c' : '#26aa99'};
    color: white;
    padding: 12px 18px;
    border-radius: 4px;
    z-index: 999999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: trackerSlideIn 0.3s ease-out;
  `;

  if (!document.getElementById('shopee-tracker-style')) {
    const style = document.createElement('style');
    style.id = 'shopee-tracker-style';
    style.textContent = `
      @keyframes trackerSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);   opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    width: 22px; height: 22px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 13px; flex-shrink: 0;
  `;
  iconDiv.textContent = isError ? '✕' : '✓';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  notification.appendChild(iconDiv);
  notification.appendChild(textSpan);
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, 4000);
}

// ========== 初期化 ==========
function init() {
  console.log('[INIT] Shopee Tracker 初期化...');

  // IndexedDB初期化
  initDB();

  if (document.querySelectorAll('li.shopee-search-item-result__item').length > 0) {
    injectFloatingButtons();
    return;
  }

  const btnObserver = new MutationObserver(() => {
    if (document.querySelectorAll('li.shopee-search-item-result__item').length > 0) {
      setTimeout(() => {
        injectFloatingButtons();
        btnObserver.disconnect();
      }, 1000);
    }
  });

  btnObserver.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (!document.getElementById('shopee-tracker-buttons')) {
      console.log('フォールバック: ボタンを強制注入');
      injectFloatingButtons();
    }
  }, 5000);
}

init();
console.log('Content script 初期化完了');
