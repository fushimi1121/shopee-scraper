/**
 * DOM セレクタ（Shopee 一覧ページの構造に依存）
 * サイトのHTML変更時はここだけ修正すればよい
 */

// ---------- 商品一覧 ----------
const SELECTOR_PRODUCT_ITEMS = 'li.shopee-search-item-result__item';

// ---------- ナビゲーションボタン ----------
const SELECTOR_NAV_PREV = '.shopee-icon-button--left';
const SELECTOR_NAV_NEXT = '.shopee-icon-button--right';

// ---------- 商品カード内要素 ----------
const SELECTOR_PRODUCT_NAME = '.whitespace-normal.line-clamp-2';
const SELECTOR_PRICE_CANDIDATES = 'span.truncate.font-medium';
const SELECTOR_PRICE_CLASS_INCLUDE = 'text-base';
const SELECTOR_SOLD = '.truncate.text-shopee-black87.text-xs.min-h-4';
const SELECTOR_PRODUCT_LINK = 'a[href*="/"]';
const SELECTOR_PRODUCT_IMAGE = 'img[src*="susercontent.com"]';
const SELECTOR_DISCOUNT = '.text-shopee-primary.font-medium.bg-shopee-pink';

// ---------- 検索ページ：発送元 ----------
const SELECTOR_SHIPPING_ARIA = '[data-testid="a11y-label"][aria-label^="location-"]';
const SELECTOR_SHIPPING_SPAN = 'span.ml-\\[3px\\].align-middle';

// ---------- 注入要素のID ----------
const ID_BUTTON_CONTAINER = 'shopee-tracker-buttons';
const ID_ITEM_COUNT_BADGE = 'tracker-item-count-badge';
const ID_EXTRACT_BTN = 'tracker-extract-btn';
const ID_PREV_BTN = 'tracker-prev-btn';
const ID_NEXT_BTN = 'tracker-next-btn';
const ID_DL_BTN = 'tracker-dl-btn';
const ID_NOTIFICATION = 'shopee-tracker-notification';
const ID_TRACKER_STYLE = 'shopee-tracker-style';
