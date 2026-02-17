const ITEMS_PER_PAGE = 60;

// ========== ページ番号取得 ==========
function getCurrentPageNumber() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  return page !== null ? parseInt(page, 10) : 0;
}

// ========== ナビゲーションボタンの状態チェック ==========
function checkPrevDisabled() {
  // URLにpageパラメータがない場合は無効
  const params = new URLSearchParams(window.location.search);
  if (!params.has('page')) return true;

  // Shopee純正の戻るボタンを確認
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
  // 既存のボタンがあれば削除
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

  // 各ボタン生成
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

  container.appendChild(prevBtn);
  container.appendChild(extractBtn);
  container.appendChild(nextBtn);
  document.body.appendChild(container);

  console.log(`🎮 ボタン注入完了 (BACK:${prevDisabled ? '無効' : '有効'}, NEXT:${nextDisabled ? '無効' : '有効'})`);
}

function createButton(label, disabled) {
  const btn = document.createElement('button');
  // GETボタンはspanで包んでおく（innerHTML切替のため）
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

// ========== データ抽出ハンドラ（計測ログ付き） ==========
async function handleExtract() {
  const extractBtn = document.getElementById('tracker-extract-btn');
  if (!extractBtn || extractBtn.disabled) return;

  // ボタン無効化
  extractBtn.disabled = true;
  extractBtn.style.background = '#aaa';
  extractBtn.style.cursor = 'not-allowed';
  extractBtn.style.opacity = '1';
  // GIF表示（chrome.runtime.getURL でアクセス可能なURLを取得）
  const gifUrl = chrome.runtime.getURL('loading.gif');
  extractBtn.innerHTML = `<img src="${gifUrl}" style="width:32px;height:32px;display:block;" />`;

  const totalStart = performance.now();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' [START] GETボタン押下', new Date().toLocaleTimeString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // STEP 0: 全商品をレンダリングさせるためにスクロール
    const step0Start = performance.now();
    console.log('[STEP 0] 全件レンダリングのためスクロール開始...');
    await scrollToRenderAll();
    const step0Time = (performance.now() - step0Start).toFixed(0);
    console.log(`[STEP 0] スクロール完了 (${step0Time}ms)`);

    // STEP 1: DOM抽出
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

    // STEP 2: background.jsへのメッセージ送信 → Firestore保存
    const step2Start = performance.now();
    console.log(`[STEP 2] Firestoreへの送信 開始... (${products.length}件)`);

    const response = await sendToFirestore(products);

    const step2Time = (performance.now() - step2Start).toFixed(0);
    console.log(`[STEP 2] Firestoreへの送信 完了 (${step2Time}ms)`);

    if (response && response.success) {
      showNotification(`${products.length}件のデータ取得に成功しました。`);
    } else {
      console.error('NG: [STEP 2] 保存失敗:', response?.error);
      showNotification('データ取得エラーが発生しました。', true);
    }
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

function sendToFirestore(products) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'saveToFirestore', products },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      }
    );
  });
}

