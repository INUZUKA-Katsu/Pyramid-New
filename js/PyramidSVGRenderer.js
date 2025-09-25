// 横浜市の人口ピラミッド SVG描画エンジン ver1.3 2024.12.30
// 既存のpyramid.jsとの互換性を保ちながら、SVGによる柔軟な描画を実現

class PyramidSVGRenderer {
  constructor(containerId, hashData, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = {
      width: 1108,
      height: 600,
      unitSize: null,
      barHeight: null, // 各年齢の棒の高さ
      maleColor: '#4a90e2',
      femaleColor: '#e24a90',
      maleStrokeColor: '#3a7bc8',
      femaleStrokeColor: '#c23a7a',
      maleSpecialStrokeColor: '#2a6bb4',
      femaleSpecialStrokeColor: '#a22a6a',
      backgroundColor: '#f8f9fa',
      gridColor: '#e9ecef',
      textColor: '#495057',
      fontSize: 12,
      showGrid: true,
      showLabels: true,
      showNumbers: true,
      zoomScale: 1,
      unitSizeScale: 1,
      barHeightScale: 1,
      scaleMode: 'auto', // 'auto', 'fixed'
      maxWidth: 400, // 最大バー幅（ピクセル）
      ...options //引数で渡された値でデフォルト値を上書き
    };
    this.svg = null;
    
    // データタイプを判定（5歳階級別か各歳別か）
    this.isFiveYearAgeGroup = hashData.five_year_age_group !== undefined;
    this.data = this.isFiveYearAgeGroup ? hashData.five_year_age_group : hashData.kakusai_betsu;
    
    this.isAnimation = false; // アニメーション状態を初期化
    this.isVariableAreaMode = false; // 固定面積モードが初期値
    this.currentYearScale = 1 //可変面積モード時の当年スケールを保存する変数
    this.isFirstAnimationFrame = false; // アニメーションの最初のフレームかどうか   
    this.maxBarLengthForAnimation = null; // 固定面積モード用の最大BarLengthを保存する変数
    
    // 人数表示位置の重なり回避用の変数を追加
    this.previousLabelPositions = {
      male: { x: null, width: 0 },
      female: { x: null, width: 0 }
    };
    
    //console.log('this.data', this.data);
    this.options.unitSize = this.calculateUnitSize(this.data);
    this.options.barHeight = this.options.height * 0.95 / 105; // 目盛ラベル用のスペースを確保

    //console.log('init this.options.unitSize', this.options.unitSize);

    this.init();
    this.render();
  }

  init() {
    //console.warn('init開始');
    //console.warn('this.options.width', this.options.width);
    //console.warn('this.options.height', this.options.height);
    //console.warn('this.options.unitSize', this.options.unitSize);
    //console.warn('this.options.barHeight', this.options.barHeight);
    //console.warn('this.options.zoomScale', this.options.zoomScale);

    // 既存のコンテナをクリア
    const svg = document.getElementById('pyramid-svg');
    if (svg) {
      this.container.removeChild(svg);
    }
    
    // SVG要素を作成
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('id', 'pyramid-svg');
    //this.svg.setAttribute('style', 'width:100%; max-width:1108px; height:auto;');
    this.svg.setAttribute('style', 'grid-column: 1/2; grid-row: 1/2; width:100%; height:100%; z-index: 1;');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    //preserveAspectRatio="xMidYMid meet"

    //console.log('this.options.width', this.options.width);
    //console.log('this.options.height', this.options.height);
    
    //this.svg.setAttribute('width', this.options.width);
    //this.svg.setAttribute('height', this.options.height);
    // viewBoxは動的に設定
    this.svg.setAttribute('viewBox', `0 0 ${this.options.width} ${this.options.height}`);
    this.svg.style.backgroundColor = this.options.backgroundColor;
    
    // 全要素をグループ化するためのg要素を作成
    this.sceneGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.sceneGroup.setAttribute('id', 'pyramid-scene');
    this.sceneGroup.setAttribute('transform', 'translate(0,0) scale(1)');
    this.svg.appendChild(this.sceneGroup);

    
    // 静的要素用のグループを作成
    this.staticGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.staticGroup.setAttribute('id', 'pyramid-static');
    this.sceneGroup.appendChild(this.staticGroup);

    // 動的要素用のグループを作成
    this.dynamicGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.dynamicGroup.setAttribute('id', 'pyramid-dynamic');
    this.sceneGroup.appendChild(this.dynamicGroup);

    // 静的要素を描画（一度だけ）
    this.drawStaticElements();
    
    this.container.appendChild(this.svg);

    // ズームを適用
    if (this.isAnimation && this.isVariableAreaMode){
      console.warn('currentYearScale', this.currentYearScale);
      this.resizeByScale(this.currentYearScale);
    } else if (this.options.zoomScale != 1) {
      this.resizeByScale(this.options.zoomScale);
    }
  }

  // 静的要素を描画（アニメーション時と非アニメーション時で動作を分ける）
  drawStaticElements() {
    // 背景を描画（常に実行）
    this.drawBackground();
    
    // ここから後は以下の場合に実行する.
    // 1.非アニメーション
    // 2.面積固定モードのアニメーションの最初のフレーム
    // 3.可変面積モードのアニメーション
    //if ( !this.isAnimation ) {
    //  console.warn('非アニメーション: 固定要素を再描画');
    //} else if ( !this.isVariableAreaMode && this.isFirstAnimationFrame) {
    //  console.warn('面積固定モードのアニメーションの最初のフレーム: 固定要素を再描画（最大人口に基づく）');
    //} else if (this.isVariableAreaMode) {
    //  console.warn('可変面積モード: 固定要素を再描画（zoomScale=' + this.options.zoomScale + '）');
    //}
    
    // 既存の静的要素をクリア（背景以外）
    this.clearStaticElements();

    //console.warn('これから静的要素を再描画スタート');

    // グリッドを描画
    if (this.options.showGrid) {
      this.drawGrid();
    }
    
    // 年齢ラベルを描画
    if (this.options.showLabels) {
      this.drawAgeLabels();
    }
    
    // 特別な年齢の横線とラベルを描画
    this.drawSpecialAgeLines();
    
    // X軸と目盛を描画
    this.drawXAxis();
    
    // 男女ラベルを描画
    this.drawGenderLabels();
  }

