/**
 * PitReserve Application Logic
 * Mobile-First Motorcycle PIT Booking System:
 * 1. Step 1: Vehicle Cascading Filter:
 *    メーカー -> 排気量 (50ccまで, 51cc～125cc, 126cc～250cc, 251cc～400cc, 401cc～750cc, 751cc～1000cc, 1001cc以上, その他)
 *    -> 車種 -> 年式 -> 型式
 * 2. Step 2: PIT Work Selection (Single Selection):
 *    - エンジンオイル交換 ￥1,100
 *    - オイルエレメント交換 ￥1,980
 *      ※車両にDCT記載があれば「DCTフィルタも追加で交換しますか？(+¥1,650)」を確認
 *      ※ハーレーの場合：
 *        - エンジンオイル関連の作業が選ばれたらプライマリーオイルやトランスミッションオイルも追加で交換するか確認
 *        - 使用するフィルターが数種類ある場合はプルダウンで選択（純正黒/銀、社外品黒/銀、サンダンスなど）
 *        - エンジンオイル、プライマリー、トランスミッション（スポーツスターはエンジンとプライマリーのみ）を全て交換する場合はフィルターセット（黒/銀）を選択可能
 *    - タイヤ交換（scooter列の判定に応じて動的表示）：
 *      - スクーター125: フロントタイヤ交換(スクーター125cc以下) ￥4,000 / リヤタイヤ交換(スクーター125cc以下) ￥5,000 / 前後タイヤ交換(スクーター125cc以下) ￥8,500
 *      - スクーター126: フロントタイヤ交換(スクーター126cc以上) ￥4,400 / リヤタイヤ交換(スクーター126cc以上) ￥5,500 / 前後タイヤ交換(スクーター126cc以上) ￥9,500
 *      - その他一般車: フロントタイヤ交換 ￥4,400 / リヤタイヤ交換 ￥5,500 / 前後タイヤ交換 ￥9,500
 *    - エンジンオイル選択（オイル交換選択時、ハーレー用専用オイルまたは通常3種）
 * 3. Step 3: Future Dates Only Calendar (No same-day booking) + Time Slots + Customer Info
 * 4. Step 4: Final Confirmation, Ticket Generation, LocalStorage Persistence, Admin Management
 */

// Fixed Displacement Categories
const DISPLACEMENT_CATEGORIES = [
  '50ccまで',
  '51cc～125cc',
  '126cc～250cc',
  '251cc～400cc',
  '401cc～750cc',
  '751cc～1000cc',
  '1001cc以上',
  'その他'
];

// --- Normal Bulk Engine Oil Types (2りんかんオリジナル / モチュール / カストロール) ---
const NORMAL_ENGINE_OILS = [
  {
    id: 'oil-rs1',
    name: 'RS1 (２りんかんオリジナル全合成油)',
    badge: '納得のコストパフォーマンス！',
    spec: '街乗りからツーリングまで幅広くカバーする２りんかんオリジナル全合成油。',
    viscosity: '10W-40 相当',
    extraPrice: 1100,
    img: 'data/オイル/通常量り売/image/oil_item_1-2.png'
  },
  {
    id: 'oil-4trs',
    name: '4T-RS (MOTUL×２りんかん コラボ)',
    badge: '当店人気No.1 ★ 推奨',
    spec: 'モチュール品質を体感できるコラボ商品。シフトフィーリングと耐摩耗性が格段に向上。',
    viscosity: '10W-40 相当',
    extraPrice: 2200,
    img: 'data/オイル/通常量り売/image/oil_item_2.png'
  },
  {
    id: 'oil-power1',
    name: 'POWER1 ULTIMATE 4T (カストロール)',
    badge: '最高峰100%全合成油',
    spec: '省燃費＆優れたエンジン保護性能を誇る万能フラッグシップオイル。',
    viscosity: '10W-40 / 10W-50',
    extraPrice: 3850,
    img: 'data/オイル/通常量り売/image/oil_item_3_3.png'
  }
];

// --- Harley-Davidson Dedicated Oil Master (from data/オイル/ハーレー用) ---
const HARLEY_OILS_MASTER = {
  engine: {
    name: 'ハーレー専用エンジンオイル (TWP539006)',
    desc: 'ハーレーのエンジンオイルで迷ったら純正以外なら、これで決まり。Vツインの過酷な熱に対応。',
    price: 4000,
    img: 'data/オイル/ハーレー用/image/TWP539006.jpg'
  },
  primary: {
    name: 'ハーレー専用プライマリーオイル (TWP539018)',
    desc: 'プライマリーチェーンケースおよび湿式クラッチの保護・静粛性を高める専用フルード。',
    price: 4000,
    img: 'data/オイル/ハーレー用/image/TWP539018-768x768.jpg'
  },
  trans: {
    name: 'ハーレー専用トランスミッションオイル (TWP539024)',
    desc: 'ヘビーデューティなトランスミッションギヤを衝撃荷重から守る高粘度ギヤオイル。',
    price: 4000,
    img: 'data/オイル/ハーレー用/image/TWP539024.jpg'
  },
  sportsterPrimary: {
    name: 'スポーツスター専用ギヤ＆チェーンオイル (TWP539016)',
    desc: 'スポーツスター専用設計。プライマリーとトランスミッションを一体潤滑する専用オイル。',
    price: 4000,
    img: 'data/オイル/ハーレー用/image/TWP539016-768x768.jpg'
  }
};

const TIME_SLOTS_DEF = [
  '09:30', '10:15', '11:00', '11:45',
  '13:30', '14:15', '15:00', '15:45',
  '16:30', '17:15', '18:00'
];

// --- Application State ---
const AppState = {
  currentStep: 1,

  // Step 1: Vehicle Filter
  filterMaker: '',
  filterCategory: '',
  filterName: '',
  filterYear: '',
  filterModel: '',
  selectedBike: null,

  // Step 2: Single PIT Work Selection
  selectedWorkId: 'oil-change',      // Default
  selectedWorkItem: null,

  // DCT Addon
  includeDctFilter: false,

  // Harley Specific Selections
  harleyAddPrimary: false,
  harleyAddTrans: false,
  harleyUseFilterSet: false,         // True when all oils are selected and user opts for filter set
  selectedHarleyFilterChoice: '',    // Single filter品番 or Set品番

  // Engine Oil Selection
  selectedOilId: 'oil-4trs',

  // Step 3: Date & Customer
  selectedDate: null,                // 'YYYY-MM-DD' (Tomorrow or later)
  selectedTimeSlot: null,            // 'HH:MM'
  calendarViewDate: new Date(),

  // Admin Calendar
  adminCalViewDate: new Date(),
  adminCalSelectedDate: null,

  // Storage
  reservations: [],
  lastCompletedBooking: null
};

const STORAGE_KEY = 'pitreserve_bike_bookings_v4';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadStoredReservations();
  initCalendarViewDate();
  initVehicleCascadeSelectors();
  renderCalendar();
  bindEventHandlers();
  updateStep2Price();
  updateAdminDashboard();
});

// Load / Seed Data
function loadStoredReservations() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      AppState.reservations = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse localStorage data', e);
      AppState.reservations = [];
    }
  }

  if (!AppState.reservations || AppState.reservations.length === 0) {
    injectSeedData(false);
  }
}

function saveReservations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.reservations));
  updateAdminBadge();
}

function injectSeedData(notify = true) {
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  const tomStr = `${tom.getFullYear()}-${pad(tom.getMonth() + 1)}-${pad(tom.getDate())}`;

  const sampleBookings = [
    {
      id: 'PIT-8821',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'CONFIRMED',
      date: tomStr,
      time: '10:15',
      bike: {
        maker: 'Harley-Davidson',
        disp: '883cc',
        cat: '751cc～1000cc',
        name: 'Sportster XL883(スポーツスター XL883)',
        year: '2000',
        model: 'CJ',
        oil: '約3L',
        primaryOil: '約1L',
        transOil: '',
        fil: '',
        frontTire: 'MH 90 - 21 54H WT',
        rearTire: '130 90 B 16 73H TL',
        scooter: '',
        dct: '',
        img: 'data/Harley-Davidson/bike_images/02177_1.jpg'
      },
      workName: 'エンジンオイル交換',
      oilName: 'ハーレー専用エンジンオイル (TWP539006)',
      harleyDetails: {
        primaryAdded: true,
        transAdded: false,
        useFilterSet: true,
        filterChoice: 'フィルターセット黒 (OS-501K)'
      },
      dctAdded: false,
      totalPrice: 9100, // 1100 + 4000 (eng) + 4000 (primary)
      customer: {
        name: '佐藤 健太',
        kana: 'サトウ ケンタ',
        phone: '090-9876-5432',
        email: 'sato.kenta@example.jp',
        remarks: 'スポーツスター全オイル交換とフィルターセット希望'
      }
    }
  ];

  AppState.reservations = [...AppState.reservations, ...sampleBookings];
  saveReservations();
  updateAdminDashboard();
  if (notify) showToast('サンプル予約データを追加しました', 'success');
}