// ========== データ抽出（ログ付き） ==========
function extractProductData() {
  const productItems = document.querySelectorAll('li.shopee-search-item-result__item');
  const pageNumber = getCurrentPageNumber();

  console.log(`   🔍 対象商品数: ${productItems.length}件 (page=${pageNumber})`);

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
      // text-base/5 の "/" はCSSセレクタで無効なためclassName検索で代替
      let price = '';
      const spanCandidates = item.querySelectorAll('span.truncate.font-medium');
      for (const span of spanCandidates) {
        if ((span.className || '').includes('text-base')) {
          price = span.textContent.trim();
          break;
        }
      }

      // 販売数（記載なしの場合は0）
      const soldElement = item.querySelector('.truncate.text-shopee-black87.text-xs.min-h-4');
      let soldCount = 0;
      if (soldElement) {
        const soldRaw = soldElement.textContent.trim();
        if (soldRaw) {
          const soldClean = soldRaw.replace(/\+?\s*sold/i, '').trim();
          if (soldClean.toLowerCase().endsWith('k')) {
            soldCount = parseFloat(soldClean.slice(0, -1)) * 1000;
          } else {
            soldCount = parseInt(soldClean, 10) || 0;
          }
        }
      }

      // URL
      const linkElement = item.querySelector('a[href*="/"]');
      const url = linkElement ? linkElement.href : '';

      // 割引率
      const discountElement = item.querySelector('[data-testid="a11y-label"]');
      const discountRate = discountElement ? discountElement.getAttribute('aria-label') : null;

      // 表示順
      const displayOrder = pageNumber * ITEMS_PER_PAGE + (index + 1);

      if (productName && price && url) {
        products.push({
          name: productName,
          price,
          url,
          soldCount,
          discountRate,
          displayOrder,
          timestamp: new Date().toISOString()
        });
      } else {
        skipCount++;
        // スキップ理由の詳細ログ
        const reasons = [];
        if (!productName) reasons.push(`name=空 (selector:.whitespace-normal.line-clamp-2)`);
        if (!price)       reasons.push(`price=空 (span.truncate.font-medium + className:text-base)`);
        if (!url)         reasons.push(`url=空 (a[href])`);
        console.warn(
          ` WARN: Skip[${index}] 理由: ${reasons.join(' / ')}`,
          `| name="${productName?.substring(0,20) || ''}"`,
          `| price="${price}"`,
          `| url="${url?.substring(0,40) || ''}"`
        );
        // さらに実際のDOM要素を確認
        const dbgName  = item.querySelector('.whitespace-normal.line-clamp-2');
        const dbgSpans = item.querySelectorAll('span.truncate.font-medium');
        const dbgLink  = item.querySelector('a[href*="/"]');
        console.log(
          `      DOM確認: nameEl=${!!dbgName} | spanCandidates=${dbgSpans.length}個 | linkEl=${!!dbgLink}`,
          dbgSpans.length > 0 ? `| span[0].class="${dbgSpans[0].className}"` : ''
        );
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

// ========== 販売数パース ==========
function parseSoldCount(soldText) {
  let cleanText = soldText.replace(/\+?\s*sold/i, '').trim();
  if (!cleanText) return 0;
  if (cleanText.toLowerCase().endsWith('k')) {
    return parseFloat(cleanText.slice(0, -1)) * 1000;
  }
  return parseInt(cleanText, 10) || 0;
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

  // アニメーション用スタイル（重複防止）
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

// ========== 全件レンダリング用スクロール ==========
function scrollToRenderAll() {
  return new Promise((resolve) => {
    const items = document.querySelectorAll('li.shopee-search-item-result__item');
    if (items.length === 0) {
      resolve();
      return;
    }

    const lastItem = items[items.length - 1];
    let currentIndex = 0;
    const totalItems = items.length;
    const scrollStep = Math.ceil(totalItems / 6); // 6回に分けてスクロール

    console.log(`${totalItems}件を${Math.ceil(totalItems / scrollStep)}回に分けてスクロール`);

    function scrollNext() {
      const targetIndex = Math.min(currentIndex + scrollStep, totalItems - 1);
      items[targetIndex].scrollIntoView({ behavior: 'instant', block: 'center' });
      currentIndex = targetIndex;

      if (currentIndex >= totalItems - 1) {
        // 最後まで到達したら先頭に戻って待機
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

// ========== 初期化 ==========
function init() {
  console.log('[INIT] Shopee Tracker 初期化...');

  // 既に商品リストがあれば即時注入
  if (document.querySelectorAll('li.shopee-search-item-result__item').length > 0) {
    injectFloatingButtons();
    return;
  }

  // MutationObserverで商品リストの出現を待つ
  const btnObserver = new MutationObserver(() => {
    if (document.querySelectorAll('li.shopee-search-item-result__item').length > 0) {
      setTimeout(() => {
        injectFloatingButtons();
        btnObserver.disconnect();
      }, 1000);
    }
  });

  btnObserver.observe(document.body, { childList: true, subtree: true });

  // フォールバック（5秒後）
  setTimeout(() => {
    if (!document.getElementById('shopee-tracker-buttons')) {
      console.log('フォールバック: ボタンを強制注入');
      injectFloatingButtons();
    }
  }, 5000);
}

init();
console.log('Content script 初期化完了');
