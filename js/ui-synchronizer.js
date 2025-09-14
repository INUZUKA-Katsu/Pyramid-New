// UI要素間の同期・連動を管理するクラス
// スライドバーとセレクトボックスの双方向連動を実現
class UISynchronizer {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('UISynchronizer: 初期化開始');
    
    // DOMContentLoadedイベントを待つ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupAllSynchronizations();
      });
    } else {
      // 既にDOMが読み込まれている場合
      this.setupAllSynchronizations();
    }
    
    this.isInitialized = true;
  }

  setupAllSynchronizations() {
    console.log('UISynchronizer: 同期設定開始');
    
    // スライドバー → セレクトボックスの連動（既存機能の移行）
    this.setupSliderToSelectBox();
    
    // セレクトボックス → スライドバーの連動（新規追加）
    this.setupSelectBoxToSlider();
    
    console.log('UISynchronizer: 同期設定完了');
  }

  // スライドバーからセレクトボックスへの連動（既存のindex.htmlのsetupYearSliders()を移行）
  setupSliderToSelectBox() {
    console.log('UISynchronizer: スライドバー→セレクトボックス連動設定');
    
    // 市区ピラミッド用スライドバー
    const shikuSlider = document.getElementById("shiku-year-slider");
    const shikuSliderDisplay = document.getElementById("shiku-year-slider-display");
    const shikuSliderContainer = document.getElementById("shiku-year-slider-container");

    if (shikuSlider && shikuSliderDisplay && shikuSliderContainer) {
      let isDragging = false;

      shikuSlider.addEventListener("input", function () {
        const progress = parseInt(this.value);
        const pyramode = get_pyramid_mode();

        if (pyramode === "shiku" || pyramode === "age") {
          const selectElement = document.getElementById("shiku_year");
          if (selectElement && selectElement.options.length > 0) {
            // 方向を逆転：0%が過去、100%が最新
            const targetIndex = Math.floor(
              ((100 - progress) / 100) *
                (selectElement.options.length - 1)
            );
            const clampedIndex = Math.max(
              0,
              Math.min(targetIndex, selectElement.options.length - 1)
            );
            const targetOption = selectElement.options[clampedIndex];

            // 機能的に必要：削除しないでください
            shikuSliderDisplay.textContent = targetOption.text;
            if (isDragging) {
              // ドラッグ中は表示のみ更新
              selectElement.value = targetOption.value;
            }
          }
        }
      });

      shikuSlider.addEventListener("mousedown", function () {
        isDragging = true;
      });

      shikuSlider.addEventListener("mouseup", function () {
        isDragging = false;
        // ドラッグ終了時に描画
        const selectElement = document.getElementById("shiku_year");
        if (selectElement) {
          selectElement.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });

      shikuSlider.addEventListener("touchstart", function () {
        isDragging = true;
      });

      shikuSlider.addEventListener("touchend", function () {
        isDragging = false;
        // ドラッグ終了時に描画
        const selectElement = document.getElementById("shiku_year");
        if (selectElement) {
          selectElement.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });
    }

    // 町丁別ピラミッド用スライドバー
    const choSlider = document.getElementById("cho-year-slider");
    const choSliderDisplay = document.getElementById("cho-year-slider-display");
    const choSliderContainer = document.getElementById("cho-year-slider-container");

    if (choSlider && choSliderDisplay && choSliderContainer) {
      let isDragging = false;

      choSlider.addEventListener("input", function () {
        const progress = parseInt(this.value);
        const pyramode = get_pyramid_mode();

        if (pyramode === "cho") {
          const selectElement = document.getElementById("cho_year");
          if (selectElement && selectElement.options.length > 0) {
            // 方向を逆転：0%が過去、100%が最新
            const targetIndex = Math.floor(
              ((100 - progress) / 100) *
                (selectElement.options.length - 1)
            );
            const clampedIndex = Math.max(
              0,
              Math.min(targetIndex, selectElement.options.length - 1)
            );
            const targetOption = selectElement.options[clampedIndex];

            // 機能的に必要：削除しないでください
            choSliderDisplay.textContent = targetOption.text;

            if (isDragging) {
              // ドラッグ中は表示のみ更新
              selectElement.value = targetOption.value;
            }
          }
        }
      });

      choSlider.addEventListener("mousedown", function () {
        isDragging = true;
      });

      choSlider.addEventListener("mouseup", function () {
        isDragging = false;
        // ドラッグ終了時に描画
        const selectElement = document.getElementById("cho_year");
        if (selectElement) {
          selectElement.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });

      choSlider.addEventListener("touchstart", function () {
        isDragging = true;
      });

      choSlider.addEventListener("touchend", function () {
        isDragging = false;
        // ドラッグ終了時に描画
        const selectElement = document.getElementById("cho_year");
        if (selectElement) {
          selectElement.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });
    }
  }

  // セレクトボックスからスライドバーへの連動（新規追加）
  setupSelectBoxToSlider() {
    console.log('UISynchronizer: セレクトボックス→スライドバー連動設定');
    
    // 市区ピラミッド用セレクトボックス
    const shikuSelect = document.getElementById("shiku_year");
    if (shikuSelect) {
      shikuSelect.addEventListener('change', () => {
        this.syncSelectBoxWithSlider('shiku');
      });
    }
    
    // 町丁別ピラミッド用セレクトボックス
    const choSelect = document.getElementById("cho_year");
    if (choSelect) {
      choSelect.addEventListener('change', () => {
        this.syncSelectBoxWithSlider('cho');
      });
    }
  }

  // セレクトボックスの値に基づいてスライドバーの位置を更新
  syncSelectBoxWithSlider(pyramode) {
    const selectElement = document.getElementById(pyramode + "_year");
    const sliderElement = document.getElementById(pyramode + "-year-slider");
    
    if (!selectElement || !sliderElement) {
      console.warn(`UISynchronizer: 要素が見つかりません (${pyramode})`);
      return;
    }
    
    const selectedIndex = selectElement.selectedIndex;
    const totalOptions = selectElement.options.length;
    
    if (totalOptions <= 1) {
      console.warn(`UISynchronizer: オプションが不足しています (${pyramode})`);
      return;
    }
    
    // 既存の実装と同じ方向変換（0%が過去、100%が最新）
    const sliderPosition = Math.round(((totalOptions - 1 - selectedIndex) / (totalOptions - 1)) * 100);
    
    sliderElement.value = sliderPosition;
    
    console.log(`UISynchronizer: ${pyramode} セレクトボックス(${selectedIndex}/${totalOptions-1}) → スライドバー(${sliderPosition}%)`);
  }

  // 外部から呼び出し可能な同期メソッド
  syncSliderWithSelectBox(pyramode) {
    this.syncSelectBoxWithSlider(pyramode);
  }
}

// グローバルインスタンスを作成
let uiSynchronizer = null;

// 初期化関数（外部から呼び出し可能）
function initializeUISynchronizer() {
  if (!uiSynchronizer) {
    uiSynchronizer = new UISynchronizer();
    console.log('UISynchronizer: グローバルインスタンス作成完了');
  }
  return uiSynchronizer;
}

// 既存の関数との互換性のため
function syncSelectBoxWithSlider(pyramode) {
  if (uiSynchronizer) {
    uiSynchronizer.syncSelectBoxWithSlider(pyramode);
  }
}