// ============================================================================
// STEP 1: VEHICLE 5-LEVEL CASCADING DROPDOWNS
// Maker -> Displacement Category -> Bike Name -> Year -> Model
// ============================================================================
function initVehicleCascadeSelectors() {
  const makerEl = document.getElementById('filterMaker');
  const dispEl = document.getElementById('filterDisp');
  const nameEl = document.getElementById('filterName');
  const yearEl = document.getElementById('filterYear');
  const modelEl = document.getElementById('filterModel');
  const nextBtn = document.getElementById('toStep2Btn');

  if (!window.BIKES_DATABASE || !Array.isArray(window.BIKES_DATABASE)) {
    console.warn('BIKES_DATABASE not loaded.');
    return;
  }

  // 1. メーカー変更
  makerEl.addEventListener('change', () => {
    AppState.filterMaker = makerEl.value;
    AppState.filterCategory = '';
    AppState.filterName = '';
    AppState.filterYear = '';
    AppState.filterModel = '';
    AppState.selectedBike = null;

    resetSelect(dispEl, '排気量を選択してください');
    resetSelect(nameEl, '先に排気量を選択してください');
    resetSelect(yearEl, '先に車種を選択してください');
    resetSelect(modelEl, '先に年式を選択してください');
    hideBikePreview();
    nextBtn.disabled = true;

    if (!AppState.filterMaker) {
      dispEl.disabled = true;
      return;
    }

    const inMaker = window.BIKES_DATABASE.filter(b => b.m.toLowerCase() === AppState.filterMaker.toLowerCase());
    const existingCats = new Set(inMaker.map(b => b.cat));

    DISPLACEMENT_CATEGORIES.forEach(cat => {
      if (existingCats.has(cat)) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        dispEl.appendChild(opt);
      }
    });

    dispEl.disabled = false;
  });

  // 2. 排気量変更
  dispEl.addEventListener('change', () => {
    AppState.filterCategory = dispEl.value;
    AppState.filterName = '';
    AppState.filterYear = '';
    AppState.filterModel = '';
    AppState.selectedBike = null;

    resetSelect(nameEl, '車種を選択してください');
    resetSelect(yearEl, '先に車種を選択してください');
    resetSelect(modelEl, '先に年式を選択してください');
    hideBikePreview();
    nextBtn.disabled = true;

    if (!AppState.filterCategory) {
      nameEl.disabled = true;
      return;
    }

    const matched = window.BIKES_DATABASE.filter(b => 
      b.m.toLowerCase() === AppState.filterMaker.toLowerCase() && b.cat === AppState.filterCategory
    );

    const names = Array.from(new Set(matched.map(b => b.n))).sort((a, b) => a.localeCompare(b, 'ja'));

    names.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      nameEl.appendChild(opt);
    });

    nameEl.disabled = false;
  });

  // 3. 車種変更
  nameEl.addEventListener('change', () => {
    AppState.filterName = nameEl.value;
    AppState.filterYear = '';
    AppState.filterModel = '';
    AppState.selectedBike = null;

    resetSelect(yearEl, '年式を選択してください');
    resetSelect(modelEl, '先に年式を選択してください');
    hideBikePreview();
    nextBtn.disabled = true;

    if (!AppState.filterName) {
      yearEl.disabled = true;
      return;
    }

    const matched = window.BIKES_DATABASE.filter(b => 
      b.m.toLowerCase() === AppState.filterMaker.toLowerCase() && 
      b.cat === AppState.filterCategory && 
      b.n === AppState.filterName
    );

    const years = Array.from(new Set(matched.map(b => b.y))).filter(Boolean);
    years.sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));

    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y}年`;
      yearEl.appendChild(opt);
    });

    yearEl.disabled = false;

    if (years.length === 1) {
      yearEl.selectedIndex = 1;
      yearEl.dispatchEvent(new Event('change'));
    }
  });

  // 4. 年式変更
  yearEl.addEventListener('change', () => {
    AppState.filterYear = yearEl.value;
    AppState.filterModel = '';
    AppState.selectedBike = null;

    resetSelect(modelEl, '型式を選択してください');
    hideBikePreview();
    nextBtn.disabled = true;

    if (!AppState.filterYear) {
      modelEl.disabled = true;
      return;
    }

    const matched = window.BIKES_DATABASE.filter(b => 
      b.m.toLowerCase() === AppState.filterMaker.toLowerCase() && 
      b.cat === AppState.filterCategory && 
      b.n === AppState.filterName &&
      b.y === AppState.filterYear
    );

    const models = Array.from(new Set(matched.map(b => b.mo || '型式不明')));

    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      modelEl.appendChild(opt);
    });

    modelEl.disabled = false;

    if (models.length === 1) {
      modelEl.selectedIndex = 1;
      modelEl.dispatchEvent(new Event('change'));
    }
  });

  // 5. 型式変更 (確定)
  modelEl.addEventListener('change', () => {
    AppState.filterModel = modelEl.value;

    if (!AppState.filterModel) {
      AppState.selectedBike = null;
      hideBikePreview();
      nextBtn.disabled = true;
      return;
    }

    const matched = window.BIKES_DATABASE.find(b => 
      b.m.toLowerCase() === AppState.filterMaker.toLowerCase() && 
      b.cat === AppState.filterCategory && 
      b.n === AppState.filterName &&
      b.y === AppState.filterYear &&
      (b.mo || '型式不明') === AppState.filterModel
    );

    if (matched) {
      AppState.selectedBike = matched;
      showBikePreview(matched);
      nextBtn.disabled = false;
    }
  });
}

function resetSelect(el, placeholderText) {
  el.innerHTML = `<option value="">${placeholderText}</option>`;
  el.disabled = true;
}

function showBikePreview(bike) {
  const card = document.getElementById('vehicleDetailPreview');
  const imgEl = document.getElementById('bikePreviewImage');
  const titleEl = document.getElementById('previewBikeTitle');
  const dispEl = document.getElementById('previewBikeDisp');
  const yearEl = document.getElementById('previewBikeYear');
  const modelEl = document.getElementById('previewBikeModel');
  const oilEl = document.getElementById('previewBikeOil');
  const filterEl = document.getElementById('previewBikeFilter');
  const fTireEl = document.getElementById('previewBikeFrontTire');
  const rTireEl = document.getElementById('previewBikeRearTire');

  titleEl.textContent = `${bike.m} ${bike.n}`;
  dispEl.textContent = bike.d || bike.cat;
  yearEl.textContent = bike.y ? `${bike.y}年` : '年式未定';
  modelEl.textContent = bike.mo ? `型式: ${bike.mo}` : '型式未定';

  const formatL = (val) => {
    if (!val || val === 'ー') return 'ー';
    return val.endsWith('L') ? val : `${val} L`;
  };

  oilEl.textContent = formatL(bike.oil);

  // If Harley, show primary/trans oil notes in filter/oil cells
  if (isHarley(bike)) {
    filterEl.textContent = bike.primaryOil ? `プライマリ:${bike.primaryOil}` : 'ー';
  } else {
    filterEl.textContent = formatL(bike.fil);
  }

  fTireEl.textContent = bike.ft || '点検時確認';
  rTireEl.textContent = bike.rt || '点検時確認';

  if (bike.img) {
    imgEl.src = bike.img;
  } else {
    imgEl.src = '';
  }

  card.classList.remove('hidden');
}

function hideBikePreview() {
  const card = document.getElementById('vehicleDetailPreview');
  if (card) card.classList.add('hidden');
}

function isHarley(bike) {
  return bike && bike.m && bike.m.toLowerCase().includes('harley');
}

function isSportster(bike) {
  if (!bike) return false;
  const target = ((bike.n || '') + ' ' + (bike.mo || '')).toLowerCase();
  return target.includes('sportster') || target.includes('スポーツスター');
}

// ============================================================================
// STEP 2: PIT WORK SELECTION, TIRE TIERS, DCT & HARLEY OILS / FILTERS
// ============================================================================
function getDynamicPitWorkItems(bike) {
  const items = [
    {
      id: 'oil-change',
      name: 'エンジンオイル交換',
      desc: isHarley(bike) ? 'ハーレー専用オイルまたは推奨オイルでのピット交換。' : '愛車のエンジン特性に合わせた高品質オイル交換。',
      price: 1100,
      durationMin: 25,
      isOilChange: true
    },
    {
      id: 'element-change',
      name: 'オイルエレメント交換',
      desc: isHarley(bike) ? 'ハーレー適合オイルフィルターの交換作業。' : 'エンジン内部のスラッジ・鉄粉を濾過するフィルターを新品に交換。',
      price: 1980,
      durationMin: 20,
      isElementChange: true
    }
  ];

  const scooterVal = bike && bike.scooter ? bike.scooter.trim() : '';

  if (scooterVal === 'スクーター125') {
    items.push(
      {
        id: 'front-tire-scooter125',
        name: 'フロントタイヤ交換（スクーター125cc以下）',
        desc: 'フロントホイール脱着・新品タイヤ組み換え・エア調整。',
        price: 4000,
        durationMin: 35
      },
      {
        id: 'rear-tire-scooter125',
        name: 'リヤタイヤ交換（スクーター125cc以下）',
        desc: 'マフラー等脱着・リヤタイヤ組み換え・エア調整。',
        price: 5000,
        durationMin: 45
      },
      {
        id: 'both-tire-scooter125',
        name: 'フロント＋リヤタイヤ交換（スクーター125cc以下）',
        desc: '前後タイヤ一括交換セット。前後同時のリフレッシュがお得です。',
        price: 8500,
        durationMin: 70
      }
    );
  } else if (scooterVal === 'スクーター126') {
    items.push(
      {
        id: 'front-tire-scooter126',
        name: 'フロントタイヤ交換（スクーター126cc以上）',
        desc: 'フロントホイール脱着・新品タイヤ組み換え・エア調整。',
        price: 4400,
        durationMin: 35
      },
      {
        id: 'rear-tire-scooter126',
        name: 'リヤタイヤ交換（スクーター126cc以上）',
        desc: 'マフラー脱着・リヤタイヤ組み換え・エア調整。',
        price: 5500,
        durationMin: 45
      },
      {
        id: 'both-tire-scooter126',
        name: 'フロント＋リヤタイヤ交換（スクーター126cc以上）',
        desc: '前後タイヤ一括交換セット。前後同時のリフレッシュがお得です。',
        price: 9500,
        durationMin: 70
      }
    );
  } else {
    items.push(
      {
        id: 'front-tire-std',
        name: 'フロントタイヤ交換',
        desc: 'フロントホイール脱着・新品タイヤ組み換え・バランス調整。',
        price: 4400,
        durationMin: 35
      },
      {
        id: 'rear-tire-std',
        name: 'リヤタイヤ交換',
        desc: 'リヤホイール脱着・新品タイヤ組み換え・チェーン調整。',
        price: 5500,
        durationMin: 45
      },
      {
        id: 'both-tire-std',
        name: 'フロント＋リヤタイヤ交換',
        desc: '前後タイヤ一括交換セット。前後同時のリフレッシュがお得です。',
        price: 9500,
        durationMin: 70
      }
    );
  }

  return items;
}

function renderPitWorkList() {
  const container = document.getElementById('pitWorkList');
  container.innerHTML = '';

  const workItems = getDynamicPitWorkItems(AppState.selectedBike);

  if (!workItems.some(item => item.id === AppState.selectedWorkId)) {
    AppState.selectedWorkId = workItems[0].id;
  }

  workItems.forEach(work => {
    const isSelected = AppState.selectedWorkId === work.id;
    const card = document.createElement('div');
    card.className = `pit-work-card ${isSelected ? 'selected' : ''}`;
    card.dataset.workId = work.id;

    card.innerHTML = `
      <div class="work-left">
        <div class="work-check">${isSelected ? '●' : ''}</div>
        <div class="work-text">
          <span class="work-title">${escapeHtml(work.name)}</span>
          <span class="work-desc">${escapeHtml(work.desc)}</span>
        </div>
      </div>
      <div class="work-right">
        <span class="work-price">¥${work.price.toLocaleString()}～</span>
        <span class="work-time">約${work.durationMin}分</span>
      </div>
    `;

    card.addEventListener('click', () => {
      AppState.selectedWorkId = work.id;
      AppState.selectedWorkItem = work;
      renderPitWorkList();
      updateSubsectionsVisibility();
      updateStep2Price();
    });

    container.appendChild(card);
  });

  AppState.selectedWorkItem = workItems.find(w => w.id === AppState.selectedWorkId);
  updateSubsectionsVisibility();
  updateStep2Price();
}

function updateSubsectionsVisibility() {
  const bike = AppState.selectedBike;
  const isOilRelated = AppState.selectedWorkId === 'oil-change' || AppState.selectedWorkId === 'element-change';
  const isOilChange = AppState.selectedWorkId === 'oil-change';
  const isElementChange = AppState.selectedWorkId === 'element-change';
  const hasDct = bike && bike.dct && bike.dct.includes('DCT');
  const isHarleyBike = isHarley(bike);

  // 1. Engine Oil Selection (First selection in sequence)
  // Displayed for both エンジンオイル交換 and オイルエレメント交換 (all bikes)
  const oilSection = document.getElementById('engineOilSection');
  if (isOilRelated) {
    oilSection.classList.remove('hidden');
    renderEngineOilChoices();
  } else {
    oilSection.classList.add('hidden');
  }

  // 2. Harley-Davidson Specialized Oil Additional Confirmation (Independent selections)
  const harleyOilSection = document.getElementById('harleyOilOptionsSection');
  if (isHarleyBike && isOilRelated) {
    harleyOilSection.classList.remove('hidden');
    renderHarleyOilOptions(bike);
  } else {
    harleyOilSection.classList.add('hidden');
    AppState.harleyAddPrimary = false;
    AppState.harleyAddTrans = false;
    AppState.harleyUseFilterSet = false;
  }

  // 3. Harley-Davidson Oil Filter Model Selection
  // Strictly shown only when オイルエレメント交換 is selected (never on plain oil change)
  const harleyFilterSection = document.getElementById('harleyFilterSelectSection');
  if (isHarleyBike && isElementChange) {
    harleyFilterSection.classList.remove('hidden');
    checkHarleyFilterSetEligibility(bike);
    renderHarleyFilterDropdown(bike);
  } else {
    harleyFilterSection.classList.add('hidden');
    AppState.selectedHarleyFilterChoice = '';
    AppState.harleyUseFilterSet = false;
  }

  // 4. DCT prompt section
  const dctSection = document.getElementById('dctOptionSection');
  if (isElementChange && hasDct) {
    dctSection.classList.remove('hidden');
  } else {
    dctSection.classList.add('hidden');
    AppState.includeDctFilter = false;
    const chk = document.getElementById('dctFilterCheckbox');
    if (chk) chk.checked = false;
  }
}

// Render Harley Specialized Oil Options (Primary, Trans - Independent selections)
function renderHarleyOilOptions(bike) {
  const container = document.getElementById('harleyOilListContainer');
  container.innerHTML = '';

  const sportster = isSportster(bike);

  // Primary Option (Independent)
  const primaryMaster = sportster ? HARLEY_OILS_MASTER.sportsterPrimary : HARLEY_OILS_MASTER.primary;
  const primaryAmountStr = bike.primaryOil ? `(規定量: ${bike.primaryOil})` : '';

  const primaryCard = document.createElement('div');
  primaryCard.className = `harley-oil-card ${AppState.harleyAddPrimary ? 'selected' : ''}`;
  primaryCard.innerHTML = `
    <div class="hoc-left">
      <img src="${primaryMaster.img}" alt="プライマリーオイル" class="hoc-thumb" onerror="this.style.display='none'">
      <div class="hoc-info">
        <span class="hoc-title">＋ ${escapeHtml(primaryMaster.name)}</span>
        <span class="hoc-desc">${escapeHtml(primaryMaster.desc)}</span>
        <span class="hoc-amount">作業工賃含む ${escapeHtml(primaryAmountStr)}</span>
      </div>
    </div>
    <div class="hoc-right">
      <span class="hoc-price">+¥${primaryMaster.price.toLocaleString()}～</span>
      <div class="hoc-check">${AppState.harleyAddPrimary ? '✓' : ''}</div>
    </div>
  `;
  primaryCard.addEventListener('click', () => {
    AppState.harleyAddPrimary = !AppState.harleyAddPrimary;
    checkHarleyFilterSetEligibility(bike);
    renderHarleyOilOptions(bike);
    if (AppState.selectedWorkId === 'element-change') {
      renderHarleyFilterDropdown(bike);
    }
    updateStep2Price();
  });
  container.appendChild(primaryCard);

  // Transmission Option (Only for non-sportster Harleys - Independent)
  if (!sportster) {
    const transMaster = HARLEY_OILS_MASTER.trans;
    const transAmountStr = bike.transOil ? `(規定量: ${bike.transOil})` : '';

    const transCard = document.createElement('div');
    transCard.className = `harley-oil-card ${AppState.harleyAddTrans ? 'selected' : ''}`;
    transCard.innerHTML = `
      <div class="hoc-left">
        <img src="${transMaster.img}" alt="トランスミッションオイル" class="hoc-thumb" onerror="this.style.display='none'">
        <div class="hoc-info">
          <span class="hoc-title">＋ ${escapeHtml(transMaster.name)}</span>
          <span class="hoc-desc">${escapeHtml(transMaster.desc)}</span>
          <span class="hoc-amount">作業工賃含む ${escapeHtml(transAmountStr)}</span>
        </div>
      </div>
      <div class="hoc-right">
        <span class="hoc-price">+¥${transMaster.price.toLocaleString()}～</span>
        <div class="hoc-check">${AppState.harleyAddTrans ? '✓' : ''}</div>
      </div>
    `;
    transCard.addEventListener('click', () => {
      AppState.harleyAddTrans = !AppState.harleyAddTrans;
      checkHarleyFilterSetEligibility(bike);
      renderHarleyOilOptions(bike);
      if (AppState.selectedWorkId === 'element-change') {
        renderHarleyFilterDropdown(bike);
      }
      updateStep2Price();
    });
    container.appendChild(transCard);
  }
}

function checkHarleyFilterSetEligibility(bike) {
  const isElementChange = AppState.selectedWorkId === 'element-change';
  if (!isElementChange) {
    AppState.harleyUseFilterSet = false;
    return;
  }

  const sportster = isSportster(bike);
  const isAllOilsSelected = sportster 
    ? AppState.harleyAddPrimary 
    : (AppState.harleyAddPrimary && AppState.harleyAddTrans);

  if (!isAllOilsSelected) {
    AppState.harleyUseFilterSet = false;
  }
}

// Render Harley Filter Selection Dropdown
// Only called when オイルエレメント交換 is selected!
function renderHarleyFilterDropdown(bike) {
  const select = document.getElementById('harleyFilterSelect');
  const noticeBox = document.getElementById('filterSetNoticeBox');
  const badgeSub = document.getElementById('harleyFilterBadgeSub');
  const label = document.getElementById('harleyFilterSelectLabel');
  select.innerHTML = '';

  const sportster = isSportster(bike);
  const isAllOilsSelected = sportster 
    ? AppState.harleyAddPrimary 
    : (AppState.harleyAddPrimary && AppState.harleyAddTrans);

  const options = [];

  // If ALL oils are selected AND model has filter sets available:
  if (isAllOilsSelected && bike.hFilterSets && (bike.hFilterSets.setBlack || bike.hFilterSets.setSilver)) {
    AppState.harleyUseFilterSet = true;
    if (noticeBox) {
      noticeBox.classList.remove('hidden');
      noticeBox.innerHTML = `
        <span class="filter-set-notice-icon">✨</span>
        <div class="filter-set-notice-content">
          <strong class="filter-set-notice-title">【全油脂類交換】フィルターセットが選択可能です</strong>
          <span class="filter-set-notice-desc">エンジンオイル・プライマリー・ミッションの全てを同時交換されるため、ガスケット・Oリング同梱の「フィルターセット」を優先表示しています。単品フィルターもお選びいただけます。</span>
        </div>
      `;
    }
    if (badgeSub) badgeSub.textContent = '全オイル交換：フィルターセット対応';
    if (label) label.innerHTML = '使用するオイルフィルター（またはフィルターセット）をお選びください <span class="required">必須</span>';

    // Add filter sets first
    if (bike.hFilterSets.setBlack) {
      options.push({ val: `フィルターセット黒 (${bike.hFilterSets.setBlack})`, text: `★【推奨】フィルターセット【黒】 (品番: ${bike.hFilterSets.setBlack})` });
    }
    if (bike.hFilterSets.setSilver) {
      options.push({ val: `フィルターセット銀 (${bike.hFilterSets.setSilver})`, text: `★【推奨】フィルターセット【クローム銀】 (品番: ${bike.hFilterSets.setSilver})` });
    }
  } else {
    AppState.harleyUseFilterSet = false;
    if (noticeBox) {
      noticeBox.classList.add('hidden');
      noticeBox.innerHTML = '';
    }
    if (badgeSub) badgeSub.textContent = '適合品番から選択';
    if (label) label.innerHTML = '使用するオイルフィルターをお選びください <span class="required">必須</span>';
  }

  // Individual filter varieties (Single filters)
  if (bike.hFilters) {
    if (bike.hFilters.hdBlack) {
      options.push({ val: `ハーレー純正黒 (${bike.hFilters.hdBlack})`, text: `ハーレー純正オイルフィルター【黒】 (品番: ${bike.hFilters.hdBlack})` });
    }
    if (bike.hFilters.hdSilver) {
      options.push({ val: `ハーレー純正銀 (${bike.hFilters.hdSilver})`, text: `ハーレー純正オイルフィルター【クローム銀】 (品番: ${bike.hFilters.hdSilver})` });
    }
    if (bike.hFilters.afterBlack) {
      options.push({ val: `社外品黒 (${bike.hFilters.afterBlack})`, text: `社外高品質オイルフィルター【黒】 (品番: ${bike.hFilters.afterBlack})` });
    }
    if (bike.hFilters.afterSilver) {
      options.push({ val: `社外品銀 (${bike.hFilters.afterSilver})`, text: `社外高品質オイルフィルター【クローム銀】 (品番: ${bike.hFilters.afterSilver})` });
    }
    if (bike.hFilters.sundanceBlack) {
      options.push({ val: `サンダンスオリジナル黒 (${bike.hFilters.sundanceBlack})`, text: `サンダンス オリジナルフィルター【黒】 (品番: ${bike.hFilters.sundanceBlack})` });
    }
  }

  // Fallback if no specific filter column filled
  if (options.length === 0) {
    options.push({ val: 'ハーレー適合標準フィルター', text: 'ハーレー適合標準オイルフィルター (ブラック/店頭適合確認)' });
    options.push({ val: 'ハーレー適合クロームフィルター', text: 'ハーレー適合クロームオイルフィルター (シルバー/店頭適合確認)' });
  }

  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.val;
    el.textContent = opt.text;
    select.appendChild(el);
  });

  if (!AppState.selectedHarleyFilterChoice || !options.some(o => o.val === AppState.selectedHarleyFilterChoice)) {
    AppState.selectedHarleyFilterChoice = options[0].val;
  }
  select.value = AppState.selectedHarleyFilterChoice;

  select.onchange = () => {
    AppState.selectedHarleyFilterChoice = select.value;
  };
}

function renderEngineOilChoices() {
  const container = document.getElementById('oilCardsGrid');
  const titleEl = document.getElementById('engineOilSectionTitle');
  container.innerHTML = '';

  const bike = AppState.selectedBike;
  const isHarleyBike = isHarley(bike);

  if (isHarleyBike) {
    titleEl.textContent = '🛢️ ハーレー専用エンジンオイル (ボトル/専用オイル)';
    // Dedicated Harley engine oil (Not bulk)
    const hOil = HARLEY_OILS_MASTER.engine;
    const card = document.createElement('div');
    card.className = 'oil-card selected';
    card.style.gridColumn = '1 / -1';
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px;">
        <img src="${hOil.img}" alt="ハーレーエンジンオイル" class="oil-card-img-large" style="width:100px; height:100px; object-fit:contain; border-radius:8px; border:1px solid #fed7aa; background:#fff; margin:0; flex-shrink:0;">
        <div style="flex:1;">
          <span class="oil-badge" style="background:#ffedd5; color:#c2410c;">ハーレー専用エンジンオイル</span>
          <h4 class="oil-name" style="margin-top:4px; font-size:1.05rem;">${escapeHtml(hOil.name)}</h4>
          <p class="oil-spec" style="font-size:0.8rem;">${escapeHtml(hOil.desc)}</p>
          <div class="oil-meta" style="margin-top:6px;">
            <span class="oil-visc">粘度規格: 20W-50 専用設計</span>
            <span class="oil-price" style="font-size:1.15rem; color:#c2410c;">+¥${hOil.price.toLocaleString()}～</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
    AppState.selectedOilId = 'harley-engine-oil';
    return;
  }

  titleEl.textContent = '🛢️ エンジンオイルの種類 (3種類から選択)';
  NORMAL_ENGINE_OILS.forEach(oil => {
    const isSelected = AppState.selectedOilId === oil.id;
    const card = document.createElement('div');
    card.className = `oil-card ${isSelected ? 'selected' : ''}`;
    card.dataset.oilId = oil.id;

    card.innerHTML = `
      <div class="oil-card-top">
        <span class="oil-badge">${escapeHtml(oil.badge)}</span>
      </div>
      ${oil.img ? `<img src="${oil.img}" alt="${escapeHtml(oil.name)}" class="oil-card-img-large" onerror="this.style.display='none'">` : ''}
      <h4 class="oil-name" style="text-align:center;">${escapeHtml(oil.name)}</h4>
      <p class="oil-spec">${escapeHtml(oil.spec)}</p>
      <div class="oil-meta">
        <span class="oil-visc">粘度目安: ${escapeHtml(oil.viscosity)}</span>
        <span class="oil-price">+¥${oil.extraPrice.toLocaleString()}～</span>
      </div>
    `;

    card.addEventListener('click', () => {
      AppState.selectedOilId = oil.id;
      document.querySelectorAll('.oil-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateStep2Price();
    });

    container.appendChild(card);
  });
}

function calculateStep2Price() {
  const bike = AppState.selectedBike;
  const workItems = getDynamicPitWorkItems(bike);
  const work = workItems.find(w => w.id === AppState.selectedWorkId);
  if (!work) return 0;

  let total = work.price;

  // Engine oil cost (Applies to both oil-change and element-change)
  if (work.id === 'oil-change' || work.id === 'element-change') {
    if (isHarley(bike)) {
      total += HARLEY_OILS_MASTER.engine.price;
    } else {
      const oil = NORMAL_ENGINE_OILS.find(o => o.id === AppState.selectedOilId);
      if (oil) total += oil.extraPrice;
    }
  }

  // DCT filter cost
  if (work.id === 'element-change' && AppState.includeDctFilter) {
    total += 1650;
  }

  // Harley additional primary & trans oils
  if (isHarley(bike) && (work.id === 'oil-change' || work.id === 'element-change')) {
    if (AppState.harleyAddPrimary) total += 4000;
    if (AppState.harleyAddTrans) total += 4000;
  }

  return total;
}

function calculateTotalDurationMin() {
  const bike = AppState.selectedBike;
  const workItems = getDynamicPitWorkItems(bike);
  const work = workItems.find(w => w.id === AppState.selectedWorkId);
  let min = work ? work.durationMin : 30;

  if (AppState.includeDctFilter) min += 15;
  if (AppState.harleyAddPrimary) min += 20;
  if (AppState.harleyAddTrans) min += 20;

  return min;
}

function updateStep2Price() {
  const price = calculateStep2Price();
  const priceEl = document.getElementById('step2PricePreview');
  if (priceEl) priceEl.textContent = `¥${price.toLocaleString()}～`;

  const nextBtn = document.getElementById('toStep3Btn');
  if (nextBtn) {
    nextBtn.disabled = !AppState.selectedWorkId;
  }
}

function updateStep2BikeBanner() {
  const banner = document.getElementById('step2BikeBanner');
  const bike = AppState.selectedBike;
  if (!bike) return;

  const tagList = [];
  if (isHarley(bike)) tagList.push(`<span style="font-size:0.68rem; background:#ffedd5; color:#c2410c; padding:1px 6px; border-radius:3px; margin-left:4px;">Harley-Davidson</span>`);
  if (bike.scooter) tagList.push(`<span class="tag-scooter" style="font-size:0.68rem; background:#fef3c7; color:#b45309; padding:1px 6px; border-radius:3px; margin-left:4px;">${escapeHtml(bike.scooter)}</span>`);
  if (bike.dct) tagList.push(`<span class="tag-dct" style="font-size:0.68rem; background:#dbeafe; color:#1e40af; padding:1px 6px; border-radius:3px; margin-left:4px;">${escapeHtml(bike.dct)}</span>`);

  banner.innerHTML = `
    <div class="banner-left">
      <span class="banner-label">ご選択中の車両</span>
      <span class="banner-name">
        ${escapeHtml(bike.m)} ${escapeHtml(bike.n)} (${escapeHtml(bike.d || bike.cat)} / ${bike.y ? bike.y + '年' : ''})
        ${tagList.join('')}
      </span>
    </div>
    ${bike.img ? `<img src="${bike.img}" alt="車両" class="banner-thumb" onerror="this.style.display='none'">` : ''}
  `;
}

// ============================================================================
// STEP 3: CALENDAR (NO SAME-DAY, FUTURE ONLY) & CUSTOMER INFO
// ============================================================================
function initCalendarViewDate() {
  const today = new Date();
  AppState.calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
}

function formatDateYMD(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function renderCalendar() {
  const viewYear = AppState.calendarViewDate.getFullYear();
  const viewMonth = AppState.calendarViewDate.getMonth();

  document.getElementById('calCurrentMonth').textContent = `${viewYear}年 ${viewMonth + 1}月`;
  const grid = document.getElementById('calendarDaysGrid');
  grid.innerHTML = '';

  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevLastDate = new Date(viewYear, viewMonth, 0).getDate();

  // Strict rule: Today and past dates are NOT bookable (No same-day booking)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Prev month padding
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevLastDate - i + 1;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell disabled other-month';
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    grid.appendChild(cell);
  }

  // Active month
  for (let day = 1; day <= lastDate; day++) {
    const cellDate = new Date(viewYear, viewMonth, day);
    const dateStr = formatDateYMD(cellDate);
    
    const isUnbookable = cellDate < tomorrow;
    const isSelected = AppState.selectedDate === dateStr;

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    if (isUnbookable) {
      cell.classList.add('disabled');
    }
    if (isSelected) {
      cell.classList.add('selected');
    }

    const existingForDay = AppState.reservations.filter(r => r.date === dateStr && r.status !== 'CANCELLED');
    const bookedCount = existingForDay.length;

    let statusText = '◎';
    let statusClass = 'dot-avail';
    let isFull = false;

    if (bookedCount >= TIME_SLOTS_DEF.length) {
      statusText = '×';
      statusClass = 'dot-full';
      isFull = true;
    } else if (bookedCount >= TIME_SLOTS_DEF.length - 3) {
      statusText = '▲';
      statusClass = 'dot-few';
    }

    if (isUnbookable) {
      statusText = '-';
    }

    cell.innerHTML = `
      <span class="cal-day-num">${day}</span>
      <span class="cal-day-status ${isUnbookable ? '' : statusClass}">${statusText}</span>
    `;

    if (!isUnbookable && !isFull) {
      cell.addEventListener('click', () => {
        AppState.selectedDate = dateStr;
        AppState.selectedTimeSlot = null;
        renderCalendar();
        renderTimeSlots();
        validateStep3();
      });
    }

    grid.appendChild(cell);
  }

  renderTimeSlots();
}

function renderTimeSlots() {
  const container = document.getElementById('timeSlotsContainer');
  const dateBadge = document.getElementById('slotSelectedDateBadge');
  const durEl = document.getElementById('pitDurationNote');

  const durMin = calculateTotalDurationMin();
  durEl.textContent = `※作業目安時間 約${durMin}分`;

  if (!AppState.selectedDate) {
    dateBadge.textContent = '日付を選択してください';
    container.innerHTML = `
      <div class="empty-state-card">
        <span class="empty-icon">📅</span>
        <p>カレンダーから明日以降のご希望日をタップしてください。</p>
      </div>
    `;
    return;
  }

  const [y, m, d] = AppState.selectedDate.split('-');
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDateJP = `${y}年${Number(m)}月${Number(d)}日 (${weekDays[dateObj.getDay()]})`;

  dateBadge.textContent = formattedDateJP;
  container.innerHTML = '';

  const bookingsOnDate = AppState.reservations.filter(r => r.date === AppState.selectedDate && r.status !== 'CANCELLED');

  TIME_SLOTS_DEF.forEach(slotTime => {
    const isBooked = bookingsOnDate.some(r => r.time === slotTime);
    const isSelected = AppState.selectedTimeSlot === slotTime;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-btn ${isSelected ? 'selected' : ''}`;
    if (isBooked) {
      btn.disabled = true;
    }

    btn.innerHTML = `
      <span class="slot-time">${slotTime}</span>
      <span class="slot-state ${isBooked ? 'full' : 'avail'}">${isBooked ? '満車' : '空き'}</span>
    `;

    if (!isBooked) {
      btn.addEventListener('click', () => {
        AppState.selectedTimeSlot = slotTime;
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        validateStep3();
      });
    }

    container.appendChild(btn);
  });
}

