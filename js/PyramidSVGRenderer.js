// 横浜市の人口ピラミッド SVG描画エンジン ver1.3 2024.12.30
// 既存のpyramid.jsとの互換性を保ちながら、SVGによる柔軟な描画を実現

class PyramidSVGRenderer {
  constructor(containerId, hashData, options = {}) {
    console.log('PyramidSVGRenderer constructor');
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.isAnimation = false; // アニメーション状態を初期化
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
    this.data = hashData.kakusai_betsu;
    //console.log('this.data', this.data);
    this.options.unitSize = this.calculateUnitSize(this.data);
    console.log('init this.options.unitSize', this.options.unitSize);
    this.options.barHeight = this.options.height * 0.95 / 105; // 目盛ラベル用のスペースを確保
    this.init();
    this.render();
  }

  init() {
    console.log('init開始');
    console.log('this.options.width', this.options.width);
    console.log('this.options.height', this.options.height);
    console.log('this.options.unitSize', this.options.unitSize);
    console.log('this.options.barHeight', this.options.barHeight);
    console.log('this.options.zoomScale', this.options.zoomScale);

    // 既存のコンテナをクリア
    this.container.innerHTML = '';
    
    // SVG要素を作成
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('id', 'pyramid-svg');

    //console.log('this.options.width', this.options.width);
    //console.log('this.options.height', this.options.height);
    
    this.svg.setAttribute('width', this.options.width);
    this.svg.setAttribute('height', this.options.height);
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
    if (this.options.zoomScale != 1) {
      this.resizeByScale(this.options.zoomScale);
    }
  }

  // 静的要素を描画（一度だけ実行）
  drawStaticElements() {
    // 背景を描画
    this.drawBackground();
    
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
    const x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    const x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);

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

  drawSpecialAgeLines() {
    const specialLineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    specialLineGroup.setAttribute('class', 'special-age-lines');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 15歳、65歳、75歳の特別な横線とラベル
    const specialAges = [15, 65, 75];
    const ageLabels = ['15歳', '65歳', '75歳'];
    const x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    const x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);

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

