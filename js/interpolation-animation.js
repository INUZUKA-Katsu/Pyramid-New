// 補間アニメーション管理クラス
class InterpolationAnimationManager {
  constructor() {
    this.init();
  }
  init() {
    this.isProcessingInterval = false; // 個別区間の処理状態
    this.currentIntervalStep = 0;      // 現在の区間内ステップ
    this.baseAnimationDuration = 1000; // 補間アニメーション時間（ms）
    this.baseInterpolationSteps = 10; // 補間ステップ数を減らす（20→10）
    this.currentStep = 0;
    this.startData = null;
    this.endData = null;
    this.currentData = null;
    this.minChangeThreshold = 5; // 最小変化閾値（5人未満の変化は表示しない
    this.yearDifference = 1; // 年数差(デフォルト1年)
    this.currentInterpolationSteps = 10; // 現在の補間ステップ数
    this.animationStartTime = 0; // アニメーション開始時間
    this.lastFrameTime = 0; // 前回のフレーム時間
    this.targetFrameRate = 60; // 目標フレームレート（FPS）
    this.frameInterval = 1000 / this.targetFrameRate; // フレーム間隔（ms）

    // 状態変数
    this.paused = false; // アニメーション一時停止フラグ
    this.stopped = false; // アニメーション終了フラグ
    this.animationFrameId = null; // requestAnimationFrame ID
    this.timerId = null; // setTimeout ID
  }

  // 2つの年次データ間の補間アニメーションを開始
  async startInterpolationAnimation(startYear, endYear, startData, endData, yearDifference) {
    console.log("startInterpolationAnimation開始:");
    console.dir(startData);
    this.startData = startData;
    this.endData = endData;
    this.yearDifference = yearDifference;
    this.currentStep = 0;
    this.stopped = false;

    this.currentInterpolationSteps = this.calculateDynamicSteps(yearDifference);

    // 町丁別ピラミッドは各歳の人口がわずかなので変化量の閾値を設定しない。
    if (startData.shiku != "横浜市" && startData.shiku.slice(-1)!="区") {
      this.minChangeThreshold = 1;
    }

    console.log(`補間アニメーション開始: ${startYear} → ${endYear} (${yearDifference}年差)`);

    // 年数差に応じた動的アニメーション時間を計算
    const dynamicDuration = this.calculateDynamicDuration(yearDifference);
    console.log(`補間アニメーション時間: ${dynamicDuration}ms`);

    // 補間データを生成
    const interpolatedData = this.generateInterpolatedData(startData, endData);
    
    // アニメーション実行
    this.executeInterpolationAnimation(interpolatedData, dynamicDuration);
  }

  // 年数差に応じた動的補間ステップ数を計算
  calculateDynamicSteps(yearDifference) {
    const dynamicSteps = this.baseInterpolationSteps * yearDifference;
    const clampedSteps = Math.max(10, Math.min(100, dynamicSteps));
    return clampedSteps;
  }

  // 年数差に応じた動的アニメーション時間を計算
  calculateDynamicDuration(yearDifference) {
    const dynamicDuration = this.baseAnimationDuration * yearDifference;
    const clampedDuration = Math.max(500, Math.min(5000, dynamicDuration));
    return clampedDuration;
  }

  // 補間データを生成
  generateInterpolatedData(startData, endData) {
    console.log("generateInterpolatedData開始:startData");
    console.dir(startData);
    console.log("generateInterpolatedData開始:endData");
    console.dir(endData);
    const interpolatedData = [];
    // 0番目は開始データ、最後は終了データなので、開始データを除き1番目から最後までのデータを生成
    for (let step = 1; step <= this.currentInterpolationSteps; step++) {
      const progress = step / this.currentInterpolationSteps;
      const data = this.interpolateData(startData, endData, progress);
      interpolatedData.push(data);
    }
    console.log("generateInterpolatedData終了:interpolatedData");
    console.dir(interpolatedData);
    return interpolatedData;
  }