function validateStep3() {
  const nextBtn = document.getElementById('toStep4Btn');
  const hasDateSlot = Boolean(AppState.selectedDate && AppState.selectedTimeSlot);
  nextBtn.disabled = !hasDateSlot;
}

// ============================================================================
// STEP NAVIGATION & VALIDATION
// ============================================================================
function goToStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > 4) return;

  AppState.currentStep = stepNumber;

  document.querySelectorAll('.step-node').forEach(node => {
    const s = Number(node.dataset.step);
    node.classList.remove('active', 'completed');
    if (s === stepNumber) {
      node.classList.add('active');
    } else if (s < stepNumber) {
      node.classList.add('completed');
    }
  });

  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  const currentPanel = document.getElementById(`step${stepNumber}`);
  if (currentPanel) {
    currentPanel.classList.add('active');
  }

  document.getElementById('stepperBar').scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (stepNumber === 2) {
    updateStep2BikeBanner();
    renderPitWorkList();
  }

  if (stepNumber === 4) {
    prepareStep4Review();
  }
}

function validateCustomerInputs() {
  const name = document.getElementById('custName');
  const kana = document.getElementById('custKana');
  const phone = document.getElementById('custPhone');
  const email = document.getElementById('custEmail');

  let valid = true;
  [name, kana, phone, email].forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error');
      valid = false;
    } else {
      field.classList.remove('error');
    }
  });

  if (!valid) {
    showToast('お客様情報の必須項目を入力してください', 'error');
  }
  return valid;
}

