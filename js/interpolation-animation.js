// 補間アニメーション管理クラス
class InterpolationAnimationManager {
  constructor() {
    this.isAnimating = false;
    this.isProcessingInterval = false; // 個別区間の処理状態
    this.currentIntervalStep = 0;      // 現在の区間内ステップ
    this.baseAnimationDuration = 1000; // 補間アニメーション時間（ms）
    this.baseInterpolationSteps = 10; // 補間ステップ数を減らす（20→10）
    this.currentStep = 0;
    this.animationInterval = null;
    this.startData = null;
    this.endData = null;
    this.currentData = null;
    this.minChangeThreshold = 5; // 最小変化閾値（5人未満の変化は表示しない
    this.yearDifference = 1; // 年数差(デフォルト1年)
    this.currentInterpolationSteps = 10; // 現在の補間ステップ数
  }

  // 2つの年次データ間の補間アニメーションを開始
  async startInterpolationAnimation(startYear, endYear, startData, endData, yearDifference) {
    //if (this.isAnimating) {
    //  this.stopAnimation();
    //}

    this.startData = startData;
    this.endData = endData;
    this.yearDifference = yearDifference;
    this.currentStep = 0;
    this.isAnimating = true;

    this.currentInterpolationSteps = this.calculateDynamicSteps(yearDifference);

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

  // 補間アニメーション実行
  executeInterpolationAnimation(interpolatedData, animationDuration = this.baseAnimationDuration) {
    console.warn(`補間アニメーション実行`);
    const stepDuration = animationDuration / this.currentInterpolationSteps;
    if (this.currentIntervalStep == 0) {
      this.currentIntervalStep = 1; 
    }
    this.isProcessingInterval = true;

    const animate = () => {

      console.warn(`currentIntervalStep:${this.currentIntervalStep} / interpolatedData.length:${interpolatedData.length}`);

      if (!this.isProcessingInterval || this.currentIntervalStep > interpolatedData.length) {
        console.warn(`区間処理終了`);
        this.currentIntervalStep = 1;       // 初期化
        this.isProcessingInterval = false;  // 区間処理終了
        return;
      }

      // イージングを適用した進行度
      const rawProgress = this.currentIntervalStep / interpolatedData.length;  // 1番目が1/10, 最後が1になる
      const easedProgress = this.easeInOutCubic(rawProgress);
      
      // データを描画 (配列番号は0から始まるので、-1する.)
      console.warn(`currentIntervalStep:${this.currentIntervalStep}、rawProgress:${rawProgress}`);
      this.renderInterpolatedData(interpolatedData[this.currentIntervalStep-1], easedProgress, rawProgress);
      
      this.currentIntervalStep++;
      this.animationInterval = setTimeout(animate, stepDuration);
    };
    if (this.isAnimating) {  // 補間アニメーション中に一時停止ボタンが押された場合はここでストップ
      animate();
    } else {
      console.warn(`補間アニメーション一時停止: step2`);
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

  // アニメーション完了
  //completeAnimation() {
  //  alert('補間アニメーション完了');
  //  this.isAnimating = false;
  //  this.animationInterval = null;
  //  console.log('補間アニメーション完了');
  //  
  //  // アニメーション完了後に人数ラベルを表示
  //  this.showPopulationLabels();
  //}

  // 人数ラベルを表示
  //showPopulationLabels() {
  //  // 現在のデータをchange_pyramidで描画（アニメーション中フラグをtrueのままにして人数ラベルを非表示）
  //  if (this.currentData && typeof change_pyramid === 'function') {
  //    change_pyramid(this.currentData, {});
  //  } else if (this.endData && typeof change_pyramid === 'function') {
  //    // フォールバック: 現在のデータがない場合は終了データを使用
  //    change_pyramid(this.endData, {});
  //  }
  //}

  // アニメーション停止
  stopAnimation() {
    console.warn(`補間アニメーション一時停止: step1`);
    this.isAnimating = false;
    if (this.animationInterval) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }
    
    // アニメーション停止時に人数ラベルを表示
    //this.showPopulationLabels();
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
}

// グローバルインスタンス
window.interpolationAnimation = new InterpolationAnimationManager();
