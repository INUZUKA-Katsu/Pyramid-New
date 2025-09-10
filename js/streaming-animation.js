// ストリーミングアニメーション管理クラス
class StreamingAnimationManager {
  constructor() {
    this.batchSize = 20; // 1バッチあたりの年数
    this.currentBatch = 0;
    this.totalBatches = 0;
    this.allYears = [];
    this.dataCache = {}; // ハッシュ形式に変更 {year: data}
    this.isAnimating = false;
    this.isLoading = false;
    this.animationSpeed = 200; // 各年次間の間隔（ms）
    this.barAnimationDuration = 800; // 棒の変化アニメーション時間（ms）
    this.currentYearIndex = 0;
    this.animationInterval = null;
    this.useInterpolation = false; // 補間アニメーションを使用するか
    this.interpolationDuration = 1000; // 補間アニメーション時間（ms）
    this.initialShowNumbers = null; // アニメーション開始前の人数表示状態
    this.useZoomScaleMode = false; // zoomScaleモードを使用するか
    this.baseZoomScale = null; // 基準スケール
    this.maxTotalPopulation = null; // 最大総人口
  }

  // 全年次データを事前取得
  async preloadAllData(shiku) {
    console.log('全年次データの事前取得開始');
    
    // 年次リストを取得
    this.allYears = this.extractYearsFromOptions();
    console.log('事前取得対象年次:', this.allYears);
    
    // 全データを一括取得
    try {
      const rawAllData = await this.fetchBatchData(shiku, this.allYears);
      console.log('全年次データ取得完了:', Object.keys(rawAllData).length, '年分');
      
      // データ変換処理（loadNextBatchと同じ処理）
      const processedData = {};
      const successYears = [];
      const failedYears = [];
      
      this.allYears.forEach((year) => {
        const batchItem = rawAllData[year];
        console.log(`🔍 事前取得 年次 ${year} 処理開始: batchItem =`, batchItem ? '存在' : 'undefined');
        
        if (batchItem && batchItem.success) {
          // データ形式を統一（配列形式の場合はオブジェクトに変換）
          const rawData = batchItem.data;
          console.log(`🔍 事前取得 年次 ${year} rawData:`, rawData);
          const convertedData = this.getObjectPiramidData(rawData);
          console.log(`🔍 事前取得 年次 ${year} convertedData:`, convertedData);
          
          // 変換結果を検証
          if (!convertedData) {
            console.error(`❌ 事前取得 年次 ${year} データ変換失敗: convertedData is null`);
            failedYears.push(year);
            return;
          }
          
          if (!convertedData.kakusai_betsu || !Array.isArray(convertedData.kakusai_betsu)) {
            console.error(`❌ 事前取得 年次 ${year} 変換後のデータ形式が不正:`, convertedData);
            failedYears.push(year);
            return;
          }
          
          processedData[year] = convertedData;
          successYears.push(year);
          console.log(`✅ 事前取得 年次 ${year} データ変換完了`);
        } else {
          console.error(`❌ 事前取得 年次 ${year} データ取得失敗:`, batchItem);
          failedYears.push(year);
        }
      });
      
      // データキャッシュに保存
      this.dataCache = processedData;
      
      console.log(`事前取得完了: 成功=${successYears.length}年, 失敗=${failedYears.length}年`);
      if (failedYears.length > 0) {
        console.warn('事前取得で失敗した年次:', failedYears);
      }
      
      return processedData;
    } catch (error) {
      console.error('全年次データ取得エラー:', error);
      
      // エラー時も表示を非表示にする
      if (typeof hideDataLoadingMessage === 'function') {
        hideDataLoadingMessage();
      }
      
      throw error;
    }
  }

  // 全年次データから最大総人口を算出
  calculateMaxTotalPopulation(allData) {
    console.log('最大総人口の算出開始');
    console.log('🔍 calculateMaxTotalPopulation: allData keys:', Object.keys(allData));
    
    let maxTotalPopulation = 0;
    let maxYear = null;
    
    Object.entries(allData).forEach(([year, yearData]) => {
      console.log(`🔍 年次 ${year} 処理開始: yearData =`, yearData);
      
      // データ構造の詳細チェック
      console.log(`🔍 年次 ${year} データ構造詳細チェック:`);
      console.log(`  - yearData存在: ${!!yearData}`);
      console.log(`  - yearData型: ${typeof yearData}`);
      console.log(`  - yearData.kakusai_betsu存在: ${!!yearData?.kakusai_betsu}`);
      console.log(`  - yearData.kakusai_betsu型: ${typeof yearData?.kakusai_betsu}`);
      console.log(`  - yearData.kakusai_betsu配列: ${Array.isArray(yearData?.kakusai_betsu)}`);
      console.log(`  - yearData.kakusai_betsu長さ: ${yearData?.kakusai_betsu?.length}`);
      
      if (yearData && yearData.kakusai_betsu && Array.isArray(yearData.kakusai_betsu)) {
        console.log(`🔍 年次 ${year} kakusai_betsu[0]:`, yearData.kakusai_betsu[0]);
        console.log(`🔍 年次 ${year} kakusai_betsu[0][1] (総人口文字列):`, yearData.kakusai_betsu[0][1]);
        
        // 総人口を取得（最初の要素の2番目が総人口）
        const totalPopulationString = yearData.kakusai_betsu[0][1];
        const totalPopulation = parseInt(totalPopulationString.replace(/,/g, ''));
        
        console.log(`🔍 年次 ${year} 総人口変換: "${totalPopulationString}" → ${totalPopulation} (isNaN: ${isNaN(totalPopulation)})`);
        
        if (!isNaN(totalPopulation) && totalPopulation > maxTotalPopulation) {
          maxTotalPopulation = totalPopulation;
          maxYear = year;
        }
        
        console.log(`年次 ${year}: 総人口 ${totalPopulation.toLocaleString()}`);
      } else {
        console.log(`❌ 年次 ${year} データ形式が不正: yearData存在=${!!yearData}, kakusai_betsu存在=${!!yearData?.kakusai_betsu}`);
      }
    });
    
    console.warn(`最大総人口計算終了: ${maxTotalPopulation.toLocaleString()} (年次: ${maxYear})`);
    return maxTotalPopulation;
  }