// ============================================================================
// STEP 4: REVIEW & TICKET ISSUANCE
// ============================================================================
function prepareStep4Review() {
  const bike = AppState.selectedBike || {};
  const total = calculateStep2Price();
  const workItems = getDynamicPitWorkItems(bike);
  const work = workItems.find(w => w.id === AppState.selectedWorkId) || { name: '', price: 0 };
  const isHarleyBike = isHarley(bike);

  // Vehicle Box
  let harleyOilsSpecText = '';
  if (isHarleyBike) {
    harleyOilsSpecText = `
      <div style="font-size:0.75rem; color:#c2410c; margin-top:2px;">
        エンジン:${bike.oil || '約3L'} / プライマリ:${bike.primaryOil || '約1L'} ${bike.transOil ? '/ ミッション:' + bike.transOil : ''}
      </div>
    `;
  }

  const vBox = document.getElementById('reviewVehicleContent');
  vBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:1.1rem; font-weight:800; color:var(--text-main);">${escapeHtml(bike.m)} ${escapeHtml(bike.n)}</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
          ${bike.y ? bike.y + '年式' : ''} / 排気量区分: ${escapeHtml(bike.cat || '')} (${escapeHtml(bike.d || '')}) / 型式: ${escapeHtml(bike.mo || '未指定')}
        </div>
        ${!isHarleyBike ? `
          <div style="font-size:0.78rem; color:var(--primary-color); font-weight:700; margin-top:4px;">
            規定オイル: ${escapeHtml(bike.oil || 'ー')} L (フィルタ時: ${escapeHtml(bike.fil || 'ー')} L)
          </div>
        ` : harleyOilsSpecText}
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          Fタイヤ: ${escapeHtml(bike.ft || '点検時確認')} / Rタイヤ: ${escapeHtml(bike.rt || '点検時確認')}
        </div>
      </div>
      ${bike.img ? `<img src="${bike.img}" style="max-height:60px; max-width:85px; object-fit:contain; border:1px solid #cbd5e1; border-radius:4px; background:#fff;" alt="車両">` : ''}
    </div>
  `;

  // DateTime Box
  const [y, m, d] = AppState.selectedDate.split('-');
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const formattedDateJP = `${y}年${Number(m)}月${Number(d)}日 (${weekDays[dateObj.getDay()]}) ${AppState.selectedTimeSlot}〜`;

  document.getElementById('reviewDateTimeSlot').innerHTML = `
    <div>⏱️ ${formattedDateJP}</div>
    <div style="font-size:0.75rem; font-weight:normal; color:var(--text-muted); margin-top:3px;">
      作業ピット: ２りんかん バイクピット #1 (目安所要時間: 約${calculateTotalDurationMin()}分)
    </div>
  `;

  // Work Receipt List
  let receiptHtml = `
    <div class="receipt-item">
      <span>🔧 ${escapeHtml(work.name)}</span>
      <span>¥${work.price.toLocaleString()}～</span>
    </div>
  `;

  if (work.id === 'oil-change' || work.id === 'element-change') {
    if (isHarleyBike) {
      receiptHtml += `
        <div class="receipt-item sub-item">
          <span>↳ 指定オイル: ${escapeHtml(HARLEY_OILS_MASTER.engine.name)}</span>
          <span>+¥4,000～</span>
        </div>
      `;
    } else {
      const oil = NORMAL_ENGINE_OILS.find(o => o.id === AppState.selectedOilId);
      if (oil) {
        receiptHtml += `
          <div class="receipt-item sub-item">
            <span>↳ 指定オイル: ${escapeHtml(oil.name)} (${escapeHtml(oil.viscosity)})</span>
            <span>+¥${oil.extraPrice.toLocaleString()}～</span>
          </div>
        `;
      }
    }
  }

  // DCT add-on
  if (work.id === 'element-change' && AppState.includeDctFilter) {
    receiptHtml += `
      <div class="receipt-item sub-item">
        <span>↳ 追加: DCTフィルター交換工賃</span>
        <span>+¥1,650～</span>
      </div>
    `;
  }

  // Harley specific oil add-ons
  if (isHarleyBike && (work.id === 'oil-change' || work.id === 'element-change')) {
    if (AppState.harleyAddPrimary) {
      const pName = isSportster(bike) ? HARLEY_OILS_MASTER.sportsterPrimary.name : HARLEY_OILS_MASTER.primary.name;
      receiptHtml += `
        <div class="receipt-item sub-item">
          <span>↳ 追加: ${escapeHtml(pName)}</span>
          <span>+¥4,000～</span>
        </div>
      `;
    }
    if (AppState.harleyAddTrans) {
      receiptHtml += `
        <div class="receipt-item sub-item">
          <span>↳ 追加: ${escapeHtml(HARLEY_OILS_MASTER.trans.name)}</span>
          <span>+¥4,000～</span>
        </div>
      `;
    }
    if (AppState.selectedHarleyFilterChoice) {
      receiptHtml += `
        <div class="receipt-item sub-item" style="color:#c2410c; font-weight:700;">
          <span>↳ フィルター指定: ${escapeHtml(AppState.selectedHarleyFilterChoice)}</span>
          <span>適合確認済</span>
        </div>
      `;
    }
  }

  document.getElementById('reviewMenuList').innerHTML = receiptHtml;
  document.getElementById('reviewTotalPrice').textContent = `¥${total.toLocaleString()}～`;

  // Customer DL
  const name = document.getElementById('custName').value.trim();
  const kana = document.getElementById('custKana').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const remarks = document.getElementById('custRemarks').value.trim() || '特になし';

  document.getElementById('reviewCustomerInfo').innerHTML = `
    <dt>お名前:</dt><dd>${escapeHtml(name)} (${escapeHtml(kana)})</dd>
    <dt>電話番号:</dt><dd>${escapeHtml(phone)}</dd>
    <dt>メール:</dt><dd>${escapeHtml(email)}</dd>
    <dt>ご要望:</dt><dd>${escapeHtml(remarks)}</dd>
  `;

  const termsBox = document.getElementById('termsAgreement');
  termsBox.checked = false;
  document.getElementById('submitBookingBtn').disabled = true;
}

function submitBooking() {
  const bike = AppState.selectedBike || {};
  const total = calculateStep2Price();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const reservationId = `PIT-${randomSuffix}`;
  const isHarleyBike = isHarley(bike);

  const workItems = getDynamicPitWorkItems(bike);
  const work = workItems.find(w => w.id === AppState.selectedWorkId) || { name: '' };

  let oilName = '';
  if (work.id === 'oil-change' || work.id === 'element-change') {
    if (isHarleyBike) {
      oilName = HARLEY_OILS_MASTER.engine.name;
    } else {
      const oil = NORMAL_ENGINE_OILS.find(o => o.id === AppState.selectedOilId);
      if (oil) oilName = oil.name;
    }
  }

  const harleyDetails = isHarleyBike ? {
    primaryAdded: AppState.harleyAddPrimary,
    transAdded: AppState.harleyAddTrans,
    useFilterSet: AppState.harleyUseFilterSet,
    filterChoice: AppState.selectedHarleyFilterChoice
  } : null;

  const newBooking = {
    id: reservationId,
    createdAt: new Date().toISOString(),
    status: 'CONFIRMED',
    date: AppState.selectedDate,
    time: AppState.selectedTimeSlot,
    bike: {
      maker: bike.m,
      disp: bike.d,
      cat: bike.cat,
      name: bike.n,
      year: bike.y,
      model: bike.mo,
      oil: bike.oil,
      primaryOil: bike.primaryOil || '',
      transOil: bike.transOil || '',
      fil: bike.fil,
      frontTire: bike.ft,
      rearTire: bike.rt,
      scooter: bike.scooter || '',
      dct: bike.dct || '',
      img: bike.img || ''
    },
    workName: work.name,
    oilName: oilName,
    harleyDetails: harleyDetails,
    dctAdded: AppState.includeDctFilter,
    totalPrice: total,
    customer: {
      name: document.getElementById('custName').value.trim(),
      kana: document.getElementById('custKana').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      email: document.getElementById('custEmail').value.trim(),
      remarks: document.getElementById('custRemarks').value.trim() || ''
    }
  };

  AppState.reservations.unshift(newBooking);
  saveReservations();
  AppState.lastCompletedBooking = newBooking;

  displaySuccessTicket(newBooking);
  updateAdminDashboard();
  showToast(`予約番号 ${reservationId} で確定しました！`, 'success');
}

function displaySuccessTicket(booking) {
  document.getElementById('step4ReviewPanel').classList.add('hidden');
  const successPanel = document.getElementById('step4SuccessPanel');
  successPanel.classList.remove('hidden');

  document.getElementById('ticketReservationId').textContent = booking.id;
  document.getElementById('ticketDateTime').textContent = `${booking.date}  ${booking.time}〜`;
  document.getElementById('ticketCar').textContent = `${booking.bike.maker} ${booking.bike.name} (${booking.bike.cat || booking.bike.disp} / ${booking.bike.year ? booking.bike.year + '年' : ''})`;

  let workStr = booking.workName;
  if (booking.oilName) workStr += ` [${booking.oilName}]`;
  if (booking.dctAdded) workStr += ` (+DCTフィルター交換)`;

  if (booking.harleyDetails) {
    const adds = [];
    if (booking.harleyDetails.primaryAdded) adds.push('プライマリーオイル');
    if (booking.harleyDetails.transAdded) adds.push('ミッションオイル');
    if (adds.length) workStr += ` (+${adds.join('＆')})`;
    if (booking.harleyDetails.filterChoice) workStr += ` [指定:${booking.harleyDetails.filterChoice}]`;
  }

  document.getElementById('ticketWorkList').textContent = workStr;

  let oilStr = booking.bike.oil ? `${booking.bike.oil} L` : '点検時確認';
  if (booking.bike.maker && booking.bike.maker.toLowerCase().includes('harley')) {
    oilStr = `エンジン:${booking.bike.oil || '約3L'} / プライマリ:${booking.bike.primaryOil || '約1L'}`;
  }
  document.getElementById('ticketOilAmount').textContent = oilStr;

  document.getElementById('ticketCustName').textContent = `${booking.customer.name} 様`;
  document.getElementById('ticketPrice').textContent = `¥${booking.totalPrice.toLocaleString()}～ (税込)`;
}

function resetBookingFlow() {
  document.getElementById('step4SuccessPanel').classList.add('hidden');
  document.getElementById('step4ReviewPanel').classList.remove('hidden');

  document.getElementById('filterMaker').value = '';
  document.getElementById('filterDisp').innerHTML = '<option value="">先にメーカーを選択してください</option>';
  document.getElementById('filterDisp').disabled = true;
  document.getElementById('filterName').innerHTML = '<option value="">先に排気量を選択してください</option>';
  document.getElementById('filterName').disabled = true;
  document.getElementById('filterYear').innerHTML = '<option value="">先に車種を選択してください</option>';
  document.getElementById('filterYear').disabled = true;
  document.getElementById('filterModel').innerHTML = '<option value="">先に年式を選択してください</option>';
  document.getElementById('filterModel').disabled = true;
  hideBikePreview();

  document.getElementById('custName').value = '';
  document.getElementById('custKana').value = '';
  document.getElementById('custPhone').value = '';
  document.getElementById('custEmail').value = '';
  document.getElementById('custRemarks').value = '';

  AppState.selectedBike = null;
  AppState.selectedWorkId = 'oil-change';
  AppState.includeDctFilter = false;
  AppState.harleyAddPrimary = false;
  AppState.harleyAddTrans = false;
  AppState.harleyUseFilterSet = false;
  AppState.selectedHarleyFilterChoice = '';
  AppState.selectedOilId = 'oil-4trs';
  AppState.selectedDate = null;
  AppState.selectedTimeSlot = null;

  renderCalendar();
  goToStep(1);
}

// ============================================================================
// ADMIN DASHBOARD & CALENDAR CONTROLLER
// ============================================================================
function updateAdminDashboard() {
  const reservations = AppState.reservations;
  const tbody = document.getElementById('adminReservationsTbody');
  const filterVal = document.getElementById('adminStatusFilter').value;
  const searchVal = document.getElementById('adminSearchInput').value.toLowerCase().trim();

  const totalCount = reservations.length;
  const confirmedCount = reservations.filter(r => r.status === 'CONFIRMED').length;
  const completedCount = reservations.filter(r => r.status === 'COMPLETED').length;
  const totalRevenue = reservations
    .filter(r => r.status !== 'CANCELLED')
    .reduce((sum, r) => sum + (r.totalPrice || 0), 0);

  document.getElementById('statTotalBookings').textContent = totalCount;
  document.getElementById('statConfirmedBookings').textContent = confirmedCount;
  document.getElementById('statCompletedBookings').textContent = completedCount;
  document.getElementById('statEstimatedRevenue').textContent = `¥${totalRevenue.toLocaleString()}～`;

  updateAdminBadge();
  renderAdminCalendar();

  // Apply calendar date filter if active
  let filtered = reservations;
  if (AppState.adminCalSelectedDate) {
    filtered = filtered.filter(r => r.date === AppState.adminCalSelectedDate);
    const noteEl = document.getElementById('adminCalSelectedDateNote');
    if (noteEl) {
      noteEl.style.display = 'block';
      noteEl.textContent = `📌 絞り込み中: ${AppState.adminCalSelectedDate} の予約 (${filtered.length}件)`;
    }
  } else {
    const noteEl = document.getElementById('adminCalSelectedDateNote');
    if (noteEl) noteEl.style.display = 'none';
  }

  filtered = filtered.filter(r => {
    const matchStatus = filterVal === 'ALL' || r.status === filterVal;
    if (!matchStatus) return false;

    if (!searchVal) return true;
    const searchTarget = [
      r.id,
      r.customer.name,
      r.customer.phone,
      r.bike.maker,
      r.bike.name,
      r.bike.model,
      r.workName
    ].join(' ').toLowerCase();

    return searchTarget.includes(searchVal);
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">該当する予約データがありません。</td>`;
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement('tr');
    const statusLabel = {
      CONFIRMED: '予約確定',
      IN_PROGRESS: '作業中',
      COMPLETED: '作業完了',
      CANCELLED: 'キャンセル'
    }[r.status] || r.status;

    let workSummary = r.workName;
    if (r.oilName) workSummary += ` (${r.oilName})`;
    if (r.dctAdded) workSummary += ` [+DCT]`;
    if (r.harleyDetails) {
      if (r.harleyDetails.primaryAdded) workSummary += ` [+プライマリ]`;
      if (r.harleyDetails.transAdded) workSummary += ` [+ミッション]`;
      if (r.harleyDetails.useFilterSet) workSummary += ` [セット]`;
    }

    tr.innerHTML = `
      <td style="font-family:monospace; font-weight:800;">${escapeHtml(r.id)}</td>
      <td>
        <div style="font-weight:700;">${escapeHtml(r.date)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(r.time)}</div>
      </td>
      <td>
        <div style="font-weight:700;">${escapeHtml(r.customer.name)}</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(r.customer.phone)}</div>
      </td>
      <td>
        <div style="font-weight:700;">${escapeHtml(r.bike.maker)} ${escapeHtml(r.bike.name)}</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(r.bike.cat || r.bike.disp)} [${escapeHtml(r.bike.model || '')}]</div>
      </td>
      <td>
        <div style="font-size:0.8rem; font-weight:600;">${escapeHtml(workSummary)}</div>
        <div style="font-weight:800; color:var(--primary-color);">¥${r.totalPrice.toLocaleString()}～</div>
      </td>
      <td>
        <span class="status-badge ${r.status}">${statusLabel}</span>
      </td>
      <td>
        <button class="btn-table-action" onclick="openDetailModal('${r.id}')">詳細</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdminCalendar() {
  const container = document.getElementById('adminCalendarDaysGrid');
  if (!container) return;

  const currentYear = AppState.adminCalViewDate.getFullYear();
  const currentMonth = AppState.adminCalViewDate.getMonth();

  const titleEl = document.getElementById('adminCalCurrentMonth');
  if (titleEl) {
    titleEl.textContent = `${currentYear}年 ${currentMonth + 1}月`;
  }

  container.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Booking count per date in this month
  const countByDate = {};
  AppState.reservations.forEach(r => {
    if (r.status !== 'CANCELLED') {
      countByDate[r.date] = (countByDate[r.date] || 0) + 1;
    }
  });

  // Empty leading days
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'admin-cal-day-cell empty';
    container.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
    const count = countByDate[dateStr] || 0;
    const isSelected = AppState.adminCalSelectedDate === dateStr;

    const cell = document.createElement('div');
    cell.className = `admin-cal-day-cell ${isSelected ? 'selected' : ''} ${count > 0 ? 'has-bookings' : ''}`;
    if (dayOfWeek === 0) cell.classList.add('sun');
    if (dayOfWeek === 6) cell.classList.add('sat');

    let badgeHtml = '';
    if (count > 0) {
      badgeHtml = `<span class="admin-cal-badge">${count}件</span>`;
    }

    cell.innerHTML = `
      <div class="day-num">${day}</div>
      ${badgeHtml}
    `;

    cell.addEventListener('click', () => {
      if (AppState.adminCalSelectedDate === dateStr) {
        AppState.adminCalSelectedDate = null; // Toggle off
      } else {
        AppState.adminCalSelectedDate = dateStr;
      }
      updateAdminDashboard();
    });

    container.appendChild(cell);
  }
}

function updateAdminBadge() {
  const badge = document.getElementById('adminBadgeCount');
  const count = AppState.reservations.filter(r => r.status === 'CONFIRMED').length;
  badge.textContent = count;
}

window.openDetailModal = function(bookingId) {
  const booking = AppState.reservations.find(r => r.id === bookingId);
  if (!booking) return;

  const modal = document.getElementById('bookingDetailModal');
  document.getElementById('modalBookingId').textContent = `予約詳細: ${booking.id}`;

  const imgThumbHtml = booking.bike.img ? `
    <div style="margin-top: 6px;">
      <img src="${booking.bike.img}" style="max-height: 80px; border-radius: 4px; border: 1px solid var(--border-color);" alt="車両写真" onerror="this.style.display='none'">
    </div>
  ` : '';

  let harleyDetailHtml = '';
  if (booking.harleyDetails) {
    harleyDetailHtml = `
      <span style="color:var(--text-muted);">ハーレー追加指定:</span>
      <span style="color:#c2410c; font-weight:700;">
        プライマリ:${booking.harleyDetails.primaryAdded ? 'あり(+¥4000～)' : 'なし'} / 
        ミッション:${booking.harleyDetails.transAdded ? 'あり(+¥4000～)' : 'なし'}<br>
        フィルター:${escapeHtml(booking.harleyDetails.filterChoice || '未選択')}
      </span>
    `;
  }

  const content = document.getElementById('modalDetailContent');
  content.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <span class="status-badge ${booking.status}">ステータス: ${booking.status}</span>
    </div>
    <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px; font-size: 0.88rem; margin-bottom: 1.25rem;">
      <span style="color:var(--text-muted);">ご予約日時:</span>
      <span style="font-weight:800;">${booking.date} ${booking.time}</span>
      
      <span style="color:var(--text-muted);">お客様氏名:</span>
      <span>${escapeHtml(booking.customer.name)} (${escapeHtml(booking.customer.kana)})</span>
      
      <span style="color:var(--text-muted);">連絡先:</span>
      <span>${escapeHtml(booking.customer.phone)} / ${escapeHtml(booking.customer.email)}</span>
      
      <span style="color:var(--text-muted);">ご予約車両:</span>
      <div>
        <div style="font-weight:800;">${escapeHtml(booking.bike.maker)} ${escapeHtml(booking.bike.name)} (${escapeHtml(booking.bike.cat || booking.bike.disp)})</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">年式: ${escapeHtml(booking.bike.year || '')} / 型式: ${escapeHtml(booking.bike.model || '')}</div>
        ${imgThumbHtml}
      </div>

      <span style="color:var(--text-muted);">規定オイル量:</span>
      <span>${booking.bike.oil ? `${booking.bike.oil}` : 'ー'} ${booking.bike.primaryOil ? ' (プライマリ:' + booking.bike.primaryOil + ')' : ''}</span>

      <span style="color:var(--text-muted);">規定タイヤ:</span>
      <span>F: ${escapeHtml(booking.bike.frontTire || 'ー')} / R: ${escapeHtml(booking.bike.rearTire || 'ー')}</span>

      <span style="color:var(--text-muted);">PIT作業内容:</span>
      <span style="font-weight:700;">
        ${escapeHtml(booking.workName)}
        ${booking.oilName ? ` (${booking.oilName})` : ''}
        ${booking.dctAdded ? ` (+DCTフィルター交換)` : ''}
      </span>

      ${harleyDetailHtml}

      <span style="color:var(--text-muted);">請求予定工賃:</span>
      <span style="font-weight:800; color:var(--primary-color);">¥${booking.totalPrice.toLocaleString()}～ (税込)</span>

      <span style="color:var(--text-muted);">備考・要望:</span>
      <span>${escapeHtml(booking.customer.remarks || '特になし')}</span>
    </div>
  `;

  // Status Action Buttons
  const actionsContainer = document.getElementById('modalStatusActions');
  actionsContainer.innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="changeBookingStatus('${booking.id}', 'CONFIRMED')">確定に戻す</button>
    <button class="btn btn-primary btn-sm" onclick="changeBookingStatus('${booking.id}', 'IN_PROGRESS')">作業開始</button>
    <button class="btn btn-accent btn-sm" onclick="changeBookingStatus('${booking.id}', 'COMPLETED')">作業完了</button>
    <button class="btn btn-danger btn-sm" onclick="changeBookingStatus('${booking.id}', 'CANCELLED')">キャンセル</button>
  `;

  modal.classList.remove('hidden');
};

window.changeBookingStatus = function(bookingId, newStatus) {
  const booking = AppState.reservations.find(r => r.id === bookingId);
  if (booking) {
    booking.status = newStatus;
    saveReservations();
    updateAdminDashboard();
    document.getElementById('bookingDetailModal').classList.add('hidden');
    showToast(`ステータスを【${newStatus}】へ変更しました`, 'info');
  }
};

function exportReservationsToCsv() {
  if (!AppState.reservations.length) {
    showToast('エクスポートするデータがありません', 'error');
    return;
  }

  const header = ['予約番号', '作成日', 'ステータス', '予約日', '予約時間', 'お客様氏名', 'フリガナ', '電話番号', 'メール', 'メーカー', '排気量区分', '車種名', '年式', '型式', 'オイル量', 'Fタイヤ', 'Rタイヤ', '作業内容', 'オイル種類', 'DCT追加', 'プライマリ追加', 'ミッション追加', 'フィルター指定', '工賃合計', '備考'];
  const rows = AppState.reservations.map(r => [
    r.id,
    r.createdAt,
    r.status,
    r.date,
    r.time,
    r.customer.name,
    r.customer.kana,
    r.customer.phone,
    r.customer.email,
    r.bike.maker,
    r.bike.cat || r.bike.disp,
    r.bike.name,
    r.bike.year,
    r.bike.model,
    r.bike.oil,
    r.bike.frontTire,
    r.bike.rearTire,
    r.workName,
    r.oilName || '',
    r.dctAdded ? 'あり' : 'なし',
    (r.harleyDetails && r.harleyDetails.primaryAdded) ? 'あり' : 'なし',
    (r.harleyDetails && r.harleyDetails.transAdded) ? 'あり' : 'なし',
    (r.harleyDetails && r.harleyDetails.filterChoice) ? r.harleyDetails.filterChoice : '',
    r.totalPrice,
    r.customer.remarks || ''
  ]);

  const csvContent = '\uFEFF' + [header, ...rows]
    .map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Bike_Pit_Bookings_${formatDateYMD(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('予約データをCSV出力しました', 'success');
}

// ============================================================================
// STORE EMAIL NOTIFICATION & A4 PRINTABLE DISPATCH SHEET
// ============================================================================
function renderStoreEmailView(targetBookingId) {
  const selector = document.getElementById('emailBookingSelector');
  if (!selector) return;

  // Populate booking selector
  selector.innerHTML = '';
  if (!AppState.reservations.length) {
    selector.innerHTML = `<option value="">予約データがありません</option>`;
    return;
  }

  AppState.reservations.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `${r.date} ${r.time} - ${r.customer.name}様 (${r.bike.maker} ${r.bike.name})`;
    selector.appendChild(opt);
  });

  let selectedId = targetBookingId || selector.value;
  if (!selectedId && AppState.reservations.length > 0) {
    selectedId = AppState.reservations[0].id;
  }
  selector.value = selectedId;

  fillStoreEmailDetails(selectedId);
}

function fillStoreEmailDetails(bookingId) {
  const booking = AppState.reservations.find(r => r.id === bookingId);
  if (!booking) return;

  // Email meta header
  document.getElementById('emailMockSubject').textContent = `【２りんかん WEB予約】PIT作業の予約が入りました (予約番号: ${booking.id} / ${booking.customer.name}様)`;
  document.getElementById('emailMockReceivedAt').textContent = booking.createdAt || formatDateYMD(new Date());

  // A4 Printable Sheet
  document.getElementById('printReserveId').textContent = booking.id;
  document.getElementById('printIssuedAt').textContent = `受付日時: ${booking.createdAt || formatDateYMD(new Date())}`;

  // Customer info
  document.getElementById('printCustName').textContent = booking.customer.name;
  document.getElementById('printCustKana').textContent = booking.customer.kana || '--';
  document.getElementById('printCustPhone').textContent = booking.customer.phone;
  document.getElementById('printCustEmail').textContent = booking.customer.email || '未記入';
  document.getElementById('printCustRemarks').textContent = booking.customer.remarks || '特になし';

  // Schedule info
  document.getElementById('printDateTime').textContent = `${booking.date} ${booking.time}`;
  document.getElementById('printDuration').textContent = `約${booking.durationMin || 30}分`;
  const statusBadge = document.getElementById('printStatusBadge');
  statusBadge.className = `status-badge ${booking.status}`;
  statusBadge.textContent = {
    CONFIRMED: '予約確定',
    IN_PROGRESS: '作業中',
    COMPLETED: '作業完了',
    CANCELLED: 'キャンセル'
  }[booking.status] || booking.status;

  // Vehicle info
  document.getElementById('printBikeName').textContent = `${booking.bike.maker} ${booking.bike.name}`;
  document.getElementById('printBikeDetails').textContent = `${booking.bike.cat || booking.bike.disp} | 年式: ${booking.bike.year || '未設定'} | 型式: ${booking.bike.model || '未設定'}`;
  
  let oilSpecStr = `エンジン規定量: ${booking.bike.oil || 'ー'}`;
  if (booking.bike.primaryOil) oilSpecStr += ` / プライマリ規定量: ${booking.bike.primaryOil}`;
  if (booking.bike.transOil) oilSpecStr += ` / ミッション規定量: ${booking.bike.transOil}`;
  document.getElementById('printBikeOilSpec').textContent = oilSpecStr;

  document.getElementById('printBikeTireSpec').textContent = `F: ${booking.bike.frontTire || 'ー'} / R: ${booking.bike.rearTire || 'ー'}`;

  const imgContainer = document.getElementById('printBikeImgContainer');
  if (booking.bike.img) {
    imgContainer.innerHTML = `<img src="${booking.bike.img}" style="max-width:90px; max-height:75px; object-fit:contain; border-radius:4px; border:1px solid #cbd5e1;" alt="車両写真" onerror="this.style.display='none'">`;
  } else {
    imgContainer.innerHTML = '';
  }

  // Work Details and Required Parts / Oils
  const tbody = document.getElementById('printPartsTableBody');
  tbody.innerHTML = '';

  const isHarleyBike = isHarley(booking.bike);

  // 1. Main PIT labor
  const mainRow = document.createElement('tr');
  mainRow.innerHTML = `
    <td><strong>基本作業工賃</strong></td>
    <td>
      <strong style="color:#0f172a;">${escapeHtml(booking.workName)}</strong>
      <div style="font-size:0.75rem; color:#64748b;">標準ピット作業 (${booking.durationMin || 30}分)</div>
    </td>
    <td style="text-align:right; font-weight:700;">¥${(booking.workPrice || 1100).toLocaleString()}～</td>
  `;
  tbody.appendChild(mainRow);

  // 2. Engine Oil (if applicable)
  if (booking.oilName) {
    const oilRow = document.createElement('tr');
    oilRow.innerHTML = `
      <td><span style="color:#2563eb; font-weight:700;">使用エンジンオイル</span></td>
      <td>
        <strong style="color:#2563eb;">${escapeHtml(booking.oilName)}</strong>
        <div style="font-size:0.75rem; color:#475569;">
          規定量: ${booking.bike.oil || '規定量'}${isHarleyBike ? ' (※ハーレー専用ボトル供給)' : ' (※店頭専用量り売り供給)'}
        </div>
      </td>
      <td style="text-align:right; font-weight:700;">${booking.oilPrice ? `+¥${booking.oilPrice.toLocaleString()}～` : '工賃に含む'}</td>
    `;
    tbody.appendChild(oilRow);
  }

  // 3. Oil Filter / Element details
  if (booking.workId === 'element-change' || (booking.workName && booking.workName.includes('エレメント'))) {
    const filterRow = document.createElement('tr');
    let filterPartText = '車種適合エンジンオイルフィルター（パッキン/Oリング含む）';
    if (booking.harleyDetails && booking.harleyDetails.filterChoice) {
      filterPartText = `【ハーレー指定品】${booking.harleyDetails.filterChoice}`;
    }

    filterRow.innerHTML = `
      <td><span style="color:#d97706; font-weight:700;">使用オイルフィルター</span></td>
      <td>
        <strong style="color:#b45309;">${escapeHtml(filterPartText)}</strong>
        <div style="font-size:0.75rem; color:#475569;">取付時Oリング部オイル塗布・規定トルク管理</div>
      </td>
      <td style="text-align:right; font-weight:700;">作業内包</td>
    `;
    tbody.appendChild(filterRow);
  }

  // 4. DCT Filter (if selected)
  if (booking.dctAdded) {
    const dctRow = document.createElement('tr');
    dctRow.innerHTML = `
      <td><span style="color:#7c3aed; font-weight:700;">追加部品 (DCT)</span></td>
      <td>
        <strong style="color:#6d28d9;">ホンダ純正DCTクラッチフィルター ＆ Oリング</strong>
        <div style="font-size:0.75rem; color:#475569;">DCTクラッチカバー脱着・フィルター交換</div>
      </td>
      <td style="text-align:right; font-weight:700;">+¥1,650～</td>
    `;
    tbody.appendChild(dctRow);
  }

  // 5. Harley Additional Oils
  if (booking.harleyDetails) {
    if (booking.harleyDetails.primaryAdded) {
      const pRow = document.createElement('tr');
      pRow.innerHTML = `
        <td><span style="color:#c2410c; font-weight:700;">追加油脂 (プライマリ)</span></td>
        <td>
          <strong style="color:#c2410c;">ハーレー専用プライマリーオイル (規定量: ${booking.bike.primaryOil || '要確認'})</strong>
          <div style="font-size:0.75rem; color:#475569;">チェーンケースドレン＆インスペクションカバー点検</div>
        </td>
        <td style="text-align:right; font-weight:700;">+¥4,000～</td>
      `;
      tbody.appendChild(pRow);
    }
    if (booking.harleyDetails.transAdded) {
      const tRow = document.createElement('tr');
      tRow.innerHTML = `
        <td><span style="color:#c2410c; font-weight:700;">追加油脂 (ミッション)</span></td>
        <td>
          <strong style="color:#c2410c;">ハーレー専用トランスミッションオイル (規定量: ${booking.bike.transOil || '要確認'})</strong>
          <div style="font-size:0.75rem; color:#475569;">ギヤボックストランスミッションフルード交換</div>
        </td>
        <td style="text-align:right; font-weight:700;">+¥4,000～</td>
      `;
      tbody.appendChild(tRow);
    }
  }

  document.getElementById('printTotalPrice').textContent = `¥${booking.totalPrice.toLocaleString()}～ (税込)`;
}

// ============================================================================
// EVENTS BINDING
// ============================================================================
function bindEventHandlers() {
  const userBtn = document.getElementById('navUserViewBtn');
  const adminBtn = document.getElementById('navAdminViewBtn');
  const emailBtn = document.getElementById('navEmailViewBtn');
  const userView = document.getElementById('userReservationView');
  const adminView = document.getElementById('adminDashboardView');
  const emailView = document.getElementById('storeEmailView');

  function switchTab(target) {
    [userBtn, adminBtn, emailBtn].forEach(btn => btn && btn.classList.remove('active'));
    [userView, adminView, emailView].forEach(view => view && view.classList.remove('active'));

    if (target === 'user') {
      userBtn.classList.add('active');
      userView.classList.add('active');
    } else if (target === 'admin') {
      adminBtn.classList.add('active');
      adminView.classList.add('active');
      updateAdminDashboard();
    } else if (target === 'email') {
      if (emailBtn) emailBtn.classList.add('active');
      if (emailView) emailView.classList.add('active');
      renderStoreEmailView();
    }
  }

  userBtn.addEventListener('click', () => switchTab('user'));
  adminBtn.addEventListener('click', () => switchTab('admin'));
  if (emailBtn) emailBtn.addEventListener('click', () => switchTab('email'));

  document.getElementById('brandLogo').addEventListener('click', () => {
    switchTab('user');
  });

  // Step 1 to 2
  document.getElementById('toStep2Btn').addEventListener('click', () => {
    goToStep(2);
  });

  // Step 2 to 1 and to 3
  document.getElementById('backToStep1Btn').addEventListener('click', () => {
    goToStep(1);
  });

  document.getElementById('toStep3Btn').addEventListener('click', () => {
    goToStep(3);
  });

  // DCT Checkbox change
  const dctCheck = document.getElementById('dctFilterCheckbox');
  if (dctCheck) {
    dctCheck.addEventListener('change', () => {
      AppState.includeDctFilter = dctCheck.checked;
      updateStep2Price();
    });
  }

  // Step 3 Month Navigation
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    const cur = AppState.calendarViewDate;
    AppState.calendarViewDate = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    const cur = AppState.calendarViewDate;
    AppState.calendarViewDate = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    renderCalendar();
  });

  // Step 3 to 2 and to 4
  document.getElementById('backToStep2Btn').addEventListener('click', () => {
    goToStep(2);
  });

  document.getElementById('toStep4Btn').addEventListener('click', () => {
    if (validateCustomerInputs()) {
      goToStep(4);
    }
  });

  // Step 4 to 3 and Submit
  document.getElementById('backToStep3Btn').addEventListener('click', () => {
    goToStep(3);
  });

  const termsBox = document.getElementById('termsAgreement');
  const submitBtn = document.getElementById('submitBookingBtn');
  termsBox.addEventListener('change', () => {
    submitBtn.disabled = !termsBox.checked;
  });

  submitBtn.addEventListener('click', () => {
    submitBooking();
  });

  // Ticket Actions
  document.getElementById('printTicketBtn').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('resetNewBookingBtn').addEventListener('click', () => {
    resetBookingFlow();
  });

  // Admin Controls
  document.getElementById('adminSearchInput').addEventListener('input', () => {
    updateAdminDashboard();
  });

  document.getElementById('adminStatusFilter').addEventListener('change', () => {
    updateAdminDashboard();
  });

  document.getElementById('adminExportCsvBtn').addEventListener('click', () => {
    exportReservationsToCsv();
  });

  document.getElementById('adminSeedDataBtn').addEventListener('click', () => {
    injectSeedData(true);
  });

  document.getElementById('adminResetDataBtn').addEventListener('click', () => {
    if (confirm('全ての予約データをリセットしますか？')) {
      AppState.reservations = [];
      AppState.adminCalSelectedDate = null;
      saveReservations();
      updateAdminDashboard();
      showToast('全データをリセットしました', 'info');
    }
  });

  // Admin Calendar Controls
  const adminPrevMonthBtn = document.getElementById('adminPrevMonthBtn');
  if (adminPrevMonthBtn) {
    adminPrevMonthBtn.addEventListener('click', () => {
      const cur = AppState.adminCalViewDate;
      AppState.adminCalViewDate = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
      renderAdminCalendar();
    });
  }

  const adminNextMonthBtn = document.getElementById('adminNextMonthBtn');
  if (adminNextMonthBtn) {
    adminNextMonthBtn.addEventListener('click', () => {
      const cur = AppState.adminCalViewDate;
      AppState.adminCalViewDate = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      renderAdminCalendar();
    });
  }

  const adminCalClearFilterBtn = document.getElementById('adminCalClearFilterBtn');
  if (adminCalClearFilterBtn) {
    adminCalClearFilterBtn.addEventListener('click', () => {
      AppState.adminCalSelectedDate = null;
      updateAdminDashboard();
    });
  }

  // Store Email Controls
  const emailBookingSelector = document.getElementById('emailBookingSelector');
  if (emailBookingSelector) {
    emailBookingSelector.addEventListener('change', (e) => {
      fillStoreEmailDetails(e.target.value);
    });
  }

  const printEmailSheetBtn = document.getElementById('printEmailSheetBtn');
  if (printEmailSheetBtn) {
    printEmailSheetBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Modal Close
  document.getElementById('modalCloseBtn').addEventListener('click', () => {
    document.getElementById('bookingDetailModal').classList.add('hidden');
  });

  document.getElementById('bookingDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookingDetailModal') {
      document.getElementById('bookingDetailModal').classList.add('hidden');
    }
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '⚠️'
  };

  iconEl.textContent = icons[type] || 'ℹ️';
  msgEl.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