  // データの補間計算
  interpolateData(startData, endData, progress) {

    // データ構造を確認して安全に処理
    if (!startData || !endData) {
      console.warn('補間データが不正です:', { startData, endData });
      return endData || startData;
    }

    if (progress == 1) {
      return endData;
    }

    // 年齢別データのマップを作成（PyramidSVGRendererと同じロジック）
    const startPopulationMap = new Map();
    const endPopulationMap = new Map();

    // 開始データから年齢別人口マップを作成
    const startKakusai = startData.kakusai_betsu || [];
    startKakusai.forEach((item) => {
      const age = item[0];
      const male = item[2];
      const female = item[3];
      
      //if (age.match(/総数|合計|年齢不詳/) || male == null || female == null) {
      //  return;
      //}
      const ageNum = (age === "総数" || age === "合計") ? "総数" : parseInt(age);
      const maleNum = parseInt(male.toString().replace(/,/g, '')) || 0;
      const femaleNum = parseInt(female.toString().replace(/,/g, '')) || 0;
      
      
      startPopulationMap.set(ageNum, { male: maleNum, female: femaleNum });
    });

    // 終了データから年齢別人口マップを作成
    const endKakusai = endData.kakusai_betsu || [];
    endKakusai.forEach((item) => {
      const age = item[0];
      const male = item[2];
      const female = item[3];
      
      //if (age.match(/総数|合計|年齢不詳/) || male == null || female == null) {
      //  return;
      //}
      const ageNum = (age === "総数" || age === "合計") ? "総数" : parseInt(age);
      const maleNum = parseInt(male.toString().replace(/,/g, '')) || 0;
      const femaleNum = parseInt(female.toString().replace(/,/g, '')) || 0;
      
      
      endPopulationMap.set(ageNum, { male: maleNum, female: femaleNum });
    });

    // 補間結果のオブジェクトを作成
    const interpolated = {
      shiku: startData.shiku || endData.shiku || "鶴見区",
      kijunbi: startData.kijunbi || endData.kijunbi || "",
      source_url: startData.source_url || endData.source_url || "",
      kakusai_betsu: []
    };

    // 総数データの補間計算
    const startTotal = startPopulationMap.get("総数") || { male: 0, female: 0 };
    const endTotal = endPopulationMap.get("総数") || { male: 0, female: 0 };
    
    
    const interpolatedTotalMale = this.applyMinChangeThreshold(startTotal.male, endTotal.male, progress);
    const interpolatedTotalFemale = this.applyMinChangeThreshold(startTotal.female, endTotal.female, progress);
    const interpolatedTotal = interpolatedTotalMale + interpolatedTotalFemale;
    
    // 総数データを配列の最初に追加
    interpolated.kakusai_betsu.push([
      "総数",
      interpolatedTotal.toString(),
      interpolatedTotalMale.toString(),
      interpolatedTotalFemale.toString()
    ]);

    // 0歳から100歳まで年齢順に補間処理
    for (let age = 0; age <= 100; age++) {
      const startPopulation = startPopulationMap.get(age) || { male: 0, female: 0 };
      const endPopulation = endPopulationMap.get(age) || { male: 0, female: 0 };
      
      // 数値データの補間（最小変化閾値を適用）
      const interpolatedMale = this.applyMinChangeThreshold(startPopulation.male, endPopulation.male, progress);
      const interpolatedFemale = this.applyMinChangeThreshold(startPopulation.female, endPopulation.female, progress);
      const interpolatedTotal = interpolatedMale + interpolatedFemale;
      
      interpolated.kakusai_betsu.push([
        age.toString(),
        interpolatedTotal.toString(),
        interpolatedMale.toString(),
        interpolatedFemale.toString()
      ]);
    }
    return interpolated;
  }

  // 線形補間関数
  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  // 最小変化閾値を適用した補間
  applyMinChangeThreshold(start, end, progress) {
    const interpolated = this.lerp(start, end, progress);
    const change = Math.abs(end - start);
    
    // 変化が閾値未満の場合は、開始値または終了値を返す
    if (change < this.minChangeThreshold) {
      return progress < 0.5 ? start : end;
    }
    
    return Math.round(interpolated);
  }