  // 当年の総人口に基づいてスケールを計算
  calculateCurrentYearScale(currentYearTotalPopulation) {
    // 基準スケールが設定されていない場合はエラー
    if (!this.baseZoomScale) {
      console.error('基準スケールが設定されていません');
      return 1;
    }
    
    // 最大総人口が設定されていない場合はエラー
    if (!this.maxTotalPopulation) {
      console.error('最大総人口が設定されていません');
      return 1;
    }
    
    // 当年スケール = 基準スケール * (描画する年次の総人口 / 最大総人口)^(1/2)
    const populationRatio = currentYearTotalPopulation / this.maxTotalPopulation;
    const currentYearScale = this.baseZoomScale * Math.pow(populationRatio, 0.5);
    
    console.warn(`当年スケール計算終了: 基準スケール=${this.baseZoomScale.toFixed(3)}, 最大総人口=${this.maxTotalPopulation.toLocaleString()}, 現在年総人口=${currentYearTotalPopulation.toLocaleString()}, 人口比率=${populationRatio.toFixed(3)}, 当年スケール=${currentYearScale.toFixed(3)}`);
    return currentYearScale;
  }

  // メインのストリーミングアニメーション関数
  async startStreamingAnimation() {
    console.log('ストリーミングアニメーション開始');
    
    // アニメーション開始前の人数表示状態を保存
    const showElement = document.getElementById("show");
    this.initialShowNumbers = showElement ? showElement.checked : false;
    
    const pyramode = get_pyramid_mode();
    const shiku = get_selected_shiku();
    
    console.log('StreamingAnimationManager: pyramode =', pyramode);
    console.log('StreamingAnimationManager: shiku =', shiku);
    console.log('StreamingAnimationManager: mode要素の値 =', document.getElementById('mode').value);

    // 年次リストを取得
    this.allYears = this.extractYearsFromOptions();
    this.totalBatches = Math.ceil(this.allYears.length / this.batchSize);
    this.currentBatch = 0;
    this.currentYearIndex = 0;
    
    console.log(`総年数: ${this.allYears.length}, バッチ数: ${this.totalBatches}`);
    console.log('allYears:', this.allYears);
    
    if (this.allYears.length === 0) {
      console.error('年次リストが空です。アニメーションを開始できません。');
      alert('年次データが見つかりません。ページを再読み込みしてください。');
      return;
    }
    
    // 新しいzoomScaleモードの場合は、全年次データを事前取得して最大総人口を算出
    if (this.useZoomScaleMode) {
      console.log('新しいzoomScaleモード: 全年次データを事前取得');
      
      // データ取得中の表示
      if (typeof showDataLoadingMessage === 'function') {
        showDataLoadingMessage();
      }
      
      // アニメーション開始時に基準スケールを取得・保持
      if (window.pyramidRenderer && window.pyramidRenderer.options.zoomScale) {
        this.baseZoomScale = window.pyramidRenderer.options.zoomScale;
        console.log(`基準スケールを取得・保持: ${this.baseZoomScale}`);
      } else {
        console.error('PyramidSVGRendererのzoomScaleが取得できません');
        this.baseZoomScale = 1; // デフォルト値
      }
      
      // 全年次データを事前取得
      const allData = await this.preloadAllData(shiku);
      console.log('取得した全年次データ:', allData);
      console.log('全年次データのキー:', Object.keys(allData));
      console.warn('全年次データ取得完了!');

      // 最大総人口を算出
      this.maxTotalPopulation = this.calculateMaxTotalPopulation(allData);
      console.log('算出された最大総人口:', this.maxTotalPopulation);
      
      console.log('zoomScaleモード: 全年次データ取得完了、アニメーション開始');
      
      // データ取得完了の表示を非表示
      if (typeof hideDataLoadingMessage === 'function') {
        hideDataLoadingMessage();
      }
      
      // アニメーション開始
      this.startAnimation();

    } else {
      console.log('通常モード: バッチ処理でデータ取得');
      
      // 最初のバッチを読み込み
      await this.loadNextBatch(shiku);
      
      // アニメーション開始
      this.startAnimation();
    }
  }

  // 年次リストを抽出
  extractYearsFromOptions() {
    const pyramode = get_pyramid_mode();
    console.log('extractYearsFromOptions: pyramode =', pyramode);
    let options;
    
    if (pyramode === "shiku" || pyramode === "shiku_json") {
      options = document.getElementsByName("shiku_year")[0].getElementsByTagName("option");
      console.log('shiku_year options found:', options.length);
    } else if (pyramode === "cho" || pyramode === "cho_json") {
      options = document.getElementsByName("cho_year")[0].getElementsByTagName("option");
      console.log('cho_year options found:', options.length);
    } else if (pyramode === "age") {
      // ageモードの場合は、shiku_yearのオプションを使用
      options = document.getElementsByName("shiku_year")[0].getElementsByTagName("option");
      console.log('age mode: shiku_year options found:', options.length);
    } else {
      console.log('Unknown pyramode:', pyramode, 'returning empty array');
      return [];
    }
    
    const years = [];
    Array.from(options).forEach(option => {
      const value = option.value;
      console.log('Processing option value:', value);
      // 年次データの形式をチェック（6桁の数字、4桁+ft、6桁+01、newなど）
      if (value.match(/^\d{6}$/) || value.match(/^\d{4}ft$/) || value.match(/^\d{6}01$/) || value.match(/^\d{6}09$/) || value === "new") {
        years.push(value);
      }
    });
    
    console.log('Extracted years:', years);
    
    // ft付き（将来推計）とftなし（通常データ）に分ける
    const futureYears = years.filter(year => year.match(/ft$/));
    const normalYears = years.filter(year => year !== "new" && !year.match(/ft$/));
    const hasNew = years.includes("new");
    
    console.log('Future years (ft):', futureYears);
    console.log('Normal years:', normalYears);
    console.log('Has new:', hasNew);
    
    // それぞれをsort
    const sortedFutureYears = futureYears.sort(); // 古い年から新しい年へ
    const sortedNormalYears = normalYears.sort(); // 古い年から新しい年へ
    
    // "new"がある場合は、ftなしの最新位置（最後）に追加
    if (hasNew) {
      sortedNormalYears.push("new");
    }
    
    // ftなし（古い順、newは最後） + ft付き（古い順）で合体
    const finalYears = [...sortedNormalYears, ...sortedFutureYears];
    
    console.log('Final sorted years:', finalYears);
    return finalYears;
  }

