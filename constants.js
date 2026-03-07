/**
 * コンテンツスクリプト用の定数（ページネーション・DB・スクロール・UI・CSV）
 */

// ---------- ページネーション ----------
const ITEMS_PER_PAGE = 60;

// ---------- IndexedDB ----------
const DB_NAME = 'ShopeeTrackerDB';
const DB_VERSION = 1;
const DB_STORE_NAME = 'products';
const DB_INDEX_NAME = 'timestamp';

// ---------- 日時（JST） ----------
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ---------- スクロール（全件レンダリング用） ----------
const SCROLL_DIVISIONS = 6;
const SCROLL_INTERVAL_MS = 150;
const SCROLL_PAUSE_MS = 200;
const SCROLL_RESOLVE_DELAY_MS = 300;

// ---------- 通知 ----------
const NOTIFICATION_DURATION_MS = 4000;
const NOTIFICATION_SUCCESS_COLOR = '#26aa99';
const NOTIFICATION_ERROR_COLOR = '#e74c3c';

// ---------- フローティングボタン ----------
const BUTTON_WIDTH = 52;
const BUTTON_HEIGHT = 52;
const BUTTON_PRIMARY_COLOR = '#ee4d2d';
const BUTTON_PRIMARY_HOVER_COLOR = '#d73211';
const BUTTON_DISABLED_COLOR = '#aaa';
const BUTTON_DISABLED_OPACITY = '0.55';
const BUTTON_Z_INDEX = 999998;

// ---------- 通知オーバーレイ ----------
const NOTIFICATION_Z_INDEX = 999999;

// ---------- CSV ----------
const CSV_FILENAME_PREFIX = 'shopee_products_';

const CSV_HEADERS_CATEGORY = [
  'id', 'name', 'name_ja', 'main_category', 'sub_category',
  'url', 'img_src', 'discount_rate', 'display_order',
  'price', 'sold_count', 'timestamp'
];

const CSV_HEADERS_SEARCH = [
  'id', 'name', 'name_ja', 'keywords',
  'url', 'img_src', 'discount_rate', 'display_order',
  'price', 'sold_count', 'timestamp', 'shipping_aria'
];

// ---------- 抽出ボタン復帰遅延（ms） ----------
const EXTRACT_BUTTON_RESET_DELAY_MS = 3000;

// ---------- 初期化・フォールバック ----------
const BUTTON_INJECT_OBSERVER_DELAY_MS = 1000;
const BUTTON_INJECT_FALLBACK_MS = 5000;
