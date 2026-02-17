console.log('🛍️ Shopee Tracker: content.js loaded');

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
  btn.textContent = label;
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

  // 3秒間ボタンを無効化
  extractBtn.disabled = true;
  extractBtn.style.background = '#aaa';
  extractBtn.style.cursor = 'not-allowed';
  extractBtn.style.opacity = '0.55';
  extractBtn.textContent = '...';

  try {
    const products = extractProductData();

    if (products.length === 0) {
      showNotification('データ取得エラーが発生しました。', true);
      return;
    }

    const response = await sendToFirestore(products);

    if (response && response.success) {
      showNotification(`${products.length}件のデータ取得に成功しました。`);
    } else {
      showNotification('データ取得エラーが発生しました。', true);
    }
  } catch (error) {
    console.error('❌ 抽出エラー:', error);
    showNotification('データ取得エラーが発生しました。', true);
  } finally {
    // 3秒後にボタンを再有効化
    setTimeout(() => {
      const btn = document.getElementById('tracker-extract-btn');
      if (btn) {
        btn.disabled = false;
        btn.style.background = '#ee4d2d';
        btn.style.cursor = 'pointer';
        btn.style.opacity = '1';
        btn.textContent = 'GET';
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

// ========== データ抽出 ==========
function extractProductData() {
  const products = [];
  const productItems = document.querySelectorAll('li.shopee-search-item-result__item');
  const pageNumber = getCurrentPageNumber();

  console.log(`🔍 ${productItems.length}個の商品から抽出開始 (page=${pageNumber})`);

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
      const priceElement = item.querySelector('span.truncate.text-base\\/5.font-medium');
      const price = priceElement ? priceElement.textContent.trim() : '';

      // 販売数（記載なしの場合は0）
      const soldElement = item.querySelector('.truncate.text-shopee-black87.text-xs.min-h-4');
      let soldCount = 0;
      if (soldElement) {
        const soldText = soldElement.textContent.trim();
        if (soldText) soldCount = parseSoldCount(soldText);
      }

      // URL
      const linkElement = item.querySelector('a[href*="/"]');
      const url = linkElement ? linkElement.href : '';

      // 割引率（要素がなければnull）
      const discountElement = item.querySelector('[data-testid="a11y-label"]');
      const discountRate = discountElement
        ? discountElement.getAttribute('aria-label')
        : null;

      // 表示順（ページをまたいだ通し番号）
      const displayOrder = pageNumber * ITEMS_PER_PAGE + (index + 1);

      if (productName && price && url) {
        products.push({
          name: productName,
          price: price,
          url: url,
          soldCount: soldCount,
          discountRate: discountRate,
          displayOrder: displayOrder,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`⚠️ Item ${index}: 不完全なデータ - name:${!!productName}, price:${!!price}, url:${!!url}`);
      }
    } catch (error) {
      console.error(`❌ Item ${index} 抽出エラー:`, error);
    }
  });

  console.log(`✅ ${products.length}件の有効な商品を抽出`);
  return products;
}

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

// ========== 初期化 ==========
function init() {
  console.log('🚀 Shopee Tracker 初期化...');

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
      console.log('⏰ フォールバック: ボタンを強制注入');
      injectFloatingButtons();
    }
  }, 5000);
}

init();
console.log('🛍️ Content script 初期化完了');