  drawBackground() {
    // 背景の矩形（動的座標）
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', 0);
    bg.setAttribute('y', 0);
    bg.setAttribute('width', this.options.width);
    bg.setAttribute('height', this.options.height);
    bg.setAttribute('fill', this.options.backgroundColor);
    this.staticGroup.appendChild(bg);
  }

  drawGrid() {
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'grid');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 男女の各棒の起点に縦線を引く
    const leftStartLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftStartLine.setAttribute('x1', viewBoxWidth / 2 - 10);
    leftStartLine.setAttribute('y1', viewBoxHeight);
    leftStartLine.setAttribute('x2', viewBoxWidth / 2 - 10);
    leftStartLine.setAttribute('y2', viewBoxHeight - (101 * this.options.barHeight));
    leftStartLine.setAttribute('stroke', '#dee2e6');
    leftStartLine.setAttribute('stroke-width', '1');
    gridGroup.appendChild(leftStartLine);
    
    const rightStartLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightStartLine.setAttribute('x1', viewBoxWidth / 2 + 10);
    rightStartLine.setAttribute('y1', viewBoxHeight);
    rightStartLine.setAttribute('x2', viewBoxWidth / 2 + 10);
    rightStartLine.setAttribute('y2', viewBoxHeight - (101 * this.options.barHeight));
    rightStartLine.setAttribute('stroke', '#dee2e6');
    rightStartLine.setAttribute('stroke-width', '1');
    gridGroup.appendChild(rightStartLine);

    // 横線（各歳の境界線）
    // 面積固定モードアニメーションでは全年次で最大長の棒の長さを基準に１回だけ描画する
    let x1;
    let x2;
    if ( !this.isVariableAreaMode && this.maxBarLengthForAnimation){
      x1 = (viewBoxWidth / 2) - (this.maxBarLengthForAnimation + 100);
      x2 = (viewBoxWidth / 2) + (this.maxBarLengthForAnimation + 100);
    } else {
      x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
      x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    }
    
    // デバッグ用ログ
    //console.warn('drawGrid デバッグ:', {
    //  isAnimation: this.isAnimation,
    //  maxPopulationForAnimation: this.maxPopulationForAnimation,
    //  currentMaxPopulation: this.getMaxPopulation(this.data),
    //  unitSize: this.options.unitSize,
    //  viewBoxWidth: viewBoxWidth,
    //  x1: x1,
    //  x2: x2,
    //  centerX: viewBoxWidth / 2
    //});

    for (let age = 0; age <= 101; age++) {
      
      //console.log('viewBoxHeight', viewBoxHeight);
      //console.log('age', age);
      //console.log('this.options.barHeight', this.options.barHeight);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', viewBoxHeight - (age * this.options.barHeight));
      line.setAttribute('x2', x2);
      line.setAttribute('y2', viewBoxHeight - (age * this.options.barHeight));
      // 5歳ごとに線の色を少しく濃くする
      if (age % 5 === 0) {
        line.setAttribute('stroke', '#e9ecef');
        line.setAttribute('stroke-width', '1');
      } else {
        line.setAttribute('stroke', '#f8f9fa');
        line.setAttribute('stroke-width', '1');
      }
      
      gridGroup.appendChild(line);
    }
    