  // イージング関数（スムーズな動き）
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  // 補間アニメーション実行（requestAnimationFrame版）
  executeInterpolationAnimation(interpolatedData, animationDuration = this.baseAnimationDuration) {
    console.warn(`補間アニメーション実行（requestAnimationFrame版）`);
    console.warn(`frameInterval:${this.frameInterval}`);
    // アニメーション状態を初期化
    this.currentIntervalStep = 1;
    this.isProcessingInterval = true;
    this.animationStartTime = performance.now();
    this.lastFrameTime = this.animationStartTime;
    this.setFrameRate();
    
    const stepDuration = animationDuration / this.currentInterpolationSteps;
    console.log(`ステップ間隔: ${stepDuration}ms`);

    const animate = async(currentTime) => {

      // 🔸 一時停止中はここで待機（ループを抜けずに止まる）
      while (this.paused && !this.stopped) {
        await this. sleep(100);
      }
      if (this.stopped) return;

      // アニメーションが停止されている場合は終了
      if (!this.isProcessingInterval) {
        console.warn(`アニメーション終了または区間処理終了`);
        this.cleanupAnimation();
        return;
      }

      // フレームレート制御
      const deltaTime = currentTime - this.lastFrameTime;
      if (deltaTime < this.frameInterval) {
        this.animationFrameId = requestAnimationFrame(animate);
        return;
      }
      this.lastFrameTime = currentTime;

      // 現在のステップが範囲外の場合は終了
      if (this.currentIntervalStep > interpolatedData.length) {
        console.warn(`区間処理終了: 全ステップ完了`);
        this.cleanupAnimation();
        return;
      }

      // イージングを適用した進行度
      const rawProgress = this.currentIntervalStep / interpolatedData.length;
      const easedProgress = this.easeInOutCubic(rawProgress);
      
      // データを描画（配列番号は0から始まるので、-1する）
      console.warn(`currentIntervalStep:${this.currentIntervalStep}、rawProgress:${rawProgress}`);
      this.renderInterpolatedData(interpolatedData[this.currentIntervalStep-1], easedProgress, rawProgress);
      
      this.currentIntervalStep++;
      
      // 🔸 一時停止中はここで待機（ループを抜けずに止まる）
      while (this.paused && !this.stopped) {
        await this. sleep(100);
      }
      if (this.stopped) return;

      // 次のフレームをスケジュール
      this.animationFrameId = requestAnimationFrame(animate);
    };

    // アニメーション開始
    this.animationFrameId = requestAnimationFrame(animate);
  }

  // アニメーションクリーンアップ
  cleanupAnimation() {
    this.currentIntervalStep = 1;
    this.isProcessingInterval = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // 補間データを描画
  renderInterpolatedData(data, progress, rawProgress) {
    console.warn(`renderInterpolatedData開始`);
    console.dir(data);
    try {
      // 現在のデータを保存
      this.currentData = data;

      // 補間されたデータをchange_pyramidに渡す（アニメーション中フラグをtrue、補間フラグをtrueに設定）
      if (typeof change_pyramid === 'function') {
        let interpolated_flg;
        if (rawProgress == 1) {
          interpolated_flg = false;
        } else {
          interpolated_flg = true;
        }
        let animeMode = {
          isInterpolation: interpolated_flg, // falseの場合はタイトルやソースが更新される。
          isVariableAreaMode: window.streamingAnimation.useVariableAreaMode
        };
        console.warn(`isInterpolation:${animeMode.isInterpolation}`);
        change_pyramid(data, animeMode);
      } else {
        console.error('change_pyramid関数が見つかりません');
      }
      
      // 進行度を表示
      this.updateProgressDisplay(progress);
      
    } catch (error) {
      console.error('補間データ描画エラー:', error);
    }
  }

  // 進行度表示を更新
  updateProgressDisplay(progress) {
    const progressDisplay = document.getElementById('interpolation-progress');
    if (progressDisplay) {
      progressDisplay.style.display = 'block';
      progressDisplay.textContent = `補間進行度: ${(progress * 100).toFixed(1)}%`;
    }
  }

  // 指定時間待機
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // アニメーション一時停止
  pauseAnimation() {
    console.warn(`補間アニメーション一時停止`);
    this.paused = true;
    console.log("isProcessingInterval:", window.interpolationAnimation.isProcessingInterval);
  }

  // アニメーション再開
  resumeAnimation() {
    console.warn(`補間アニメーション再開`);
    this.paused = false;
  }

  // アニメーション終了
  stopAnimation() {
    console.warn(`補間アニメーション終了`);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    clearTimeout(this.timerId);
    this.paused = false;
    this.stopped = true;

  }

  // アニメーション時間を設定
  setAnimationDuration(duration) {
    this.animationDuration = duration;
  }

  // 補間ステップ数を設定
  setInterpolationSteps(steps) {
    this.interpolationSteps = steps;
  }

  //　年数差を設定
  setYearDifference(yearDifference) {
    this.yearDifference = yearDifference;
  }

  // フレームレートを設定
  setFrameRate() {
    //animationSpeedは 500ms~50ms => frameIntervalは 150ms~15ms.
    this.frameInterval = window.streamingAnimation.animationSpeed  *  3 / 10  ;
    this.targetFrameRate = 1000 / this.frameInterval;
  }
}

// グローバルインスタンス
window.interpolationAnimation = new InterpolationAnimationManager();
