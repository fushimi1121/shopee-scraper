// ========== IndexedDB初期化 ==========
let db = null;

// ========== 日時フォーマット（JST） ==========
function formatDateTime(date) {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[DB] IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        const store = db.createObjectStore(DB_STORE_NAME, { keyPath: 'id' });
        store.createIndex(DB_INDEX_NAME, DB_INDEX_NAME, { unique: false });
        console.log('[DB] Object store created');
      }
    };
  });
}

// ========== カテゴリ情報取得 ==========
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

// ========== 抽出元サイトTLD取得 ==========
function getSiteTld() {
  const host = window.location.hostname || '';
  if (host.includes('shopee.co.th')) return 'th';
  if (host.includes('shopee.com.my')) return 'my';
  if (host.includes('shopee.com.sg') || host === 'shopee.sg') return 'sg';
  if (host.includes('shopee.ph')) return 'ph';
  if (host.includes('shopee.tw')) return 'tw';
  if (host.includes('shopee.vn')) return 'vn';
  return 'sg';
}

// ========== 通貨単位ラベル取得 ==========
function getCurrencyUnitLabel() {
  const tld = getSiteTld();
  return CURRENCY_UNIT_BY_SITE[tld] || '';
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

  const shopeePrevBtn = document.querySelector(SELECTOR_NAV_PREV);
  if (shopeePrevBtn) {
    const href = shopeePrevBtn.getAttribute('href');
    if (shopeePrevBtn.classList.contains('shopee-icon-button--disabled') || href === '/') {
      return true;
    }
  }
  return false;
}

function checkNextDisabled() {
  const shopeeNextBtn = document.querySelector(SELECTOR_NAV_NEXT);
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
  const prevBtn = document.querySelector(SELECTOR_NAV_PREV);
  if (prevBtn) {
    const href = prevBtn.getAttribute('href');
    if (href && href !== '/') {
      window.location.href = href;
    }
  }
}

function navigateNext() {
  const nextBtn = document.querySelector(SELECTOR_NAV_NEXT);
  if (nextBtn) {
    const href = nextBtn.getAttribute('href');
    if (href && href !== '/') {
      window.location.href = href;
    }
  }
}

// ========== フローティングボタン注入 ==========
function injectFloatingButtons() {
  const existing = document.getElementById(ID_BUTTON_CONTAINER);
  if (existing) existing.remove();

  const prevDisabled = checkPrevDisabled();
  const nextDisabled = checkNextDisabled();

  const container = document.createElement('div');
  container.id = ID_BUTTON_CONTAINER;
  container.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: ${BUTTON_Z_INDEX};
    display: flex;
    flex-direction: column;
    gap: 3px;
  `;

  const prevBtn = createButton('BACK', prevDisabled);
  prevBtn.id = ID_PREV_BTN;
  prevBtn.addEventListener('click', () => {
    if (!prevBtn.disabled) navigatePrev();
  });

  const extractBtn = createButton('GET', false);
  extractBtn.id = ID_EXTRACT_BTN;
  extractBtn.addEventListener('click', () => handleExtract());

  const nextBtn = createButton('NEXT', nextDisabled);
  nextBtn.id = ID_NEXT_BTN;
  nextBtn.addEventListener('click', () => {
    if (!nextBtn.disabled) navigateNext();
  });

  const dlBtn = createButton('DL', false);
  dlBtn.id = ID_DL_BTN;
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
    width: ${BUTTON_WIDTH}px;
    height: ${BUTTON_HEIGHT}px;
    background: ${disabled ? BUTTON_DISABLED_COLOR : BUTTON_PRIMARY_COLOR};
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
    opacity: ${disabled ? BUTTON_DISABLED_OPACITY : '1'};
    transition: opacity 0.2s, background 0.2s;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
  `;

  if (!disabled) {
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) btn.style.background = BUTTON_PRIMARY_HOVER_COLOR;
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.disabled) btn.style.background = BUTTON_PRIMARY_COLOR;
    });
  }

  return btn;
}

