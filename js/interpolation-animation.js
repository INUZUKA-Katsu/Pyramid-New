// 補間アニメーション管理クラス
class InterpolationAnimationManager {
  constructor() {
    this.isAnimating = false;
    this.animationDuration = 1000; // 補間アニメーション時間（ms）
    this.interpolationSteps = 10; // 補間ステップ数を減らす（20→10）
    this.currentStep = 0;
    this.animationInterval = null;
    this.startData = null;
    this.endData = null;
    this.currentData = null;
    this.minChangeThreshold = 5; // 最小変化閾値（5人未満の変化は表示しない
  }

  // 2つの年次データ間の補間アニメーションを開始
  async startInterpolationAnimation(startYear, endYear, startData, endData) {
    if (this.isAnimating) {
      this.stopAnimation();
    }

    this.startData = startData;
    this.endData = endData;
    this.currentStep = 0;
    this.isAnimating = true;

    console.log(`補間アニメーション開始: ${startYear} → ${endYear}`);

    // 補間データを生成
    const interpolatedData = this.generateInterpolatedData(startData, endData);
    
    // アニメーション実行
    this.executeInterpolationAnimation(interpolatedData);
  }

  // 補間データを生成
  generateInterpolatedData(startData, endData) {
    const interpolatedData = [];
    for (let step = 0; step <= this.interpolationSteps; step++) {
      const progress = step / this.interpolationSteps;
      const data = this.interpolateData(startData, endData, progress);
      interpolatedData.push(data);
    }
    return interpolatedData;
  }

  // データの補間計算
  interpolateData(startData, endData, progress) {
    // データ構造を確認して安全に処理
    if (!startData || !endData) {
      console.warn('補間データが不正です:', { startData, endData });
      return endData || startData;
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
      const ageNum = age === "総数" ? "総数" : parseInt(age);
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
      const ageNum = age === "総数" ? "総数" : parseInt(age);
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
  executeInterpolationAnimation(interpolatedData) {
    const stepDuration = this.animationDuration / this.interpolationSteps;
    let currentStep = 0;

    const animate = () => {
      if (!this.isAnimating || currentStep >= interpolatedData.length) {
        this.completeAnimation();
        return;
      }

      // イージングを適用した進行度
      const rawProgress = currentStep / (interpolatedData.length - 1);
      const easedProgress = this.easeInOutCubic(rawProgress);
      
      // データを描画
      this.renderInterpolatedData(interpolatedData[currentStep], easedProgress);
      
      currentStep++;
      this.animationInterval = setTimeout(animate, stepDuration);
    };

    animate();
  }

  // 補間データを描画
  renderInterpolatedData(data, progress) {
    try {
      // 現在のデータを保存
      this.currentData = data;
      
      // 補間されたデータをchange_pyramidに渡す（アニメーション中フラグをtrue、補間フラグをtrueに設定）
      if (typeof change_pyramid === 'function') {
        let animeMode = {
          isInterpolation: true,
          isVariableAreaMode: window.streamingAnimation.useVariableAreaMode
        };
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
  completeAnimation() {
    this.isAnimating = false;
    this.animationInterval = null;
    console.log('補間アニメーション完了');
    
    // アニメーション完了後に人数ラベルを表示
    this.showPopulationLabels();
  }

  // 人数ラベルを表示
  showPopulationLabels() {
    // 現在のデータをchange_pyramidで描画（アニメーション中フラグをtrueのままにして人数ラベルを非表示）
    if (this.currentData && typeof change_pyramid === 'function') {
      change_pyramid(this.currentData, {});
    } else if (this.endData && typeof change_pyramid === 'function') {
      // フォールバック: 現在のデータがない場合は終了データを使用
      change_pyramid(this.endData, {});
    }
  }

  // アニメーション停止
  stopAnimation() {
    this.isAnimating = false;
    if (this.animationInterval) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }
    
    // アニメーション停止時に人数ラベルを表示
    this.showPopulationLabels();
  }

  // アニメーション時間を設定
  setAnimationDuration(duration) {
    this.animationDuration = duration;
  }

  // 補間ステップ数を設定
  setInterpolationSteps(steps) {
    this.interpolationSteps = steps;
  }
}

// グローバルインスタンス
window.interpolationAnimation = new InterpolationAnimationManager();