  // 次のバッチを読み込み
  async loadNextBatch(shiku) {
    console.log(`loadNextBatch 呼び出し: isLoading=${this.isLoading}, currentBatch=${this.currentBatch}, totalBatches=${this.totalBatches}`);
    
    if (this.isLoading) {
      console.log('既に読み込み中のため、バッチ読み込みをスキップ');
      return;
    }
    
    this.isLoading = true;
    const startIndex = this.currentBatch * this.batchSize;
    const endIndex = Math.min(startIndex + this.batchSize, this.allYears.length);
    const batchYears = this.allYears.slice(startIndex, endIndex);
    
    console.log(`バッチ ${this.currentBatch + 1}/${this.totalBatches} 読み込み開始: ${batchYears[0]} - ${batchYears[batchYears.length - 1]} (${batchYears.length}年分)`);
    console.log('📤 リクエスト年次一覧:', batchYears);
    
    try {
      // バックエンドからバッチデータを取得
      console.log('fetchBatchData開始: shiku =', shiku, 'batchYears =', batchYears);
      const batchData = await this.fetchBatchData(shiku, batchYears);
      console.log(`バッチデータ取得完了: ${Object.keys(batchData).length}件`);
      console.log('📥 バッチデータ構造:', Object.keys(batchData).map(year => `${year}: ${batchData[year]?.success ? '成功' : '失敗'}`));
      console.log('📥 バッチデータ詳細:', batchData);
      console.log('📥 リクエスト年次一覧:', batchYears);
      
      // キャッシュに保存（詳細ログ付き）
      const successYears = [];
      const failedYears = [];
      
      batchYears.forEach((year) => {
        // ハッシュ形式で直接アクセス
        const batchItem = batchData[year];
        console.log(`🔍 年次 ${year} 処理開始: batchItem =`, batchItem ? '存在' : 'undefined');
        console.log(`🔍 年次 ${year} batchItem詳細:`, batchItem);
        console.log(`🔍 年次 ${year} batchData[${year}]:`, batchData[year]);
        
        if (batchItem && batchItem.success) {
          // データ形式を統一（配列形式の場合はオブジェクトに変換）
          const rawData = batchItem.data;
          const processedData = this.getObjectPiramidData(rawData);
          
          // 変換結果を検証
          if (!processedData) {
            console.error(`❌ 年次 ${year} データ変換失敗: processedData is null`);
            failedYears.push(year);
            return;
          }
          
          if (!processedData.kakusai_betsu || !Array.isArray(processedData.kakusai_betsu)) {
            console.error(`❌ 年次 ${year} 変換後のデータ形式が不正:`, processedData);
            failedYears.push(year);
            return;
          }
          
          // 年次とデータの対応関係を詳細にログ出力
          console.log(`📊 年次データ対応関係チェック:`);
          console.log(`   - リクエスト年次: ${year}`);
          console.log(`   - データ内kijunbi: ${processedData.kijunbi}`);
          console.log(`   - データ内shiku: ${processedData.shiku}`);
          
          // 年次の整合性をチェック
          const yearFromKijunbi = this.extractYearFromKijunbi(processedData.kijunbi);
          if (yearFromKijunbi && yearFromKijunbi !== year) {
            console.warn(`⚠️ 年次不整合検出: リクエスト=${year}, データ内=${yearFromKijunbi}`);
          }
          
          this.dataCache[year] = processedData;
          successYears.push(year);
          console.log(`✅ 年次 ${year} データキャッシュ完了 (形式: ${Array.isArray(rawData) ? '配列→オブジェクト' : 'オブジェクト'})`);
          console.log(`   - キャッシュキー: ${year}`);
          console.log(`   - キャッシュサイズ: ${Object.keys(this.dataCache).length}`);
          console.log(`   - キャッシュに保存されたか確認: ${year in this.dataCache}`);
          console.log(`   - キャッシュから取得テスト:`, this.dataCache[year] ? '成功' : '失敗');
          console.log(`   - キャッシュデータ（初めの部分）:`, {
            shiku: processedData.shiku,
            kijunbi: processedData.kijunbi,
            source_url: processedData.source_url,
            kakusai_betsu_length: processedData.kakusai_betsu?.length,
            kakusai_betsu_first: processedData.kakusai_betsu?.[0]?.slice(0, 3) // 最初の3要素のみ
          });
        } else {
          failedYears.push(year);
          console.warn(`❌ 年次 ${year} データ取得失敗:`, batchItem?.error || '不明なエラー');
        }
      });
      
      console.log(`バッチ ${this.currentBatch + 1} 完了: 成功 ${successYears.length}件, 失敗 ${failedYears.length}件`);
      console.log(`📊 バッチ完了後のキャッシュ状態:`);
      console.log(`   - キャッシュサイズ: ${Object.keys(this.dataCache).length}`);
      console.log(`   - キャッシュキー一覧:`, Object.keys(this.dataCache));
      if (failedYears.length > 0) {
        console.warn(`失敗年次:`, failedYears);
      }
      
      this.currentBatch++;
      
      // 次のバッチが必要かチェック
      console.log(`バッチ読み込み完了後: currentBatch=${this.currentBatch}, totalBatches=${this.totalBatches}`);
      if (this.shouldLoadNextBatch()) {
        console.log('次のバッチの読み込みが必要です');
      } else {
        console.log('次のバッチの読み込みは不要です');
      }
      
    } catch (error) {
      console.error('バッチ読み込みエラー:', error);
    } finally {
      this.isLoading = false;
      console.log('バッチ読み込み処理完了: isLoading=false');
    }
  }

  // バッチデータを取得（リトライ機能付き）
  async fetchBatchData(shiku, years, maxRetries = 3) {
    console.log('fetchBatchData開始: shiku =', shiku, 'years =', years);
    console.log('fetchBatchData: get_pyramid_mode() =', get_pyramid_mode());
    console.log('fetchBatchData: document.getElementById("mode").value =', document.getElementById('mode').value);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`バッチデータ取得試行 ${attempt}/${maxRetries}`);
        
        // URLSearchParams形式でリクエスト（既存のAPIと同じ形式）
        const params = new URLSearchParams();
        params.append('shiku', shiku);
        params.append('years', JSON.stringify(years));
        
        // 現在のモードに応じてlevelを設定
        const pyramode = get_pyramid_mode();
        const level = (pyramode === 'cho') ? 'cho_json' : 'shiku_json';
        params.append('level', level);
        
