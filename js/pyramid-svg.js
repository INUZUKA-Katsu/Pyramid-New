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
    this.data = hashData.kakusai_betsu;
    //console.log('this.data', this.data);
    this.options.unitSize = this.calculateUnitSize(this.data);
    console.log('init this.options.unitSize', this.options.unitSize);
    this.options.barHeight = this.options.height / 103; // 2/103は上余白
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
    
    // 男女ラベルを描画
    this.drawGenderLabels();
    
    this.container.appendChild(this.svg);

    // ズームを適用
    if (this.options.zoomScale != 1) {
      this.resizeByScale(this.options.zoomScale);
    }
  }

  drawBackground() {
    // 背景の矩形（動的座標）
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', 0);
    bg.setAttribute('y', 0);
    bg.setAttribute('width', 1108);
    bg.setAttribute('height', 600);
    bg.setAttribute('fill', this.options.backgroundColor);
    this.sceneGroup.appendChild(bg);
  }

  drawGrid() {
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'grid');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height;
    
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
    
    this.sceneGroup.appendChild(gridGroup);
  }

  drawAgeLabels() {
    const ageLabelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ageLabelGroup.setAttribute('class', 'age-labels');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height;
    
    // 5歳ごとに年齢ラベルを表示（0歳から100歳まで）
    for (let age = 0; age <= 100; age += 5) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = age;
      label.setAttribute('x', viewBoxWidth / 2);
      label.setAttribute('y', viewBoxHeight - (age * this.options.barHeight) - this.options.barHeight / 2);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#6c757d');
      label.setAttribute('font-weight', 'bold');
      
      ageLabelGroup.appendChild(label);
    }
    
    this.sceneGroup.appendChild(ageLabelGroup);
  }

  drawSpecialAgeLines() {
    const specialLineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    specialLineGroup.setAttribute('class', 'special-age-lines');
    
    // 動的座標を使用
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height;
    
    // 15歳、65歳、75歳の特別な横線とラベル
    const specialAges = [15, 65, 75];
    const ageLabels = ['15歳', '65歳', '75歳'];
    const x1 = (viewBoxWidth / 2) - (this.options.unitSize * this.getMaxPopulation(this.data) + 100);
    const x2 = (viewBoxWidth / 2) + (this.options.unitSize * this.getMaxPopulation(this.data) + 100);

    specialAges.forEach((age, index) => {
      const y = viewBoxHeight - (age * this.options.barHeight);
    
      // 枠一杯の横線
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
      label.setAttribute('x', x2 - 10);
      label.setAttribute('y', y - 5);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'bottom');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#6c757d');
      label.setAttribute('font-weight', 'bold');
      
      specialLineGroup.appendChild(line);
      specialLineGroup.appendChild(label);
    });
    
    this.sceneGroup.appendChild(specialLineGroup);
  }

  drawGenderLabels() {
    let cx = this.options.width / 2;
    let w = this.options.unitSize * this.getMaxPopulation(this.data);
    let h = this.options.height;
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
    this.sceneGroup.appendChild(maleLabel);
    
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
    this.sceneGroup.appendChild(femaleLabel);
  }

  // ユニットサイズの初期値を求める
  calculateUnitSize(data) {
    const totalPopulation = this.getTotalPopulation(data);
    const pyramidHeight = this.options.height;
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
    data.forEach(item => {
      if (item[0].match(/^[0-9]+(以上)?$/)) {
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
    // 既存のバー要素を削除
    const bars = this.svg.querySelectorAll('.age-bar, .male-bar, .female-bar, .population-label, .male-bottom-line, .female-bottom-line');
    bars.forEach(bar => bar.remove());
  }

  drawAgeBar(age, maleCount, femaleCount,unitSize,barHeight) {

    // 現在のviewBoxのサイズの棒の使用（動的に計算）
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height;
    
    // 現在のviewBoxのサイズを使用（動的に計算）
    const viewBoxWidth = this.options.width;
    const viewBoxHeight = this.options.height;
    
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
      
      this.sceneGroup.appendChild(maleBar);
      
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
        this.sceneGroup.appendChild(bottomLine);
      }
      
      // 人数ラベル
      if (this.options.showNumbers && maleWidth > 30) {
        const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        maleLabel.setAttribute('x', viewBoxWidth / 2 - maleWidth - 15); // 棒の左端から5px左
        maleLabel.setAttribute('y', agePosition + barHeight / 2);
        maleLabel.setAttribute('text-anchor', 'end');
        maleLabel.setAttribute('fill', this.options.textColor);
        maleLabel.setAttribute('font-size', this.options.fontSize - 3);
        maleLabel.setAttribute('class', 'population-label');
        maleLabel.textContent = maleCount.toLocaleString();
        this.sceneGroup.appendChild(maleLabel);
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
      
      this.sceneGroup.appendChild(femaleBar);
      
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
        this.sceneGroup.appendChild(bottomLine);
      }
      
      // 人数ラベル
      if (this.options.showNumbers && femaleWidth > 30) {
        const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        femaleLabel.setAttribute('x', viewBoxWidth / 2 + femaleWidth + 15); // 棒の右端から5px右
        femaleLabel.setAttribute('y', agePosition + barHeight / 2);
        femaleLabel.setAttribute('text-anchor', 'start');
        femaleLabel.setAttribute('fill', this.options.textColor);
        femaleLabel.setAttribute('font-size', this.options.fontSize - 3);
        femaleLabel.setAttribute('class', 'population-label');
        femaleLabel.textContent = femaleCount.toLocaleString();
        this.sceneGroup.appendChild(femaleLabel);
      }
    }
  }

  render() {

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
    
    // 0歳から100歳までの全ての年齢のバーを描画
    for (let age = 0; age <= 100; age++) {
      const population = populationMap.get(age) || { male: 0, female: 0 };
      this.drawAgeBar(age, population.male, population.female,unitSize,barHeight);
    }
  }

  // データを差し替えたときに再描画するメソッド
  updateData(newData) {
    this.data = newData.kakusai_betsu;
  
    let z = this.options.zoomScale;
  
    // 新しいデータに基づいて再描画
    let originalUnitSize = this.calculateUnitSize(this.data);
    let scale = this.options.unitSizeScale;
    this.options.unitSize = originalUnitSize * scale;
    console.log('updateData this.options.unitSize', this.options.unitSize);
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
    
    let cx = baseBox.x + baseBox.width / 2;
    let cy = baseBox.y + baseBox.height / 2;

    // svgのviewBox属性を更新
    this.svg.setAttribute('viewBox', `${cx - w/2} ${cy - h/2} ${w} ${h}`);    

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
      let originalBarHeight = this.options.height / 103 ;
      let barHeightScale = options.barHeight / originalBarHeight;
      this.options.barHeightScale = barHeightScale;

      console.log('barHeightScale', barHeightScale);
      console.log('this.options.barHeight4', this.options.barHeight);
    }

    console.log('rout4');
    console.log('this.options.unitSizeScale', this.options.unitSizeScale);
    console.log('this.options.barHeightScale', this.options.barHeightScale);
  }

  // データの取得（既存コードとの互換性）
  getPopulationData() {
    const result = {};
    this.data.forEach((item, index) => {
      if (index < 5) return;
      const age = item[0];
      const male = item[2];
      const female = item[3];
      
      if (age === '総数' || age === '合計' || age === '年齢不詳' || !male || !female) {
        return;
      }
      
      result[age] = {
        male: male.replace(/,/g, ''),
        female: female.replace(/,/g, '')
      };
    });
    return result;
  }

  // スクリーンショット用のSVGデータ取得
  getSVGData() {
    return this.svg.outerHTML;
  }

  // 既存のchange_pyramid関数との互換性を保つためのラッパー
  static createFromExisting(containerId, data, unitSize = null, options = {}) {
    const renderer = new PyramidSVGRenderer(containerId, options);
    renderer.render(data, unitSize);
    return renderer;
  }

}
//*************class PyramidSVGRenderer はここまで*************