    this.staticGroup.appendChild(gridGroup);
  }

  drawAgeLabels() {
    const ageLabelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ageLabelGroup.setAttribute('class', 'age-labels');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 5歳ごとに年齢ラベルを表示（0歳から100歳まで）
    for (let age = 0; age <= 100; age += 5) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = age;
      label.setAttribute('x', viewBoxWidth / 2);
      label.setAttribute('y', viewBoxHeight - (age * this.options.barHeight) - this.options.barHeight / 2);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('font-size', '10');
      label.setAttribute('fill', '#6c757d');
      label.setAttribute('font-weight', 'bold');
      
      ageLabelGroup.appendChild(label);
    }
    
    this.staticGroup.appendChild(ageLabelGroup);
  }

  drawSpecialAgeLines(maxBarLength) {
    const specialLineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    specialLineGroup.setAttribute('class', 'special-age-lines');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 15歳、65歳、75歳の特別な横線とラベル
    const specialAges = [15, 65, 75];
    const ageLabels = ['15歳', '65歳', '75歳'];

    // 面積固定モードアニメーションでは全年次で最大長の棒の長さを基準に１回だけ描画する
    let x1;
    let x2;
    if ( !this.isVariableAreaMode && this.maxBarLengthForAnimation){
      x1 = (viewBoxWidth / 2) - (this.maxBarLengthForAnimation + 100);
      x2 = (viewBoxWidth / 2) + (this.maxBarLengthForAnimation + 100);
    } else {
      x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
      x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    }
    if (x1 < 5 ){ x1 = 10;}
    if (x2 > viewBoxWidth - 5){ x2 = viewBoxWidth - 10;} 

    specialAges.forEach((age, index) => {
      const y = viewBoxHeight - (age * this.options.barHeight);
    
      // 最大の棒より100px長い横線
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#adb5bd');
      line.setAttribute('stroke-width', '1');
      
      // 年齢ラベル
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = ageLabels[index];
      label.setAttribute('x', x1 + 40);
      label.setAttribute('y', y - 5);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'bottom');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#6c757d');
      label.setAttribute('font-weight', 'bold');
      
      specialLineGroup.appendChild(line);
      specialLineGroup.appendChild(label);
    });
    
    this.staticGroup.appendChild(specialLineGroup);
  }

  drawXAxis(maxBarLength) {
    const xAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisGroup.setAttribute('class', 'x-axis');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // X軸の位置（0歳のラインの下）
    const xAxisY = viewBoxHeight;
    
    // X軸の範囲（15歳、65歳、75歳のラインと同じ長さ）
    // 面積固定モードアニメーションでは全年次で最大長の棒の長さを基準に１回だけ描画する
    let x1;
    let x2;
    if ( !this.isVariableAreaMode && this.maxBarLengthForAnimation){
      x1 = (viewBoxWidth / 2) - (this.maxBarLengthForAnimation + 100);
      x2 = (viewBoxWidth / 2) + (this.maxBarLengthForAnimation + 100);
    } else {
      x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
      x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    }
    if (x1 < 5 ){ x1 = 10;}
    if (x2 > viewBoxWidth - 5){ x2 = viewBoxWidth - 10;} 

    // X軸を描画（15歳、65歳、75歳のラインと同じ太さ・長さ）
    const xAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxisLine.setAttribute('x1', x1);
    xAxisLine.setAttribute('y1', xAxisY);
    xAxisLine.setAttribute('x2', x2);
    xAxisLine.setAttribute('y2', xAxisY);
    xAxisLine.setAttribute('stroke', '#adb5bd');
    xAxisLine.setAttribute('stroke-width', '1');
    xAxisGroup.appendChild(xAxisLine);
    
    // 目盛と目盛ラベルを描画
    this.drawTicksAndLabels(xAxisGroup, x1, x2, xAxisY, viewBoxWidth);
    
    this.staticGroup.appendChild(xAxisGroup);
  }

  drawTicksAndLabels(xAxisGroup, x1, x2, xAxisY, viewBoxWidth) {
    // 最大人口を取得
    const maxPopulation = this.getMaxPopulation(this.data);

    // chooseTickSize関数で目盛サイズを決定
    const tickInfo = this.chooseTickSize(maxPopulation);
    
    // 目盛の間隔（ピクセル）
    const tickPixelInterval = tickInfo.tick * this.options.unitSize;
    
    // 中央線の位置
    const centerX = viewBoxWidth / 2;
    
    // 目盛の起点（中央線から10px離す）
    const femaleStartX = centerX + 10; // 女性側の起点
    const maleStartX = centerX - 10;   // 男性側の起点
    
    // 目盛を描画（男性側と女性側の両方）
    tickInfo.ticks.forEach((tickValue, index) => {
      // 女性側の目盛位置を計算（起点から右側）
      const femaleTickX = femaleStartX + (index * tickPixelInterval);
      
      // 男性側の目盛位置を計算（起点から左側）
      const maleTickX = maleStartX - (index * tickPixelInterval);
      
      // 女性側の目盛を描画
      if (femaleTickX >= femaleStartX && femaleTickX <= x2) {
        // 目盛線を描画（X軸から上向きの短い線）
        const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tickLine.setAttribute('x1', femaleTickX);
        tickLine.setAttribute('y1', xAxisY);
        tickLine.setAttribute('x2', femaleTickX);
        tickLine.setAttribute('y2', xAxisY - 5); // 5px上向き
        tickLine.setAttribute('stroke', '#adb5bd');
        tickLine.setAttribute('stroke-width', '1');
        xAxisGroup.appendChild(tickLine);
        
        // 目盛ラベルを描画（X軸の下に表示）
        if (tickInfo.labels.includes(tickValue)) {
          const tickLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          tickLabel.textContent = tickValue.toLocaleString();
          tickLabel.setAttribute('x', femaleTickX);
          tickLabel.setAttribute('y', xAxisY + 15); // X軸の下15px
          tickLabel.setAttribute('text-anchor', 'middle');
          tickLabel.setAttribute('dominant-baseline', 'top');
          tickLabel.setAttribute('font-size', '10');
          tickLabel.setAttribute('fill', '#6c757d');
          xAxisGroup.appendChild(tickLabel);
        }
      }
      
      // 男性側の目盛を描画（0以外の場合のみ）
      if (index > 0 && maleTickX >= x1 && maleTickX <= maleStartX) {
        // 目盛線を描画（X軸から上向きの短い線）
        const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tickLine.setAttribute('x1', maleTickX);
        tickLine.setAttribute('y1', xAxisY);
        tickLine.setAttribute('x2', maleTickX);
        tickLine.setAttribute('y2', xAxisY - 5); // 5px上向き
        tickLine.setAttribute('stroke', '#adb5bd');
        tickLine.setAttribute('stroke-width', '1');
        xAxisGroup.appendChild(tickLine);
        
        // 目盛ラベルを描画（X軸の下に表示）
        if (tickInfo.labels.includes(tickValue)) {
          const tickLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          tickLabel.textContent = tickValue.toLocaleString();
          tickLabel.setAttribute('x', maleTickX);
          tickLabel.setAttribute('y', xAxisY + 15); // X軸の下15px
          tickLabel.setAttribute('text-anchor', 'middle');
          tickLabel.setAttribute('dominant-baseline', 'top');
          tickLabel.setAttribute('font-size', '10');
          tickLabel.setAttribute('fill', '#6c757d');
          xAxisGroup.appendChild(tickLabel);
        }
      }
    });
  }

  drawGenderLabels(maxBarLength) {
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 15歳、65歳のラベルと同じ位置計算（x1 + 40, x2 - 40）
    // 面積固定モードアニメーションでは全年次で最大長の棒の長さを基準に１回だけ描画する
    let x1;
    let x2;
    if ( !this.isVariableAreaMode && this.maxBarLengthForAnimation){
      x1 = (viewBoxWidth / 2) - (this.maxBarLengthForAnimation + 100);
      x2 = (viewBoxWidth / 2) + (this.maxBarLengthForAnimation + 100);
    } else {
      x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
      x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    }
    if (x1 < 5 ){ x1 = 10;}
    if (x2 > viewBoxWidth - 5){ x2 = viewBoxWidth - 10;} 
    
    // 男性ラベルは左端から40px右の位置（15歳、65歳ラベルと同じ）
    const mx = x1 + 40;
    // 女性ラベルは右端から40px左の位置
    const fx = x2 - 40;
    
    // デバッグ用ログ
    //console.warn('drawGenderLabels デバッグ:', {
    //  isAnimation: this.isAnimation,
    //  maxPopulationForAnimation: this.maxPopulationForAnimation,
    //  currentMaxPopulation: this.getMaxPopulation(this.data),
    //  unitSize: this.options.unitSize,
    //  viewBoxWidth: viewBoxWidth,
    //  x1: x1,
    //  x2: x2,
    //  mx: mx,
    //  fx: fx,
    //  centerX: viewBoxWidth / 2
    //});
    
    // 96歳の位置（最上部）
    const y = viewBoxHeight - (96 * this.options.barHeight);

    // 男性ラベル
    const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');    
    maleLabel.setAttribute('x', mx);
    maleLabel.setAttribute('y', y);
    maleLabel.setAttribute('text-anchor', 'end'); // 15歳、65歳ラベルと同じ
    maleLabel.setAttribute('dominant-baseline', 'bottom'); // 15歳、65歳ラベルと同じ
    maleLabel.setAttribute('fill', this.options.maleColor);
    maleLabel.setAttribute('font-size', '14'); // 15歳、65歳ラベルと同じ
    maleLabel.setAttribute('font-weight', 'bold');
    maleLabel.setAttribute('class', 'gender-label');
    maleLabel.textContent = '男性';
    this.staticGroup.appendChild(maleLabel);
    
    // 女性ラベル
    const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    femaleLabel.setAttribute('x', fx);
    femaleLabel.setAttribute('y', y);
    femaleLabel.setAttribute('text-anchor', 'start'); // 右端から40px左なのでstart
    femaleLabel.setAttribute('dominant-baseline', 'bottom'); // 15歳、65歳ラベルと同じ
    femaleLabel.setAttribute('fill', this.options.femaleColor);
    femaleLabel.setAttribute('font-size', '14'); // 15歳、65歳ラベルと同じ
    femaleLabel.setAttribute('font-weight', 'bold');
    femaleLabel.setAttribute('class', 'gender-label');
    femaleLabel.textContent = '女性';
    this.staticGroup.appendChild(femaleLabel);
  }


  // ユニットサイズを求める
  calculateUnitSize(data) {
    
    const pyramidHeight = this.options.height * 0.95;
    const whRatio = 0.5;  //人口ピラミッドが完全な長方形だった場合の縦横比

    let pyramidWidth = pyramidHeight * whRatio;
    
    const totalPopulation = this.getTotalPopulation(data);
    
    // 総人口が0の場合はunitSizeを0に設定（棒の長さ0として描画）
    if (totalPopulation === 0) {
      return 0;
    }

    let unitSize = pyramidWidth / (totalPopulation / 101);    
    return unitSize;    
  }

  getMaxPopulation(data) {
    let max = 0;
    //console.log('getMaxPopulation開始: データ件数 =', data.length);
    
    data.forEach((item, index) => {
      const ageGroup = item[0];
      const male = item[2];
      const female = item[3];
      
      // 総数、年齢不詳などの特殊ケースをスキップ
      if (ageGroup.match(/総数|合計|年齢不詳/) || male == null || female == null) {
        return;
      }
      
      // 各歳別データの場合（従来の処理）
      const ageNum = this.parseIndividualAge(ageGroup);
      if (ageNum !== null) {
        const maleNum = parseInt(male.replace(/,/g, '')) || 0;
        const femaleNum = parseInt(female.replace(/,/g, '')) || 0;
        const currentMax = Math.max(maleNum, femaleNum);
        if (currentMax > max) {
          max = currentMax;
        }
      }
      // 5歳階級別データの場合
      else if (ageGroup.match(/\d+[～〜]\d+歳|\d+歳以上/)) {
        const maleNum = parseInt(male.replace(/,/g, '')) || 0;
        const femaleNum = parseInt(female.replace(/,/g, '')) || 0;
        
        // 年齢階級の年数を取得
        const ageGroupInfo = this.parseAgeGroup(ageGroup);
        const yearSpan = ageGroupInfo.yearSpan;
        
        // 1歳あたりの人口を計算（棒の長さの基準とするため）
        const malePerYear = maleNum / yearSpan;
        const femalePerYear = femaleNum / yearSpan;
        const currentMax = Math.max(malePerYear, femalePerYear);
        
        if (currentMax > max) {
          max = currentMax;
        }
      }
    });
  
    return max;
  }

  // 年齢階級の文字列から年数範囲を解析する
  parseAgeGroup(ageGroupStr) {
    if (!ageGroupStr || typeof ageGroupStr !== 'string') {
      return { startAge: 0, endAge: 0, yearSpan: 1 };
    }
    
    // 総数、年齢不詳などの特殊ケース
    if (ageGroupStr.match(/総数|合計|年齢不詳/)) {
      return { startAge: 0, endAge: 0, yearSpan: 1 };
    }
    
    // 100歳以上のケース
    if (ageGroupStr.match(/100歳以上/)) {
      return { startAge: 100, endAge: 100, yearSpan: 1 };
    }
    
    // n歳以上のケース（80歳以上、85歳以上など）
    const overMatch = ageGroupStr.match(/(\d+)歳以上/);
    if (overMatch) {
      const startAge = parseInt(overMatch[1]);
      return { startAge: startAge, endAge: 100, yearSpan: 100 - startAge + 1 };
    }
    
    // n～m歳のケース（0～4歳、5～9歳、0〜10歳、11〜14歳など）
    // 全角チルダ（〜）と半角チルダ（~）の両方に対応
    const rangeMatch = ageGroupStr.match(/(\d+)[～〜](\d+)歳/);
    if (rangeMatch) {
      const startAge = parseInt(rangeMatch[1]);
      const endAge = parseInt(rangeMatch[2]);
      return { startAge: startAge, endAge: endAge, yearSpan: endAge - startAge + 1 };
    }
    
    // 単一年齢のケース（0歳、1歳など）
    const singleMatch = ageGroupStr.match(/(\d+)歳/);
    if (singleMatch) {
      const age = parseInt(singleMatch[1]);
      return { startAge: age, endAge: age, yearSpan: 1 };
    }
    
    // デフォルト（解析できない場合）
    return { startAge: 0, endAge: 0, yearSpan: 1 };
  }

  parseIndividualAge(ageStr) {
    if (!ageStr || typeof ageStr !== 'string') {
      return null;
    }
    
    if (ageStr.match(/総数|合計|年齢不詳/)) {
      return null;
    }
    
    if (ageStr.match(/(\d+)歳以上/)) {
      return parseInt(ageStr.match(/(\d+)歳以上/)[1]);
    }
    
    const singleMatch = ageStr.match(/^(\d+)歳$/);
    if (singleMatch) {
      return parseInt(singleMatch[1]);
    }

    const ageOnlyMatch = ageStr.match(/^(\d+)$/);
    if (ageOnlyMatch) {
      return parseInt(ageOnlyMatch[1]);
    }
    
    //解析できない場合
    return null;
  }

  // 全年次データから最大BarLengthを算出するメソッド
  calculateMaxBarLengthFromAllYears(allYearsData) {
    //console.log('全年次データから最大BarLengthを算出開始');
    //console.log('全年次データのキー:', Object.keys(allYearsData));
    let maxBarLength = 0;
    
    Object.keys(allYearsData).forEach(year => {
      const yearData = allYearsData[year];
      
      if (yearData) {
        // データタイプを判定
        const isFiveYearAgeGroup = yearData.five_year_age_group !== undefined;
        const data = isFiveYearAgeGroup ? yearData.five_year_age_group : yearData.kakusai_betsu;
                
        if (data && Array.isArray(data)) {
          const yearMaxPopulation = this.getMaxPopulation(data);
          const yearUnitSize = this.calculateUnitSize(data);
          const yearMaxBarLength = yearUnitSize * yearMaxPopulation;
          maxBarLength = Math.max(maxBarLength, yearMaxBarLength);
        } else {
          //console.warn(`年次 ${year}: データが配列ではありません`, data);
        }
      } else {
        //console.warn(`年次 ${year}: データが存在しません`);
      }
    });
    
    //console.log(`全年次での最大BarLength: ${maxBarLength}`);
    return maxBarLength;
  }
  setMaxBarLengthForAnimation(maxBarLength){
    this.maxBarLengthForAnimation = maxBarLength;
    //console.warn(`固定面積モードアニメーション用年齢別最大BarLengthを設定: ${maxBarLength}`);
  }

  getTotalPopulation(data) {
    //console.log('getTotalPopulation', data);
    let total = 0;
    
    // dataがオブジェクトの場合はkakusai_betsuまたはfive_year_age_groupを取得
    const dataArray = data && data.kakusai_betsu ? data.kakusai_betsu : 
                     data && data.five_year_age_group ? data.five_year_age_group : data;
    
    if (!dataArray || !Array.isArray(dataArray)) {
      //console.warn('getTotalPopulation: データが配列ではありません', dataArray);
      return 0;
    }
    
    dataArray.forEach(item => {
      const ageGroup = item[0];
      const male = item[2];
      const female = item[3];
      
      // 総数、年齢不詳などの特殊ケースをスキップ
      if (ageGroup.match(/総数|合計|年齢不詳/) || male == null || female == null) {
        return;
      }
      
      const maleNum = parseInt(male.replace(/,/g, '')) || 0;
      const femaleNum = parseInt(female.replace(/,/g, '')) || 0;
      total += maleNum + femaleNum;
    });
    return total;
  }

  calculateBarWidth(count, unitSize) {
    // 人口が0の場合は棒の長さ0として描画
    if (count === 0) {
      return 0;
    }
    return Math.max(1, count * unitSize); // 最小幅1ピクセル
  }

  clearBars() {
    // 動的グループ内の既存のバー要素を削除
    const bars = this.dynamicGroup.querySelectorAll('.age-bar, .male-bar, .female-bar, .population-label, .male-bottom-line, .female-bottom-line');
    bars.forEach(bar => bar.remove());
  }

  clearStaticElements() {
    // 静的グループ内の既存の静的要素を削除（背景以外）
    const staticElements = this.staticGroup.querySelectorAll('.grid, .age-labels, .special-age-lines, .x-axis, .gender-label');
    staticElements.forEach(element => element.remove());
  }

  // 人数表示位置を計算する関数（重なり回避）
  calculateLabelPosition(gender, barEndX, labelWidth, previousPosition) {
    const minSpacing = 5; // 最小間隔（ピクセル）
    const defaultOffset = 5; // デフォルトの棒からの距離を5pxに変更
    
    let idealX;
    if (gender === 'male') {
      // 男性：棒の左端から左側に表示
      idealX = barEndX - defaultOffset;
    } else {
      // 女性：棒の右端から右側に表示
      idealX = barEndX + defaultOffset;
    }
    
    // 前のラベルとの重なりをチェック
    if (previousPosition.x !== null) {
      const overlap = this.checkLabelOverlap(idealX, labelWidth, previousPosition);
      
      if (overlap) {
        // 重なりの場合、棒の側に寄せることを第一候補とする
        let adjustedX;
        if (gender === 'male') {
          // 男性：棒の左端により近づける
          adjustedX = barEndX - minSpacing;
          // それでも重なる場合は棒から遠ざかる
          if (this.checkLabelOverlap(adjustedX, labelWidth, previousPosition)) {
            adjustedX = previousPosition.x - labelWidth - minSpacing;
          }
        } else {
          // 女性：棒の右端により近づける
          adjustedX = barEndX + minSpacing;
          // それでも重なる場合は棒から遠ざかる
          if (this.checkLabelOverlap(adjustedX, labelWidth, previousPosition)) {
            adjustedX = previousPosition.x + previousPosition.width + minSpacing;
          }
        }
        return adjustedX;
      }
    }
    
    return idealX;
  }
  
  // ラベルの重なりをチェックする関数
  checkLabelOverlap(x, width, previousPosition) {
    if (previousPosition.x === null) return false;
    
    const currentStart = x;
    const currentEnd = x + width;
    const previousStart = previousPosition.x;
    const previousEnd = previousPosition.x + previousPosition.width;
    
    // 重なりの判定
    return !(currentEnd <= previousStart || currentStart >= previousEnd);
  }
  
  // テキストの幅を推定する関数
  estimateTextWidth(text, fontSize) {
    // 簡易的な文字幅の推定（実際のフォントに依存するが、概算として使用）
    const avgCharWidth = fontSize * 0.5; // フォントサイズの60%を文字幅として推定
    return text.length * avgCharWidth;
  }

  drawAgeBar(age, maleCount, femaleCount, unitSize, barHeight, yearSpan=1) {

    // 現在のviewBoxのサイズの棒の使用（動的に計算）
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 年齢の位置を計算（0歳が下、100歳が上）
    const agePosition = viewBoxHeight - (age * barHeight) - (barHeight * yearSpan);
    
    // 男性の棒を描画（左側）- 中央線から10px離す（人口0でも描画）
    const maleWidth = this.calculateBarWidth(maleCount, unitSize);
    const maleBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');      
    maleBar.setAttribute('x', viewBoxWidth / 2 - maleWidth - 10); // 中央線から10px離す
    maleBar.setAttribute('y', agePosition);
    maleBar.setAttribute('width', maleWidth);
    maleBar.setAttribute('height', barHeight * yearSpan);
    maleBar.setAttribute('fill', this.options.maleColor);
    maleBar.setAttribute('stroke', this.options.maleStrokeColor);
    maleBar.setAttribute('stroke-width', '1');
    maleBar.setAttribute('class', 'male-bar age-bar');
    maleBar.setAttribute('data-age', age);
    maleBar.setAttribute('data-gender', 'male');
    maleBar.setAttribute('data-population', maleCount);
    
    this.dynamicGroup.appendChild(maleBar);
    
    // 5歳ごとの棒のボトムラインを太くする
    if (age % 5 === 0) {
      const bottomLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      bottomLine.setAttribute('x1', viewBoxWidth / 2 - maleWidth - 10);
      bottomLine.setAttribute('y1', agePosition + (barHeight * yearSpan));
      bottomLine.setAttribute('x2', viewBoxWidth / 2 - 10);
      bottomLine.setAttribute('y2', agePosition + (barHeight * yearSpan));
      bottomLine.setAttribute('stroke', this.options.maleSpecialStrokeColor);
      bottomLine.setAttribute('stroke-width', '1');
      bottomLine.setAttribute('class', 'male-bottom-line');
      this.dynamicGroup.appendChild(bottomLine);
    }
    
    // 人数ラベル（アニメーション中は非表示、人口0の場合は非表示）
    if (this.options.showNumbers && maleCount > 0 && !this.isAnimation) {
      const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const maleLabelText = maleCount.toLocaleString();
      const maleLabelWidth = this.estimateTextWidth(maleLabelText, this.options.fontSize - 3);
      
      // 男性の棒の左端位置
      const maleBarEndX = viewBoxWidth / 2 - maleWidth - 10;
      
      // 重なりを避けた位置を計算
      const maleLabelX = this.calculateLabelPosition('male', maleBarEndX, maleLabelWidth, this.previousLabelPositions.male);
      
      maleLabel.setAttribute('x', maleLabelX);
      maleLabel.setAttribute('y', agePosition + (barHeight * yearSpan) / 2 + 3); // 縦位置を3px下に調整
      maleLabel.setAttribute('text-anchor', 'end');
      maleLabel.setAttribute('fill', this.options.textColor);
      maleLabel.setAttribute('font-size', this.options.fontSize - 3);
      maleLabel.setAttribute('class', 'population-label');
      maleLabel.textContent = maleLabelText;
      this.dynamicGroup.appendChild(maleLabel);
      
      // 次のラベルのために位置を記録
      this.previousLabelPositions.male = { x: maleLabelX, width: maleLabelWidth };
    } else {
      // ラベルが表示されない場合は位置をリセット
      this.previousLabelPositions.male = { x: null, width: 0 };
    }
    
    // 女性の棒を描画（右側）- 中央線から10px離す（人口0でも描画）
    const femaleWidth = this.calculateBarWidth(femaleCount, unitSize);
    const femaleBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    femaleBar.setAttribute('x', viewBoxWidth / 2 + 10); // 中央線から10px離す
    femaleBar.setAttribute('y', agePosition);
    femaleBar.setAttribute('width', femaleWidth);
    femaleBar.setAttribute('height', barHeight * yearSpan);
    femaleBar.setAttribute('fill', this.options.femaleColor);
    femaleBar.setAttribute('stroke', this.options.femaleStrokeColor);
    femaleBar.setAttribute('stroke-width', '1');
    femaleBar.setAttribute('class', 'female-bar age-bar');
    femaleBar.setAttribute('data-age', age);
    femaleBar.setAttribute('data-gender', 'female');
    femaleBar.setAttribute('data-population', femaleCount);
    
    this.dynamicGroup.appendChild(femaleBar);
    
    // 5歳ごとの棒のボトムラインを太くする
    if (age % 5 === 0) {
      const bottomLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      bottomLine.setAttribute('x1', viewBoxWidth / 2 + 10);
      bottomLine.setAttribute('y1', agePosition + (barHeight * yearSpan));
      bottomLine.setAttribute('x2', viewBoxWidth / 2 + femaleWidth + 10);
      bottomLine.setAttribute('y2', agePosition + (barHeight * yearSpan));
      bottomLine.setAttribute('stroke', this.options.femaleSpecialStrokeColor);
      bottomLine.setAttribute('stroke-width', '1');
      bottomLine.setAttribute('class', 'female-bottom-line');
      this.dynamicGroup.appendChild(bottomLine);
    }
    
    // 人数ラベル（アニメーション中は非表示、人口0の場合は非表示）
    if (this.options.showNumbers && femaleCount > 0 && !this.isAnimation) {
      const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const femaleLabelText = femaleCount.toLocaleString();
      const femaleLabelWidth = this.estimateTextWidth(femaleLabelText, this.options.fontSize - 3);
      
      // 女性の棒の右端位置
      const femaleBarEndX = viewBoxWidth / 2 + femaleWidth + 10;
      
      // 重なりを避けた位置を計算
      const femaleLabelX = this.calculateLabelPosition('female', femaleBarEndX, femaleLabelWidth, this.previousLabelPositions.female);
      
      femaleLabel.setAttribute('x', femaleLabelX);
      femaleLabel.setAttribute('y', agePosition + (barHeight * yearSpan) / 2 + 3); // 縦位置を3px下に調整
      femaleLabel.setAttribute('text-anchor', 'start');
      femaleLabel.setAttribute('fill', this.options.textColor);
      femaleLabel.setAttribute('font-size', this.options.fontSize - 3);
      femaleLabel.setAttribute('class', 'population-label');
      femaleLabel.textContent = femaleLabelText;
      this.dynamicGroup.appendChild(femaleLabel);
      
      // 次のラベルのために位置を記録
      this.previousLabelPositions.female = { x: femaleLabelX, width: femaleLabelWidth };
    } else {
      // ラベルが表示されない場合は位置をリセット
      this.previousLabelPositions.female = { x: null, width: 0 };
    }
  }

  render(animeMode) {
    console.warn('🌸 render開始');
    //console.log('this.options.zoomScale', this.options.zoomScale);

    // 人数表示位置の記録をリセット
    this.previousLabelPositions = {
      male: { x: null, width: 0 },
      female: { x: null, width: 0 }
    };

    let isInterpolation = false;
    let isVariableAreaMode = false;
    if (animeMode != undefined) {
      isInterpolation = animeMode.isInterpolation;
      isVariableAreaMode = animeMode.isVariableAreaMode;
    }

    let unitSize = this.options.unitSize;
    let barHeight = this.options.barHeight;
    
    // 非アニメーション時またはアニメーションの最初のフレーム時または可変面積モード時は固定要素を再描画
    if (!this.isAnimation || this.isFirstAnimationFrame || isVariableAreaMode) {
      // 補間アニメーションの補間データでは静的要素を再描画しない.
      if (!isInterpolation) {
        this.drawStaticElements();
      }
    }

    // 既存のバー要素をクリア
    this.clearBars();
    
    let populationMap = new Map();

    if (this.isFiveYearAgeGroup) {
      // 5歳階級別データの処理
      //console.log('Processing five year age group data');
      populationMap = new Map();
      this.data.forEach((item, index) => {

        const ageGroup = item[0];
        const ageGroupInfo = this.parseAgeGroup(ageGroup);
        const yearSpan = ageGroupInfo.yearSpan;

        const male = item[2];
        const female = item[3];
        
        // 総数、年齢不詳などの特殊ケースをスキップ
        if (ageGroup.match(/総数|合計|年齢不詳/) || male == null || female == null) {
          return;
        }
        
        const maleNum = parseInt(male.replace(/,/g, '')) / yearSpan || 0;
        const femaleNum = parseInt(female.replace(/,/g, '')) / yearSpan || 0;
        
        populationMap.set( ageGroupInfo.startAge, { male: maleNum, female: femaleNum, yearSpan: yearSpan });
      });
    } else {
      // 各歳別データの処理（従来の処理）
      //console.log('Processing individual age data');
      // データから年齢別人口のマップを作成
      this.data.forEach((item, index) => {
        const age = item[0];
        const male = item[2];
        const female = item[3];
        
        // 元の実装と同じロジック: 内容で判断
        if (age.match(/総数|合計|年齢不詳/) || male == null || female == null) {
          return;
        }

        // 年齢を解析（"0歳"形式にも対応）
        let ageNum = this.parseIndividualAge(age);
        if (ageNum === null) {
          return; // 解析できない場合はスキップ
        }
        if (ageNum > 100) {
          ageNum = 100; // 101歳以上は100歳に集約するため便宜上100とする.
        }        

        const maleNum = parseInt(male.replace(/,/g, '')) || 0;
        const femaleNum = parseInt(female.replace(/,/g, '')) || 0;

        // 既存のデータ(同じageNumのデータ)がある場合は加算
        const existingData = populationMap.get(ageNum) || { male: 0, female: 0, yearSpan: 1 };
        populationMap.set(ageNum, { 
          male: existingData.male + maleNum, 
          female: existingData.female + femaleNum, 
          yearSpan: 1 
        });        
      });
    }

    // 0歳から100歳までの全ての年齢のバーを描画
    let nextAge = 0;
    for (let age = 0; age <= 100; age++) {
      if (age == nextAge) {
        const yearSpan = populationMap.get(age).yearSpan ;
        const population = populationMap.get(age) || { male: 0, female: 0 };
        this.drawAgeBar(age, population.male, population.female, unitSize, barHeight, yearSpan);
        nextAge = age + yearSpan;
      }
    }
  }

  // データを差し替えたときに再描画するメソッド
  updateData(newData, animeMode) {
    console.warn('🌸 updateData開始');
    // アニメーションモードを検出
    let isAnimation = false;
    let isInterpolation = false;
    if (animeMode != undefined) {
      isAnimation = true;
      isInterpolation = animeMode.isInterpolation;
      this.isVariableAreaMode = animeMode.isVariableAreaMode;
    }

    // データタイプを判定（5歳階級別か各歳別か）
    this.isFiveYearAgeGroup = newData.five_year_age_group !== undefined;
    this.data = this.isFiveYearAgeGroup ? newData.five_year_age_group : newData.kakusai_betsu;
    
    // アニメーション状態の変更を検出
    const wasAnimation = this.isAnimation;
    this.isAnimation = isAnimation;
    
    // アニメーション開始時（非アニメーション→アニメーション）の最初のフレームをマーク
    if (!wasAnimation && isAnimation) {
      this.isFirstAnimationFrame = true;
      console.warn('アニメーション開始: 最初のフレームをマーク');
    } else if (wasAnimation && isAnimation) {
      // アニメーション継続中は最初のフレームフラグをクリア
      this.isFirstAnimationFrame = false;
    } else if (wasAnimation && !isAnimation) {
      // アニメーション終了時はフラグをクリア
      this.isFirstAnimationFrame = false;
      console.warn('アニメーション終了: フラグをクリア');
    }
  
    // 現在のデータに基づいてunitSizeを再計算
    let originalUnitSize = this.calculateUnitSize(this.data);
    let scale = this.options.unitSizeScale;
    this.options.unitSize = originalUnitSize * scale;
    
    let z = 1;
    if (this.isAnimation && this.isVariableAreaMode){
      z = this.currentYearScale;
    } else {
      // zoomScaleが変更されている場合は、resizeByScaleを呼び出してサイズ調整を適用
      z = this.options.zoomScale;
    }
    if (z != 1) {
      this.resizeByScale(z);
    }
    this.render(animeMode);
  }
    
  // オプションの動的変更
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.init();
    if (this.data) {
      this.render();
    }
  }

  // unitSizeを外部から指定して描画
  //renderWithFixedUnitSize(unitSize) {
  //  console.log('renderWithFixedUnitSize: unitSize =', unitSize);
  //  if (unitSize && unitSize > 0) {
  //    this.options.unitSize = unitSize;
  //    this.render();
  //  } else {
  //    console.warn('renderWithFixedUnitSize: 無効なunitSizeが指定されました:', unitSize);
  //  }
  //}

  // ピラミッドのサイズ調整（ハイブリッド方式）
  resize(options = {}) {
    if (options.scale) {
      // 方式1: スケール指定
      this.resizeByScale(options.scale);

    } else if (options.unitSize || options.barHeight) {
      // 方式2: 個別パラメータ指定
      //console.log('options.unitSize', options.unitSize);
      //console.log('options.barHeight', options.barHeight);
      this.resizeByParameters(options);
    }
  }

  // 方式1: transform属性を使いズーム
  resizeByScale(scale) {
    
    //const baseBox = this.sceneGroup.getBBox();
    //
    //let w = baseBox.width * scale ;
    //let h = baseBox.height * scale ;
    //
    //let cx = baseBox.x + baseBox.width / 2;
    //let cy = baseBox.y + baseBox.height / 2;
    //
    //let tx = cx - w / 2 ;
    //let ty = cy - h / 2 ;
    const cx = this.options.width / 2;
    const cy = this.options.height / 2;
    // sceneGroupのtransform属性を更新
    //this.sceneGroup.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);    
    this.sceneGroup.setAttribute(
      'transform', 
      `translate(${cx},${cy}) scale(${scale}) translate(${-cx}, ${-cy})`
    );    

    // 後続の処理のためにオプションの値を更新
    if (!this.isAnimation || !this.isVariableAreaMode){
      this.options = {
        ...this.options,
        zoomScale :scale
      };
    }

    console.log('this.options.zoomScale', this.options.zoomScale);
  }

  // 方式2: 個別パラメータ指定によるリサイズ
  resizeByParameters(options) {
    let needsReinit = false;

    console.log('this.options.barHeight1', this.options.barHeight);

    // unitSizeが指定されている場合
    if (options.unitSize !== null && options.unitSize !== undefined) {
      this.options.unitSize = options.unitSize;
      needsReinit = true;
    }
    
    // barHeightが指定されている場合
    if (options.barHeight !== null && options.barHeight !== undefined) {
      this.options.barHeight = options.barHeight;
      needsReinit = true;
    }

    // パラメータが変更された場合は再初期化
    if (needsReinit) {
      this.init();
      if (this.data) {
        this.render();
      }
    }
    //後続の処理のためにオプションの値を更新
    if (options.unitSize !== null && options.unitSize !== undefined) {
      // 可変面積モードではunitSizeScaleは使用しない（zoomScaleを使用）
      // 手動操作時のみunitSizeScaleを更新
      if (this.options.zoomScale === 1) {
        // 面積固定モードまたは手動操作時: unitSizeScaleを更新
        let originalUnitSize = this.calculateUnitSize(this.data) ;
        let unitSizeScale = options.unitSize / originalUnitSize;
        this.options.unitSizeScale = unitSizeScale;
        //console.log('面積固定モード/手動操作: unitSizeScaleを更新', unitSizeScale);
      } else {
        // 可変面積モード: unitSizeScaleは使用しない
        //console.log('可変面積モード: unitSizeScaleは使用しない（zoomScaleを使用）', this.options.unitSizeScale);
      }
    }
    if (options.barHeight !== null && options.barHeight !== undefined) {
      let originalBarHeight = this.options.height * 0.95 / 105 ;
      let barHeightScale = options.barHeight / originalBarHeight;
      this.options.barHeightScale = barHeightScale;

      console.log('barHeightScale', barHeightScale);
      console.log('this.options.barHeight4', this.options.barHeight);
    }

    console.log('rout4');
    console.log('this.options.unitSizeScale', this.options.unitSizeScale);
    console.log('this.options.barHeightScale', this.options.barHeightScale);
  }
   /**
   * 最大値に対して目盛サイズを決定し、ラベル位置を返す関数
   * 
   * @param {number} maxValue - 棒グラフの最大値（単位）
   * @param {number} screenCm - 最大の棒の画面長（cm）, デフォルト 10
   * @param {number} minTickCm - 1目盛の最小長（cm）, デフォルト 1
   * @returns {{tick: number, ticksCount: number, tickCm: number, ticks: number[], labels: number[]}}
   *
   * ---- 使用例 ----
   *console.log(chooseTickSize(123));
   * => tick: 50, ticksCount: 3, ticks: [0,50,100,150], labels: [0,50,100,150]
   *console.log(chooseTickSize(80));
   * => tick: 10, ticksCount: 8, ticks: [0,10,...,80], labels: [0,20,40,60,80]  
   *console.log(chooseTickSize(250));
   * => tick: 50, ticksCount: 5, ticks: [0,50,100,150,200,250], labels: [0,50,100,150,200,250] (全部)
   */
  chooseTickSize(maxValue, screenCm = 10.0, minTickCm = 1.0) {
    if (maxValue <= 0) {
      // 最大値が0以下の場合はデフォルトの目盛設定を返す
      return { 
        tick: 0, 
        ticksCount: 0, 
        tickCm: 0, 
        ticks: [0], 
        labels: [0] 
      };
    }
  
    // 必要最小値（単位）
    const required = maxValue * (minTickCm / screenCm);
  
    // 10^k の指数を推定
    let k = Math.floor(Math.log10(required));
    k = isFinite(k) ? k - 1 : -10;
  
    let tick = null;
    while (tick === null) {
      for (const base of [1, 5]) {
        const candidate = base * Math.pow(10, k);
        if (candidate >= required) {
          tick = candidate;
          break;
        }
      }
      k++;
      if (k > 100) throw new Error(`Failed to find tick (required=${required})`);
    }
  
    const ticksCount = Math.ceil(maxValue / tick);
    const tickCm = screenCm * tick / maxValue;
  
    // すべての目盛位置
    const ticks = [];
    for (let i = 0; i <= ticksCount; i++) {
      ticks.push(i * tick);
    }
  
    // ラベルを付ける間隔を決定
    let labelStep = 1;
    if (ticksCount > 4) {
      // できれば5目盛ごとにラベル
      if (ticksCount / 5 >= 2) {
        labelStep = 5;
      } else {
        labelStep = 2;
      }
    }
  
    // ラベル位置
    const labels = ticks.filter((_, i) => i % labelStep === 0);
  
    return { tick, ticksCount, tickCm, ticks, labels };
  }  
}