  drawXAxis() {
    const xAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisGroup.setAttribute('class', 'x-axis');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // X軸の位置（0歳のラインの下）
    const xAxisY = viewBoxHeight;
    
    // X軸の範囲（15歳、65歳、75歳のラインと同じ長さ）
    const x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    const x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    
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

  drawGenderLabels() {
    let cx = this.options.width / 2;
    let w = this.options.unitSize * this.getMaxPopulation(this.data);
    let h = this.options.height * 0.95;
    let mx = cx - w * 0.9;
    let fx = cx + w * 0.9;
    let y = h - this.options.barHeight * 96 ;
    //console.log('mx', mx);
    //console.log('fx', fx);
    console.log('drawGenderLabels barHeight', h);
    console.log('drawGenderLabels y', y);

    // 男性ラベル
    const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');    
    maleLabel.setAttribute('x', mx);
    maleLabel.setAttribute('y', y);
    maleLabel.setAttribute('text-anchor', 'middle');
    maleLabel.setAttribute('fill', this.options.maleColor);
    maleLabel.setAttribute('font-size', this.options.fontSize + 2);
    maleLabel.setAttribute('font-weight', 'bold');
    maleLabel.setAttribute('class', 'gender-label');
    maleLabel.textContent = '男性';
    this.staticGroup.appendChild(maleLabel);
    
    // 女性ラベル
    const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    femaleLabel.setAttribute('x', fx);
    femaleLabel.setAttribute('y', y);
    femaleLabel.setAttribute('text-anchor', 'middle');
    femaleLabel.setAttribute('fill', this.options.femaleColor);
    femaleLabel.setAttribute('font-size', this.options.fontSize + 2);
    femaleLabel.setAttribute('font-weight', 'bold');
    femaleLabel.setAttribute('class', 'gender-label');
    femaleLabel.textContent = '女性';
    this.staticGroup.appendChild(femaleLabel);
  }

  // ユニットサイズの初期値を求める
  calculateUnitSize(data) {
    const totalPopulation = this.getTotalPopulation(data);
    const pyramidHeight = this.options.height * 0.95;
    const whRatio = 0.5;  //人口ピラミッドが完全な長方形だった場合の縦横比

    let pyramidWidth = pyramidHeight*whRatio;
    let unitSize     = pyramidWidth/(totalPopulation / 101);

    //console.log('pyramidWidth', pyramidWidth);
    //console.log('totalPopulation', totalPopulation); 

    return unitSize;    
  }

  getMaxPopulation(data) {
    let max = 0;
    data.forEach(item => {
      if (item[2] && item[3] && item[0].match(/^[0-9]+(以上)?$/)) {
        const male = parseInt(item[2].replace(/,/g, '')) || 0;
        const female = parseInt(item[3].replace(/,/g, '')) || 0;
        max = Math.max(max, male, female);
      }
    });
    return max;
  }

  getTotalPopulation(data) {
    //console.log('getTotalPopulation', data);
    let total = 0;
    
    // dataがオブジェクトの場合はkakusai_betsuを取得
    const kakusaiBetsu = data && data.kakusai_betsu ? data.kakusai_betsu : data;
    
    if (!kakusaiBetsu || !Array.isArray(kakusaiBetsu)) {
      console.warn('getTotalPopulation: kakusai_betsuが配列ではありません', kakusaiBetsu);
      return 0;
    }
    
    kakusaiBetsu.forEach(item => {
      if (item && item[0] && item[0].match(/^[0-9]+(以上)?$/)) {
        const male = parseInt(item[2].replace(/,/g, '')) || 0;
        const female = parseInt(item[3].replace(/,/g, '')) || 0;
        total += male + female;
      }
    });
    return total;
  }

  calculateBarWidth(count, unitSize) {
    return Math.max(1, count * unitSize); // 最小幅1ピクセル
  }

  clearBars() {
    // 動的グループ内の既存のバー要素を削除
    const bars = this.dynamicGroup.querySelectorAll('.age-bar, .male-bar, .female-bar, .population-label, .male-bottom-line, .female-bottom-line');
    bars.forEach(bar => bar.remove());
  }

  drawAgeBar(age, maleCount, femaleCount,unitSize,barHeight) {

    // 現在のviewBoxのサイズの棒の使用（動的に計算）
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height * 0.95;
    
    // 年齢の位置を計算（0歳が下、100歳が上）
        const agePosition = viewBoxHeight - (age * barHeight) - barHeight;
    
    // 男性の棒を描画（左側）- 中央線から10px離す
    if (maleCount > 0) {
      const maleWidth = this.calculateBarWidth(maleCount, unitSize);
      const maleBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');      
      maleBar.setAttribute('x', viewBoxWidth / 2 - maleWidth - 10); // 中央線から10px離す
      maleBar.setAttribute('y', agePosition);
      maleBar.setAttribute('width', maleWidth);
      maleBar.setAttribute('height', barHeight);
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
        bottomLine.setAttribute('y1', agePosition + barHeight);
        bottomLine.setAttribute('x2', viewBoxWidth / 2 - 10);
        bottomLine.setAttribute('y2', agePosition + barHeight);
        bottomLine.setAttribute('stroke', this.options.maleSpecialStrokeColor);
        bottomLine.setAttribute('stroke-width', '1');
        bottomLine.setAttribute('class', 'male-bottom-line');
        this.dynamicGroup.appendChild(bottomLine);
      }
      
      // 人数ラベル（アニメーション中は非表示）
      if (this.options.showNumbers && maleCount > 0 && !this.isAnimation) {
        const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        maleLabel.setAttribute('x', viewBoxWidth / 2 - maleWidth - 15); // 棒の左端から5px左
        maleLabel.setAttribute('y', agePosition + barHeight / 2);
        maleLabel.setAttribute('text-anchor', 'end');
        maleLabel.setAttribute('fill', this.options.textColor);
        maleLabel.setAttribute('font-size', this.options.fontSize - 3);
        maleLabel.setAttribute('class', 'population-label');
        maleLabel.textContent = maleCount.toLocaleString();
        this.dynamicGroup.appendChild(maleLabel);
      }
    }
    
    // 女性の棒を描画（右側）- 中央線から10px離す
    if (femaleCount > 0) {
      const femaleWidth = this.calculateBarWidth(femaleCount, unitSize);
      const femaleBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      femaleBar.setAttribute('x', viewBoxWidth / 2 + 10); // 中央線から10px離す
      femaleBar.setAttribute('y', agePosition);
      femaleBar.setAttribute('width', femaleWidth);
      femaleBar.setAttribute('height', barHeight);
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
        bottomLine.setAttribute('y1', agePosition + barHeight);
        bottomLine.setAttribute('x2', viewBoxWidth / 2 + femaleWidth + 10);
        bottomLine.setAttribute('y2', agePosition + barHeight);
        bottomLine.setAttribute('stroke', this.options.femaleSpecialStrokeColor);
        bottomLine.setAttribute('stroke-width', '1');
        bottomLine.setAttribute('class', 'female-bottom-line');
        this.dynamicGroup.appendChild(bottomLine);
      }
      
      // 人数ラベル（アニメーション中は非表示）
      if (this.options.showNumbers && femaleCount > 0 && !this.isAnimation) {
        const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        femaleLabel.setAttribute('x', viewBoxWidth / 2 + femaleWidth + 15); // 棒の右端から5px右
        femaleLabel.setAttribute('y', agePosition + barHeight / 2);
        femaleLabel.setAttribute('text-anchor', 'start');
        femaleLabel.setAttribute('fill', this.options.textColor);
        femaleLabel.setAttribute('font-size', this.options.fontSize - 3);
        femaleLabel.setAttribute('class', 'population-label');
        femaleLabel.textContent = femaleCount.toLocaleString();
        this.dynamicGroup.appendChild(femaleLabel);
      }
    }
  }

  render() {
    console.warn(`render開始 with zoomScale ${this.options.zoomScale}`);
    console.log('render開始');
    console.log('this.options.width', this.options.width);
    console.log('this.options.height', this.options.height);
    console.log('this.options.unitSize', this.options.unitSize);
    console.log('this.options.barHeight', this.options.barHeight);
    console.log('this.options.zoomScale', this.options.zoomScale);

    let unitSize = this.options.unitSize;
    let barHeight = this.options.barHeight;
    let unitSizeScale = this.options.unitSizeScale;
    let barHeightScale = this.options.barHeightScale;

    // 既存のバー要素をクリア
    this.clearBars();
        
    // データから年齢別人口のマップを作成
    const populationMap = new Map();
    this.data.forEach((item, index) => {
      const age = item[0];
      const male = item[2];
      const female = item[3];
      
      // 元の実装と同じロジック: 内容で判断
      if (age.match(/総数|合計|年齢不詳/) || male == null || female == null) {
        return;
      }
      
      const maleNum = parseInt(male.replace(/,/g, '')) || 0;
      const femaleNum = parseInt(female.replace(/,/g, '')) || 0;
      
      populationMap.set(parseInt(age), { male: maleNum, female: femaleNum });
    });
    console.log('previous drawAgeBar');
    // 0歳から100歳までの全ての年齢のバーを描画
    for (let age = 0; age <= 100; age++) {
      const population = populationMap.get(age) || { male: 0, female: 0 };
      this.drawAgeBar(age, population.male, population.female,unitSize,barHeight);
    }
    console.log('after drawAgeBar');
  }

  // データを差し替えたときに再描画するメソッド
  updateData(newData, isAnimation = false) {
    this.data = newData.kakusai_betsu;
    this.isAnimation = isAnimation; // アニメーション状態を保存
  
    let z = this.options.zoomScale;
  
    // 新しいデータに基づいてunitSizeを再計算（zoomScaleモードでは使用されないが、互換性のため保持）
    let originalUnitSize = this.calculateUnitSize(this.data);
    let scale = this.options.unitSizeScale;
    this.options.unitSize = originalUnitSize * scale;
    console.log('updateData this.options.unitSize', this.options.unitSize);
    
    // zoomScaleが変更されている場合は、resizeByScaleを呼び出してサイズ調整を適用
    if (z != 1) {
      this.resizeByScale(z);
    }
    this.render();
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
  renderWithFixedUnitSize(unitSize) {
    console.log('renderWithFixedUnitSize: unitSize =', unitSize);
    if (unitSize && unitSize > 0) {
      this.options.unitSize = unitSize;
      this.render();
    } else {
      console.warn('renderWithFixedUnitSize: 無効なunitSizeが指定されました:', unitSize);
    }
  }

  // ピラミッドのサイズ調整（ハイブリッド方式）
  resize(options = {}) {
    if (options.scale) {
      // 方式1: スケール指定
      this.resizeByScale(options.scale);

    } else if (options.unitSize || options.barHeight) {
      // 方式2: 個別パラメータ指定
      console.log('options.unitSize', options.unitSize);
      console.log('options.barHeight', options.barHeight);
      this.resizeByParameters(options);
    }
  }

  // 方式1: transform属性を使いズーム
  resizeByScale(scale) {
    
    const baseBox = this.sceneGroup.getBBox();

    console.log('resizeByScale2 baseBox');
    console.log('baseBox.width', baseBox.width);
    console.log('baseBox.height', baseBox.height);
    console.log('baseBox.x', baseBox.x);
    console.log('baseBox.y', baseBox.y);
    
    let w = baseBox.width * scale ;
    let h = baseBox.height * scale ;
    
    console.log('resizeByScale2 scale', scale);
    console.log('resizeByScale2 w', w);
    console.log('resizeByScale2 h', h);

    //let cx = baseBox.x + baseBox.width / 2;
    //let cy = baseBox.y + baseBox.height / 2;
    let cx = this.options.width / 2;
    let cy = this.options.height / 2;

    let tx = cx - w / 2 ;
    let ty = cy - h / 2 ;
    
    // sceneGroupのtransform属性を更新
    this.sceneGroup.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);    

    // 後続の処理のためにオプションの値を更新
    this.options = {
      ...this.options,
      zoomScale :scale
    };
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
    console.log('rout1');
    console.log('this.options.barHeight2', this.options.barHeight);

    // パラメータが変更された場合は再初期化
    if (needsReinit) {
      console.log('init実行');
      this.init();
      if (this.data) {
        console.log('render実行');
        this.render();
      }
    }
    console.log('rout2');
    console.log('this.options.barHeight3', this.options.barHeight);
    //後続の処理のためにオプションの値を更新
    if (options.unitSize !== null && options.unitSize !== undefined) {
      let originalUnitSize = this.calculateUnitSize(this.data) ;
      let unitSizeScale = options.unitSize / originalUnitSize;
      this.options.unitSizeScale = unitSizeScale;

      console.log('unitSizeScale', unitSizeScale);
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
      throw new Error("maxValue must be positive");
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