// 既存のpyramid.jsとの互換性を保つための関数
function createSVGPyramid(containerId, pyramidData, unitSize, options = {}) {
  return PyramidSVGRenderer.createFromExisting(containerId, pyramidData, unitSize, options);
}

// 既存のchange_pyramid関数を拡張してSVGレンダラーを使用可能にする
function change_pyramid_svg(pyramidData, unitSize, containerId = 'pyramid', options = {}) {
  // 既存のHTMLベースの描画を無効化
  const existingContainer = document.getElementById(containerId);
  if (existingContainer) {
    existingContainer.style.display = 'none';
  }
  
  // SVGコンテナを作成（既存のコンテナの隣に）
  const svgContainerId = containerId + '_svg';
  let svgContainer = document.getElementById(svgContainerId);
  if (!svgContainer) {
    svgContainer = document.createElement('div');
    svgContainer.id = svgContainerId;
    svgContainer.style.width = '100%';
    svgContainer.style.height = (options.height || 600) + 'px';
    existingContainer.parentNode.insertBefore(svgContainer, existingContainer.nextSibling);
  }
  
  // SVGレンダラーでピラミッドを描画
  const renderer = createSVGPyramid(svgContainerId, pyramidData, unitSize, options);
  
  // 既存のデータ処理ロジックを維持
  if (pyramidData instanceof Array) {
    var shiku = pyramidData[1];
    var kijunbi = pyramidData[2];
    var source = pyramidData[3];
    var sosu = pyramidData[4][1];
    var male = pyramidData[4][2];
    var female = pyramidData[4][3];
    pyramidData.splice(0, 5);
    var kakusaiData = pyramidData;
  } else {
    var shiku = pyramidData["shiku"];
    var not_exist = pyramidData["not_exist"];
    var kijunbi = pyramidData["kijunbi"];
    var source = pyramidData["source_url"];
    var sosu = pyramidData["kakusai_betsu"][0][1];
    var male = pyramidData["kakusai_betsu"][0][2];
    var female = pyramidData["kakusai_betsu"][0][3];
    var kakusaiData = pyramidData["kakusai_betsu"];
    displey_hitoku_comment(pyramidData["hitoku"]);
  }
  
  // 既存のタイトル更新処理を維持
  var nengetsu = get_selected_nengetsu();
  if (nengetsu == undefined) { nengetsu = $nengetsu; }
  if (nengetsu == "9501" && (shiku == "港北区" || shiku == "緑区" || shiku == "都筑区" || shiku == "青葉区")) {
    shiku = "港北・緑・青葉・都筑４区";
  }
  
  var h2 = shiku + '<span class="inline-block">' + kijunbi + '</span>';
  h2 = h2.replace('将来推計人口', '<span class="small">将来推計人口</span>');
  h2 = h2.replace(/10月(1|１)日(現在)?/, '10月1日現在<span class="small">(国勢調査結果)</span>');
  
  if (not_exist != undefined && not_exist != "") {
    if (not_exist == "青葉区" || not_exist == "都筑区") {
      comment = "はこのころまだありませんでした.";
    } else {
      comment = "のデータはありません.住居表示等で新しい町名ができる前と思われます.";
    }
    h2 = h2 + "<br><span id='red'>(" + not_exist + comment + ")</span>";
  }
  
  h2 = change_seireki_main(h2);
  document.getElementById("h2").innerHTML = h2;
  document.getElementById("sosu").innerHTML = plus_comma(sosu);
  document.getElementById("male").innerHTML = plus_comma(male);
  document.getElementById("female").innerHTML = plus_comma(female);
  document.getElementById("source").innerHTML = source_str(shiku, source);
  
  // 既存の処理を維持
  basic_data_position();
  save_last_pyramid();
  kubunDisplay();
  
  return renderer;
}