// ========== データ抽出ハンドラ ==========
async function handleExtract() {
  const extractBtn = document.getElementById(ID_EXTRACT_BTN);
  if (!extractBtn || extractBtn.disabled) return;

  // ページタイプチェック
  const pageType = getPageType();
  if (pageType === 'other') {
    alert('この処理はカテゴリ一覧ページまたは検索ページでのみ実行可能です。');
    return;
  }

  extractBtn.disabled = true;
  extractBtn.style.background = BUTTON_DISABLED_COLOR;
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
      const btn = document.getElementById(ID_EXTRACT_BTN);
      if (btn) {
        btn.disabled = false;
        btn.style.background = BUTTON_PRIMARY_COLOR;
        btn.style.cursor = 'pointer';
        btn.style.opacity = '1';
        btn.innerHTML = '<span class="btn-label">GET</span>';
      }
    }, EXTRACT_BUTTON_RESET_DELAY_MS);
  }
}

// ========== データ抽出 ==========
function extractProductData() {
  const productItems = document.querySelectorAll(SELECTOR_PRODUCT_ITEMS);
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
      const nameElement = item.querySelector(SELECTOR_PRODUCT_NAME);
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
      const spanCandidates = item.querySelectorAll(SELECTOR_PRICE_CANDIDATES);
      for (const span of spanCandidates) {
        if ((span.className || '').includes(SELECTOR_PRICE_CLASS_INCLUDE)) {
          // 桁区切りカンマを除去（ph など 1,030 形式で表示される場合の CSV カラム分割を防ぐ）
          price = span.textContent.trim().replace(/,/g, '');
          break;
        }
      }

      // 販売数（英語・日本語対応）
      const soldElement = item.querySelector(SELECTOR_SOLD);
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
      const linkElement = item.querySelector(SELECTOR_PRODUCT_LINK);
      const url = linkElement ? linkElement.href : '';

      // 画像URL
      const imgElement = item.querySelector(SELECTOR_PRODUCT_IMAGE);
      const imgSrc = imgElement ? imgElement.src : '';

      // 割引率
      let discountRate = null;
      const discountDiv = item.querySelector(SELECTOR_DISCOUNT);
      if (discountDiv) {
        const discountText = discountDiv.textContent.trim();
        if (discountText) {
          discountRate = discountText;
        }
      }

      // 発送元（検索ページのみ・翻訳対応）
      let shippingAria = null;
      if (pageType === 'search') {
        const locationLabel = item.querySelector(SELECTOR_SHIPPING_ARIA);
        if (locationLabel) {
          const ariaLabel = locationLabel.getAttribute('aria-label');
          shippingAria = ariaLabel.replace('location-', '');
        }
        if (!shippingAria) {
          const locationSpan = item.querySelector(SELECTOR_SHIPPING_SPAN);
          if (locationSpan) {
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
          site_tld: getSiteTld(),
          id: productId,
          name: productName,
          name_ja: null,
          url: url,
          img_src: imgSrc,
          discount_rate: discountRate,
          display_order: displayOrder,
          price: price,
          price_unit: getCurrencyUnitLabel(),
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

  const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(DB_STORE_NAME);

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
function buildTimestamp() {
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  const hours = String(jst.getUTCHours()).padStart(2, '0');
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jst.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleDownload() {
  console.log('[DL] CSV DL開始');

  if (!db) await initDB();

  const transaction = db.transaction([DB_STORE_NAME], 'readonly');
  const store = transaction.objectStore(DB_STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const products = request.result;

    if (products.length === 0) {
      alert('保存されているデータがありません');
      return;
    }

    console.log('[DL] データ取得:', products.length, '件');

    // カテゴリ由来とキーワード検索由来で分割
    const categoryProducts = products.filter(p => 'main_category' in p);
    const searchProducts = products.filter(p => 'keywords' in p);
    const hasCategory = categoryProducts.length > 0;
    const hasSearch = searchProducts.length > 0;

    if (!hasCategory && !hasSearch) {
      alert('不明なデータ形式です');
      return;
    }

    const timestamp = buildTimestamp();
    const isMixed = hasCategory && hasSearch;

    // カテゴリデータのCSV
    if (hasCategory) {
      categoryProducts.sort((a, b) => {
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
      const headers = CSV_HEADERS_CATEGORY;
      const rows = categoryProducts.map(p => [
        p.site_tld || '',
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
        p.price_unit || '',
        p.sold_count || '',
        p.timestamp || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const nameSuffix = isMixed ? CSV_FILENAME_SUFFIX_CATEGORY : '';
      downloadCsv(csv, `${CSV_FILENAME_PREFIX}${timestamp}${nameSuffix}.csv`);
      console.log('[DL] カテゴリCSV DL:', categoryProducts.length, '件');
    }

    // 検索データのCSV（混在時は少し遅延して2枚目をDL）
    if (hasSearch) {
      searchProducts.sort((a, b) => {
        const kwA = a.keywords || '';
        const kwB = b.keywords || '';
        if (kwA < kwB) return -1;
        if (kwA > kwB) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      });
      const headers = CSV_HEADERS_SEARCH;
      const rows = searchProducts.map(p => [
        p.site_tld || '',
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.name_ja || '',
        p.keywords || '',
        p.url || '',
        p.img_src || '',
        p.discount_rate || '',
        p.display_order || '',
        p.price || '',
        p.price_unit || '',
        p.sold_count || '',
        p.timestamp || '',
        `"${(p.shipping_aria || '').replace(/"/g, '""')}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const nameSuffix = isMixed ? CSV_FILENAME_SUFFIX_SEARCH : '';
      const filename = `${CSV_FILENAME_PREFIX}${timestamp}${nameSuffix}.csv`;
      if (isMixed) {
        setTimeout(() => {
          downloadCsv(csv, filename);
          console.log('[DL] 検索CSV DL:', searchProducts.length, '件');
          setTimeout(clearDatabase, 200);
        }, 350);
      } else {
        downloadCsv(csv, filename);
        console.log('[DL] 検索CSV DL:', searchProducts.length, '件');
        clearDatabase();
      }
      return;
    }

    // カテゴリのみの場合はここでDB削除
    if (hasCategory) {
      setTimeout(clearDatabase, 200);
    }
  };

  request.onerror = () => {
    console.error('[DL] データ取得エラー:', request.error);
    alert('データ取得に失敗しました');
  };
}

// ========== DB全削除 ==========
async function clearDatabase() {
  if (!db) await initDB();

  const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(DB_STORE_NAME);
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
    const items = document.querySelectorAll(SELECTOR_PRODUCT_ITEMS);
    if (items.length === 0) {
      resolve();
      return;
    }

    let currentIndex = 0;
    const totalItems = items.length;
    const scrollStep = Math.ceil(totalItems / SCROLL_DIVISIONS);

    console.log(`${totalItems}件を${Math.ceil(totalItems / scrollStep)}回に分けてスクロール`);

    function scrollNext() {
      const targetIndex = Math.min(currentIndex + scrollStep, totalItems - 1);
      items[targetIndex].scrollIntoView({ behavior: 'instant', block: 'center' });
      currentIndex = targetIndex;

      if (currentIndex >= totalItems - 1) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          console.log('スクロール完了、先頭に戻りました');
          setTimeout(resolve, SCROLL_RESOLVE_DELAY_MS);
        }, SCROLL_PAUSE_MS);
      } else {
        setTimeout(scrollNext, SCROLL_INTERVAL_MS);
      }
    }

    scrollNext();
  });
}

// ========== 通知表示 ==========
function showNotification(message, isError = false) {
  const existing = document.getElementById(ID_NOTIFICATION);
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = ID_NOTIFICATION;
  notification.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: ${isError ? NOTIFICATION_ERROR_COLOR : NOTIFICATION_SUCCESS_COLOR};
    color: white;
    padding: 12px 18px;
    border-radius: 4px;
    z-index: ${NOTIFICATION_Z_INDEX};
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: trackerSlideIn 0.3s ease-out;
  `;

  if (!document.getElementById(ID_TRACKER_STYLE)) {
    const style = document.createElement('style');
    style.id = ID_TRACKER_STYLE;
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
  }, NOTIFICATION_DURATION_MS);
}

// ========== 初期化 ==========
function init() {
  console.log('[INIT] Shopee Tracker 初期化...');

  // IndexedDB初期化
  initDB();

  if (document.querySelectorAll(SELECTOR_PRODUCT_ITEMS).length > 0) {
    injectFloatingButtons();
    return;
  }

  const btnObserver = new MutationObserver(() => {
    if (document.querySelectorAll(SELECTOR_PRODUCT_ITEMS).length > 0) {
      setTimeout(() => {
        injectFloatingButtons();
        btnObserver.disconnect();
      }, BUTTON_INJECT_OBSERVER_DELAY_MS);
    }
  });

  btnObserver.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (!document.getElementById(ID_BUTTON_CONTAINER)) {
      console.log('フォールバック: ボタンを強制注入');
      injectFloatingButtons();
    }
  }, BUTTON_INJECT_FALLBACK_MS);
}

init();
console.log('Content script 初期化完了');