        console.log('fetchBatchData: pyramode =', pyramode);
        console.log('fetchBatchData: level =', level);
        
        // 町丁別モードの場合は選択された町丁の情報を追加
        if (pyramode === 'cho') {
          const selectedCho = get_selected_cho();
          if (selectedCho && selectedCho.length > 0) {
            params.append('cho', JSON.stringify(selectedCho));
            console.log(`町丁別モード: 選択された町丁=${JSON.stringify(selectedCho)}`);
          }
        }
        
        console.log(`📤 サーバーリクエスト詳細:`);
        console.log(`  - shiku: ${shiku}`);
        console.log(`  - years: ${JSON.stringify(years)}`);
        console.log(`  - level: ${level}`);
        if (pyramode === 'cho') {
          console.log(`  - cho: ${params.get('cho')}`);
        }
        
        const response = await fetch('/api/batch-years', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log(`レスポンス本文: ${text.substring(0, 100)}...`);
        
        // "h"エラーのチェック
        if (text === 'h' || text.trim() === 'h') {
          throw new Error('サーバーから"h"レスポンスを受信');
        }
        
        const result = JSON.parse(text);
        console.log(`バッチデータ取得成功 (試行 ${attempt})`);
        console.log(`📥 サーバーレスポンス詳細:`);
        console.log(`  - results型: ${typeof result.results}`);
        console.log(`  - results内容:`, result.results);
        console.log(`  - リクエスト年次数: ${years.length}`);
        
        // ハッシュ形式のresultsをそのまま返す
        return result.results || {};
        
      } catch (error) {
        console.warn(`バッチデータ取得エラー (試行 ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          console.error('最大リトライ回数に達しました。個別取得にフォールバックします。');
          // フォールバック: 個別にデータを取得
          return await this.fetchIndividualData(shiku, years);
        }
        
        // リトライ前の待機時間（指数バックオフ）
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`${delay}ms待機後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // 個別データ取得（フォールバック・リトライ機能付き）
  async fetchIndividualData(shiku, years, maxRetries = 2) {
    const results = [];
    
    for (const year of years) {
      let success = false;
      let data = null;
      let error = null;
      
      for (let attempt = 1; attempt <= maxRetries && !success; attempt++) {
        try {
          console.log(`年次 ${year} データ取得試行 ${attempt}/${maxRetries}`);
          const rawData = await this.fetchSingleYearData(shiku, year);
          // データ形式を統一（配列形式の場合はオブジェクトに変換）
          const parsedData = JSON.parse(rawData);
          data = this.getObjectPiramidData(parsedData);
          success = true;
          console.log(`年次 ${year} データ取得成功 (試行 ${attempt}, 形式: ${Array.isArray(parsedData) ? '配列→オブジェクト' : 'オブジェクト'})`);
        } catch (err) {
          error = err;
          console.warn(`年次 ${year} データ取得エラー (試行 ${attempt}/${maxRetries}):`, err.message);
          
          if (attempt < maxRetries) {
            // リトライ前の待機時間
            const delay = 500 * attempt;
            console.log(`${delay}ms待機後にリトライします...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      results.push({
        year: year,
        data: data,
        success: success,
        error: success ? null : error?.message
      });
    }
    
    return results;
  }

  // 単一年次データを取得
  async fetchSingleYearData(shiku, year) {
    return new Promise((resolve, reject) => {
      // 既存のajax関数を使用
      const originalAjax = window.ajax;
      
      // 一時的にajax関数をオーバーライド
      window.ajax = function(mode, nengetsu, i, unit_size) {
        if (nengetsu === year) {
          // 成功時のコールバック
          const originalOnReadyStateChange = arguments.callee;
          return function() {
            if (this.readyState === 4 && this.status === 200) {
              const response = this.responseText;
              window.ajax = originalAjax; // 元の関数を復元
              
              // "h"エラーのチェック
              if (response === 'h' || response.trim() === 'h') {
                reject(new Error('サーバーから"h"レスポンスを受信'));
                return;
              }
              
              resolve(response);
            }
          };
        }
      };
      
      // 既存のchange_display関数を呼び出し
      change_display("shiku_not_refresh_cholist", year, get_UnitSize());
      
      // タイムアウト設定
      setTimeout(() => {
        window.ajax = originalAjax;
        reject(new Error('Timeout'));
      }, 5000);
    });
  }

  // 配列で受け取ったデータをオブジェクトに変換する（pyramid.jsから移植）
  getObjectPiramidData(pyramidData) {
    console.log("getObjectPiramidData開始", typeof pyramidData, Array.isArray(pyramidData) ? `配列(${pyramidData.length}要素)` : "オブジェクト");
    console.warn(`🔍 getObjectPiramidData呼び出し: 型=${typeof pyramidData}, 配列=${Array.isArray(pyramidData)}, 要素数=${Array.isArray(pyramidData) ? pyramidData.length : 'N/A'}`);
    
    // 文字列の場合はJSONパース
    if (typeof pyramidData === 'string') {
      console.log("getObjectPiramidData rout0 (JSON文字列形式)");
      try {
        const parsed = JSON.parse(pyramidData);
        console.log("JSONパース成功:", parsed);
        return parsed;
      } catch (e) {
        console.error("JSONパースエラー:", e);
        return null;
      }
    }
    
    let shiku, kijunbi, source_url, kakusai_betsu;
    if (Array.isArray(pyramidData)) {
      console.log("getObjectPiramidData rout1 (配列形式)");
      console.log("配列の内容:", pyramidData.slice(0, 5)); // 最初の5要素をログ出力
      console.log("配列の全要素数:", pyramidData.length);
      
      // 各要素の型を確認
      pyramidData.forEach((item, index) => {
        console.log(`要素[${index}]:`, typeof item, Array.isArray(item) ? `配列(${item.length}要素)` : item);
        if (Array.isArray(item) && index < 3) {
          console.log(`  配列[${index}]の内容:`, item.slice(0, 3));
        }
      });
      
      shiku = pyramidData[1];
      kijunbi = pyramidData[2];
      source_url = pyramidData[3];
      kakusai_betsu = pyramidData.filter(Array.isArray);
      
      console.log("filter前の配列要素数:", pyramidData.length);
      console.log("filter後のkakusai_betsu要素数:", kakusai_betsu.length);
      console.log("kakusai_betsuの最初の要素:", kakusai_betsu[0]);
      
      // 重要な情報をalertで表示
      if (kakusai_betsu.length > 0) {
        console.warn(`🔍 データ変換結果:\n` +
              `配列要素数: ${pyramidData.length} → ${kakusai_betsu.length}\n` +
              `kakusai_betsu[0]: ${JSON.stringify(kakusai_betsu[0])}\n` +
              `最初の要素の型: ${typeof kakusai_betsu[0][0]}, 値: ${kakusai_betsu[0][0]}`);
      } else {
        console.warn(`❌ エラー: kakusai_betsuが空です！\n配列要素数: ${pyramidData.length}`);
      }
      
      const result = {
        shiku: shiku,
        kijunbi: kijunbi,
        source_url: source_url,
        kakusai_betsu: kakusai_betsu,
      };
      console.log("変換結果:", result);
      return result;
    } else {
      console.log("getObjectPiramidData rout2 (オブジェクト形式)");
      return pyramidData;
    }
  }

  // kijunbiから年次を抽出する
  extractYearFromKijunbi(kijunbi) {
    if (!kijunbi) return null;
    
    // 令和2年10月1日 -> 202010
    // 平成28年1月1日 -> 201601
    // 昭和45年10月1日 -> 197010
    const match = kijunbi.match(/(令和|平成|昭和)(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const era = match[1];
      const year = parseInt(match[2]);
      const month = parseInt(match[3]);
      
      let westernYear;
      switch (era) {
        case '令和':
          westernYear = 2018 + year; // 令和元年 = 2019年
          break;
        case '平成':
          westernYear = 1988 + year; // 平成元年 = 1989年
          break;
        case '昭和':
          westernYear = 1925 + year; // 昭和元年 = 1926年
          break;
        default:
          return null;
      }
      
      return `${westernYear}${month.toString().padStart(2, '0')}`;
    }
    
    return null;
  }

  // アニメーション実行（非同期対応）
  async startAnimation() {
    this.isAnimating = true;
    console.log(`🎬 アニメーション開始: 総年数=${this.allYears.length}, 現在年次インデックス=${this.currentYearIndex}`);
    console.log(`🎬 固定unitSize使用: ${this.useFixedUnitSize}, unitSize: ${this.fixedUnitSize}`);
    console.log(`🎬 補間アニメーション使用: ${this.useInterpolation}`);
    console.warn(`🎬 startAnimation呼び出し: 総年数=${this.allYears.length}, 現在年次インデックス=${this.currentYearIndex}, 補間アニメーション=${this.useInterpolation}`);
    
    const animate = async () => {
      if (!this.isAnimating) {
        console.log('アニメーション停止フラグが設定されています');
        return;
      }
      
      const currentYear = this.allYears[this.currentYearIndex];
      console.log(`🎬 アニメーションループ: 年次=${currentYear}, インデックス=${this.currentYearIndex}/${this.allYears.length}, キャッシュサイズ=${Object.keys(this.dataCache).length}`);
      
      // デバッグ: キャッシュの内容を確認
      console.log('🔍 キャッシュ内容確認:');
      console.log('  - キャッシュキー一覧:', Object.keys(this.dataCache));
      console.log('  - 現在の年次:', currentYear);
      console.log('  - キャッシュに存在するか:', currentYear in this.dataCache);
      
      // データがキャッシュにあるかチェック
      if (currentYear in this.dataCache) {
        console.log(`✅ 年次 ${currentYear} データがキャッシュに存在`);
        const cachedData = this.dataCache[currentYear];
        console.log(`   - 取得したキャッシュデータ（初めの部分）:`, {
          shiku: cachedData.shiku,
          kijunbi: cachedData.kijunbi,
          source_url: cachedData.source_url,
          kakusai_betsu_length: cachedData.kakusai_betsu?.length,
          kakusai_betsu_first: cachedData.kakusai_betsu?.[0]?.slice(0, 3) // 最初の3要素のみ
        });
        // 補間アニメーション付きで描画
        await this.renderYear(currentYear, cachedData);
        this.currentYearIndex++;
        
        // プログレススライダーを更新
        const progress = Math.floor((this.currentYearIndex / this.allYears.length) * 100);
        this.updateProgressSlider(progress);
        
        // 次のバッチが必要かチェック
        if (this.shouldLoadNextBatch()) {
          console.log('アニメーションループ: 次のバッチの読み込みを開始');
          this.loadNextBatch(get_selected_shiku());
        } else {
          console.log('アニメーションループ: 次のバッチの読み込みは不要');
        }
        
        // アニメーション継続
        if (this.currentYearIndex < this.allYears.length) {
          console.log(`⏭️ 次の年次へ: ${this.animationSpeed}ms後に継続`);
          this.animationInterval = setTimeout(animate, this.animationSpeed);
        } else {
          // アニメーション完了
          console.log('🎉 アニメーション完了');
          this.completeAnimation();
        }
        
      } else {
        // データがまだ読み込まれていない場合は待機
        console.log(`⏳ 年次 ${currentYear} データ待機中... (${this.currentYearIndex + 1}/${this.allYears.length})`);
        this.animationInterval = setTimeout(animate, 100);
      }
    };
    
    animate();
  }

  // 次のバッチ読み込みが必要かチェック
  shouldLoadNextBatch() {
    // キャッシュ内の残り年数を計算
    const yearsRemainingInCache = Object.keys(this.dataCache).length - this.currentYearIndex;
    const bufferThreshold = this.batchSize * 0.8; // 80%のバッファに変更（より早く読み込み）
    
    const shouldLoad = yearsRemainingInCache <= bufferThreshold && 
                      this.currentBatch < this.totalBatches && 
                      !this.isLoading;
    
    console.log(`shouldLoadNextBatch チェック: キャッシュ内残り年数=${yearsRemainingInCache}, バッファ閾値=${bufferThreshold}, 現在バッチ=${this.currentBatch}, 総バッチ数=${this.totalBatches}, 読み込み中=${this.isLoading}, 結果=${shouldLoad}`);
    
    return shouldLoad;
  }

  // 年次データを描画（補間アニメーション対応）
  async renderYear(year, data) {
    try {
      console.log(`🎨 renderYear開始: 年次=${year}, データ存在=${data ? 'あり' : 'なし'}`);
      console.log(`🎨 useInterpolation=${this.useInterpolation}, currentYearIndex=${this.currentYearIndex}`);
      if (data) {
        console.log(`🎨 描画データ詳細:`, {
          shiku: data.shiku,
          kijunbi: data.kijunbi,
          kakusai_betsu_length: data.kakusai_betsu?.length
        });
      }
      
      // 年次表示を更新（描画前に表示）
      this.updateYearDisplay(year);
      
      // 新しいzoomScaleモードを使用する場合の処理（分岐前に実行）
      if (this.useZoomScaleMode && window.pyramidRenderer && data && data.kakusai_betsu) {
        // 当年の総人口を取得
        const currentYearTotalPopulation = parseInt(data.kakusai_betsu[0][1].replace(/,/g, ''));
        
        // 当年スケールを計算
        const currentYearScale = this.calculateCurrentYearScale(currentYearTotalPopulation);
        
        // options.zoomScaleに当年スケールをセット
        window.pyramidRenderer.options.zoomScale = currentYearScale;
        console.warn(`🎨 当年スケールセット完了: ${currentYearScale.toFixed(3)} (総人口: ${currentYearTotalPopulation.toLocaleString()})`);
      }
      
      //補間アニメーションか通常描画かによって分岐する
      //alert(`🎬 useInterpolation=${this.useInterpolation}, currentYearIndex=${this.currentYearIndex}`);
      if (this.useInterpolation && this.currentYearIndex > 0) {
        // 前の年次データを取得
        const previousYear = this.allYears[this.currentYearIndex - 1];
        const previousData = this.dataCache[previousYear];
        
        if (previousData) {
          // 補間アニメーションを実行
          console.warn(`各歳別データの年齢:${data["kakusai_betsu"][0][0]}`);
          await this.renderWithInterpolation(previousYear, year, previousData, data);
        } else {
          // 補間データがない場合は通常描画
          this.renderDirectly(year, data);
        }
      } else {
        // 最初の年次または補間無効の場合は通常描画
        this.renderDirectly(year, data);
      }
      
    } catch (error) {
      console.error(`年次 ${year} の描画エラー:`, error);
      // エラー時も年次表示を更新
      this.updateYearDisplay(year, true);
    }
  }

  // 直接描画
  renderDirectly(year, data) {
    console.log(`🎬 年次 ${year} 直接描画開始`);
    console.warn(`🎬 renderDirectly呼び出し: 年次=${year}, データ存在=${data ? 'あり' : 'なし'}, データ型=${typeof data}`);
    try {
      // データ構造を確認
      console.log(`🎬 描画データ構造確認:`, {
        shiku: data?.shiku,
        kijunbi: data?.kijunbi,
        kakusai_betsu_exists: !!data?.kakusai_betsu,
        kakusai_betsu_type: typeof data?.kakusai_betsu,
        kakusai_betsu_length: data?.kakusai_betsu?.length
      });
      
      // スケール計算はrenderYearで実行済み
      
      // データが正しい形式かチェック
      console.log(`🔍 年次 ${year} renderDirectly データ構造チェック:`);
      console.log(`  - data存在: ${!!data}`);
      console.log(`  - data.kakusai_betsu存在: ${!!data?.kakusai_betsu}`);
      console.log(`  - data.kakusai_betsu配列: ${Array.isArray(data?.kakusai_betsu)}`);
      console.log(`  - data.kakusai_betsu長さ: ${data?.kakusai_betsu?.length}`);
      
      if (!data || !data.kakusai_betsu || !Array.isArray(data.kakusai_betsu)) {
        console.error(`❌ 年次 ${year} データ形式が不正:`, data);
        
        // 応急措置: 配列形式の場合はオブジェクト形式に変換してリカバリー
        if (Array.isArray(data)) {
          console.log(`🔄 年次 ${year} 配列形式を検出、オブジェクト形式に変換してリカバリー`);
          const convertedData = this.getObjectPiramidData(data);
          if (convertedData && convertedData.kakusai_betsu && Array.isArray(convertedData.kakusai_betsu)) {
            console.log(`✅ 年次 ${year} リカバリー成功、変換済みデータで描画`);
            change_pyramid(convertedData, true, false);
            return;
          }
        }
        return;
      }
      
      // デバッグ: change_pyramidに渡すデータの内容を確認
      console.log(`🔍 change_pyramidに渡すデータ確認: 年次=${year}`);
      console.log('  - data.shiku:', data.shiku);
      console.log('  - data.kijunbi:', data.kijunbi);
      console.log('  - data.source_url:', data.source_url);
      console.log('  - data.kakusai_betsu存在:', !!data.kakusai_betsu);
      console.log('  - data.kakusai_betsu長さ:', data.kakusai_betsu?.length);
      console.log('  - data全体:', data);
      
      // アニメーション中フラグをtrue、補間フラグをfalseに設定してchange_pyramidを呼び出し
      console.warn(`🎬 直接描画(change_pyramid呼び出し): 年次=${year}`);
      change_pyramid(data, true, false);
      console.log(`✅ 年次 ${year} 直接描画完了`);
      
      // デバッグ: 直接描画の総数を確認
      const directTotal = data.kakusai_betsu?.[0]?.[1];
      console.warn(`🔍 直接描画総数確認: 年次=${year}, 総数=${directTotal}`);
    } catch (error) {
      console.error(`❌ 年次 ${year} 直接描画エラー:`, error);
      
      // 応急措置: エラー時に配列形式の場合はオブジェクト形式に変換してリカバリー
      if (Array.isArray(data)) {
        console.log(`🔄 年次 ${year} エラー時に配列形式を検出、オブジェクト形式に変換してリカバリー`);
        try {
          const convertedData = this.getObjectPiramidData(data);
          if (convertedData && convertedData.kakusai_betsu && Array.isArray(convertedData.kakusai_betsu)) {
            console.log(`✅ 年次 ${year} エラー時リカバリー成功、変換済みデータで描画`);
            change_pyramid(convertedData, true, false);
            return;
          }
        } catch (recoveryError) {
          console.error(`❌ 年次 ${year} リカバリー処理も失敗:`, recoveryError);
        }
      }
    }
  }

  // 補間アニメーション付き描画
  async renderWithInterpolation(startYear, endYear, startData, endData) {
    console.log(`🎬 年次 ${startYear} → ${endYear} 補間アニメーション開始`);
    return new Promise((resolve) => {
      if (window.interpolationAnimation) {
        try {
          // キャッシュから取得したデータは既にオブジェクト形式なので、再変換は不要
          // 文字列の場合はJSONパースのみ
          const processedStartData = typeof startData === 'string' ? JSON.parse(startData) : startData;
          const processedEndData = typeof endData === 'string' ? JSON.parse(endData) : endData;
          
          // データ形式をチェック
          if (!processedStartData || !processedEndData) {
            console.error(`❌ 年次 ${startYear} → ${endYear} データ変換失敗`);
            this.renderDirectly(endYear, endData);
            resolve();
            return;
          }
          
          // デバッグ: 補間アニメーション用データの確認
          console.warn(`🎬 補間アニメーション データ確認:\n開始年次: ${startYear}\n終了年次: ${endYear}\n開始データkakusai_betsu[0]: ${JSON.stringify(processedStartData.kakusai_betsu?.[0])}\n終了データkakusai_betsu[0]: ${JSON.stringify(processedEndData.kakusai_betsu?.[0])}`);
          
          // 元データの総数を確認
          const startTotal = processedStartData.kakusai_betsu?.[0]?.[1];
          const endTotal = processedEndData.kakusai_betsu?.[0]?.[1];
          console.warn(`🔍 元データ総数確認:\n開始年次総数: ${startTotal}\n終了年次総数: ${endTotal}`);
          
          // 補間アニメーション停止時のコールバックを設定
          const originalStopAnimation = window.interpolationAnimation.stopAnimation.bind(window.interpolationAnimation);
          window.interpolationAnimation.stopAnimation = () => {
            originalStopAnimation();
            // 補間アニメーション停止時にセレクトボックスを現在の年次に同期
            const currentYear = this.getCurrentDisplayYear();
            this.syncSelectBoxToCurrentYear(currentYear);
          };
          
          // 補間アニメーションを実行
          console.warn(`補間アニメーションを実行: [${processedStartData["kakusai_betsu"][0][0]}, ${processedStartData["kakusai_betsu"][0][1]}, ${processedStartData["kakusai_betsu"][0][2]}, ${processedStartData["kakusai_betsu"][0][3]}] `);
          window.interpolationAnimation.startInterpolationAnimation(
            startYear, endYear, processedStartData, processedEndData
          );
          
          // 補間アニメーション完了を待機
          const checkComplete = () => {
            if (!window.interpolationAnimation.isAnimating) {
              console.log(`✅ 年次 ${startYear} → ${endYear} 補間アニメーション完了`);
              resolve();
            } else {
              setTimeout(checkComplete, 50);
            }
          };
          checkComplete();
        } catch (error) {
          console.error(`❌ 年次 ${startYear} → ${endYear} 補間アニメーションエラー:`, error);
          // エラー時は直接描画にフォールバック
          this.renderDirectly(endYear, endData);
          resolve();
        }
      } else {
        // 補間アニメーションが利用できない場合は直接描画
        console.log(`⚠️ 補間アニメーション利用不可、直接描画にフォールバック: ${endYear}`);
        this.renderDirectly(endYear, endData);
        resolve();
      }
    });
  }

  // 年次表示を更新
  updateYearDisplay(year, isError = false) {
    const yearDisplay = document.getElementById('current-year-display');
    if (yearDisplay) {
      const formattedYear = this.formatYear(year);
      const progress = `${this.currentYearIndex + 1} / ${this.allYears.length}`;
      
      if (isError) {
        yearDisplay.innerHTML = `<span style="color: #e74c3c;">⚠️ エラー: ${formattedYear}</span><br><small>${progress}</small>`;
      } else {
        yearDisplay.innerHTML = `📅 ${formattedYear}<br><small>${progress}</small>`;
      }
    }
  }

  // 年次をフォーマット
  formatYear(year) {
    const yyyy = year.substring(0, 4);
    const mm = year.substring(4, 6);
    return `${yyyy}年${mm}月`;
  }

  // アニメーション完了
  completeAnimation() {
    this.isAnimating = false;
    console.log('ストリーミングアニメーション完了');
    
    // 年次表示を完了状態に更新
    const yearDisplay = document.getElementById('current-year-display');
    if (yearDisplay) {
      const lastYear = this.allYears[this.allYears.length - 1];
      yearDisplay.innerHTML = `🎉 アニメーション完了！<br><small>最終年次: ${this.formatYear(lastYear)} (${this.allYears.length}年分)</small>`;
    }
    
    // コントロールは維持する（終了ボタンで手動切り替え）
    
    // プログレススライダーを100%に更新
    this.updateProgressSlider(100);
  }

  // 人数ラベルを表示
  showPopulationLabels() {
    // 現在の年次を取得
    const currentYear = this.getCurrentDisplayYear();
    
    // セレクトボックスの表示を現在の年次に同期（これによりchange_pyramidが呼び出される）
    this.syncSelectBoxToCurrentYear(currentYear);
    
    // アニメーション開始前の人数表示状態に戻す
    if (this.initialShowNumbers !== null) {
      const showCheckbox = document.getElementById("show");
      if (showCheckbox) {
        showCheckbox.checked = this.initialShowNumbers;
        showNinzu_Setting(); // 人数表示設定を適用
      }
    }
  }

  // 現在表示されている年次を取得
  getCurrentDisplayYear() {
    if (this.currentYearIndex > 0) {
      // アニメーション中または停止時は、最後に描画された年次
      return this.allYears[this.currentYearIndex - 1];
    } else {
      // アニメーション開始前は最初の年次
      return this.allYears[0];
    }
  }

  // セレクトボックスの表示を現在の年次に同期
  syncSelectBoxToCurrentYear(year) {
    try {
      const pyramode = get_pyramid_mode();
      console.log(`🔄 セレクトボックス同期: 年次=${year}, モード=${pyramode}`);
      
      // 年次が有効でない場合は同期をスキップ
      if (!year || year === undefined || year === null) {
        console.log(`⚠️ セレクトボックス同期をスキップ: 無効な年次 (${year})`);
        return;
      }
      
      // グローバル変数$nengetsuを更新
      if (typeof window.$nengetsu !== 'undefined') {
        window.$nengetsu = year;
      }
      
      // セレクトボックスの値を更新
      if (pyramode === "shiku" || pyramode === "age") {
        const shikuYearSelect = document.getElementById("shiku_year");
        if (shikuYearSelect) {
          // オプションが存在するかチェック
          if (this.optionExists(shikuYearSelect, year)) {
            shikuYearSelect.value = year;
            console.log(`✅ shiku_yearセレクトボックスを${year}に更新`);
            
            // セレクトボックスのchangeイベントを発火して再描画
            const changeEvent = new Event('change', { bubbles: true });
            shikuYearSelect.dispatchEvent(changeEvent);
            console.log(`🔄 shiku_yearセレクトボックスのchangeイベントを発火`);
          } else {
            console.log(`⚠️ shiku_yearセレクトボックス同期をスキップ: 年次${year}がオプションに存在しません`);
          }
        }
      } else if (pyramode === "cho") {
        const choYearSelect = document.getElementById("cho_year");
        if (choYearSelect) {
          // オプションが存在するかチェック
          if (this.optionExists(choYearSelect, year)) {
            choYearSelect.value = year;
            console.log(`✅ cho_yearセレクトボックスを${year}に更新`);
            
            // セレクトボックスのchangeイベントを発火して再描画
            const changeEvent = new Event('change', { bubbles: true });
            choYearSelect.dispatchEvent(changeEvent);
            console.log(`🔄 cho_yearセレクトボックスのchangeイベントを発火`);
          } else {
            console.log(`⚠️ cho_yearセレクトボックス同期をスキップ: 年次${year}がオプションに存在しません`);
          }
        }
      }
    } catch (error) {
      console.error('セレクトボックス同期エラー:', error);
    }
  }

  // オプションが存在するかチェックするヘルパー関数
  optionExists(selectElement, value) {
    if (!selectElement || !selectElement.options || selectElement.options.length === 0) {
      return false;
    }
    
    for (let i = 0; i < selectElement.options.length; i++) {
      if (selectElement.options[i].value === value) {
        return true;
      }
    }
    return false;
  }

  // アニメーション停止
  stopAnimation() {
    this.isAnimating = false;
    if (this.animationInterval) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }
    // 停止時にもセレクトボックスを現在の年次に同期
    const currentYear = this.getCurrentDisplayYear();
    this.syncSelectBoxToCurrentYear(currentYear);
    
    // 新しいzoomScaleモードの場合は、基準スケールを復元
    if (this.useZoomScaleMode && this.baseZoomScale && window.pyramidRenderer) {
      window.pyramidRenderer.options.zoomScale = this.baseZoomScale;
      window.pyramidRenderer.resizeByScale(this.baseZoomScale);
      console.log('アニメーション停止: 基準スケールを復元:', this.baseZoomScale);
    }
    
    // アニメーション停止時に人数ラベルを表示
    this.showPopulationLabels();
    
    // アニメーションコントロールを非表示
    if (typeof hideAnimationControls === 'function') {
      hideAnimationControls();
    }
  }

  // アニメーション一時停止
  pauseAnimation() {
    this.isAnimating = false;
    if (this.animationInterval) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }
  }

  // アニメーション再開
  resumeAnimation() {
    if (!this.isAnimating && this.currentYearIndex < this.allYears.length) {
      this.isAnimating = true;
      this.startAnimation();
    }
  }

  // 指定の進行度に移動
  seekToProgress(progress) {
    // より厳密な初期化チェック
    if (!this.isInitialized()) {
      console.warn('seekToProgress: アニメーションが初期化されていません');
      return;
    }
    
    try {
      const targetIndex = Math.floor((progress / 100) * (this.allYears.length - 1));
      const clampedIndex = Math.max(0, Math.min(targetIndex, this.allYears.length - 1));
      
      this.currentYearIndex = clampedIndex;
      const targetYear = this.allYears[clampedIndex];
      
      // 現在の年次表示を更新
      this.updateYearDisplay(targetYear);
      
      // 新しいzoomScaleモードを使用する場合の処理（描画前に実行）
      if (this.useZoomScaleMode && window.pyramidRenderer && this.dataCache && this.dataCache[targetYear] && this.dataCache[targetYear].kakusai_betsu) {
        // 当年の総人口を取得
        const currentYearTotalPopulation = parseInt(this.dataCache[targetYear].kakusai_betsu[0][1].replace(/,/g, ''));
        
        // 当年スケールを計算
        const currentYearScale = this.calculateCurrentYearScale(currentYearTotalPopulation);
        
        // options.zoomScaleに当年スケールをセット
        window.pyramidRenderer.options.zoomScale = currentYearScale;
        console.warn(`🎨 seekToProgress 当年スケールセット完了: ${currentYearScale.toFixed(3)} (総人口: ${currentYearTotalPopulation.toLocaleString()})`);
      }
      
      // ピラミッドを更新
      if (this.dataCache && this.dataCache[targetYear]) {
        change_pyramid(this.dataCache[targetYear], true, false);
      } else {
        console.warn(`年次 ${targetYear} のデータが見つかりません`);
      }
      
      // スライダーの値を更新
      this.updateProgressSlider(progress);
      
      // アニメーションを一時停止状態にする
      this.isAnimating = false;
      if (this.animationInterval) {
        clearTimeout(this.animationInterval);
        this.animationInterval = null;
      }
      
      console.log(`アニメーション進行度を ${progress}% に移動 (年次: ${targetYear}) - 一時停止状態`);
      console.log(`データキャッシュ確認: allYears.length=${this.allYears.length}, dataCache.keys=${Object.keys(this.dataCache || {}).length}`);
    } catch (error) {
      console.error('seekToProgress エラー:', error);
      // エラーを再スローしない（alert表示を防ぐ）
    }
  }

  // アニメーションが初期化されているかチェック
  isInitialized() {
    return this.allYears && 
           this.allYears.length > 0 && 
           this.dataCache && 
           Object.keys(this.dataCache).length > 0;
  }

  // プログレススライダーの値を更新
  updateProgressSlider(progress) {
    const progressSlider = document.getElementById('animation-progress');
    const progressDisplay = document.getElementById('progress-display');
    
    if (progressSlider) {
      progressSlider.value = progress;
    }
    if (progressDisplay) {
      progressDisplay.textContent = progress + '%';
    }
  }


  // アニメーション速度を設定
  setAnimationSpeed(speed) {
    this.animationSpeed = speed;
  }

  // 棒のアニメーション時間を設定
  setBarAnimationDuration(duration) {
    this.barAnimationDuration = duration;
  }
}

// グローバルインスタンス
console.log('streaming-animation.js: StreamingAnimationManager を初期化中...');
window.streamingAnimation = new StreamingAnimationManager();
console.log('streaming-animation.js: window.streamingAnimation が初期化されました:', window.streamingAnimation);