// 既存のchange_pyramid関数を拡張（オプション）
function change_pyramid(pyramidData, unitSize) {
  // SVGレンダラーを使用するかどうかの判定
  const useSVG = window.useSVGRenderer === true;
  
  if (useSVG) {
    return change_pyramid_svg(pyramidData, unitSize);
  } else {
    // 既存のHTMLベースの描画処理
    return change_pyramid_original(pyramidData, unitSize);
  }
}

// 既存のchange_pyramid関数を保存
const change_pyramid_original = window.change_pyramid;

// SVGレンダラーの使用を切り替える関数
function toggleSVGRenderer(useSVG = true) {
  window.useSVGRenderer = useSVG;
  
  // 現在表示中のピラミッドを再描画
  if (window.currentPyramidData) {
    change_pyramid(window.currentPyramidData, window.currentUnitSize);
  }
}

// ピラミッドのサイズを動的に変更する関数
function resizePyramid(width, height) {
  if (window.currentSVGRenderer) {
    window.currentSVGRenderer.resize(width, height);
  }
}

// スケールモードを変更する関数
function changeScaleMode(mode) {
  if (window.currentSVGRenderer) {
    window.currentSVGRenderer.updateOptions({ scaleMode: mode });
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PyramidSVGRenderer, createSVGPyramid, change_pyramid_svg };
}
