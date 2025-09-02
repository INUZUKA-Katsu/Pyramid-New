// 横浜市の人口ピラミッド SVG描画エンジン ver1.3 2024.12.30
// 既存のpyramid.jsとの互換性を保ちながら、SVGによる柔軟な描画を実現

// 元の実装と同じunit_sizeの値を定義
const UNIT_SIZE_VALUES = {
  "age": 0.01082,
  "tsurumi": 0.1398,
  "kanagawa": 0.1672,
  "nishi": 0.4038,
  "naka": 0.27086,
  "minami": 0.1398,
  "konan": 0.1398,
  "hokubu": 0.1398,
  "midori": 0.1398,
  "tsuzuki": 0.1398,
  "sakae": 0.1398,
  "izumi": 0.1398,
  "seya": 0.1398,
  "asahi": 0.1398,
  "kohoku": 0.1398,
  "tsurumi4ku": 0.1398
};

class PyramidSVGRenderer {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = {
      width: 1108,
      height: 600,
      ageHeight: 6, // 各年齢の高さ
      maleColor: '#0066cc',
      femaleColor: '#cc0066',
      maleStrokeColor: '#004499',
      femaleStrokeColor: '#990044',
      backgroundColor: '#f5f5f5',
      gridColor: '#e0e0e0',
      textColor: '#333333',
      fontSize: 12,
      showGrid: true,
      showLabels: true,
      showNumbers: true,
      scaleMode: 'auto', // 'auto', 'fixed'
      maxWidth: 400, // 最大バー幅（ピクセル）
      ...options
    };
    
    this.svg = null;
    this.data = null;
    this.scale = 1;
    this.init();
  }

  init() {
    // 既存のコンテナをクリア
    this.container.innerHTML = '';
    
    // SVG要素を作成
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.options.width);
    this.svg.setAttribute('height', this.options.height);
    // viewBoxは固定（1108x600）で、transformで拡大縮小
    this.svg.setAttribute('viewBox', '0 0 1108 600');
    this.svg.style.backgroundColor = this.options.backgroundColor;
    
    // 背景を描画
    this.drawBackground();
    
    // 全要素をグループ化するためのg要素を作成
    this.sceneGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.sceneGroup.setAttribute('id', 'pyramid-scene');
    this.sceneGroup.setAttribute('transform', 'translate(0,0) scale(1)');
    this.svg.appendChild(this.sceneGroup);
    
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
  }

  drawBackground() {
    // 背景の矩形（固定座標1108x600）
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', 0);
    bg.setAttribute('y', 0);
    bg.setAttribute('width', 1108);
    bg.setAttribute('height', 600);
    bg.setAttribute('fill', this.options.backgroundColor);
    this.svg.appendChild(bg);
  }

  drawGrid() {
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'grid');
    
    // 固定座標（1108x600）を使用
    const viewBoxWidth = 1108;
    const viewBoxHeight = 600;
    
    // 男女の各棒の起点に縦線を引く
    const leftStartLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftStartLine.setAttribute('x1', viewBoxWidth / 2 - 10);
    leftStartLine.setAttribute('y1', 0);
    leftStartLine.setAttribute('x2', viewBoxWidth / 2 - 10);
    leftStartLine.setAttribute('y2', viewBoxHeight);
    leftStartLine.setAttribute('stroke', '#ccc');
    leftStartLine.setAttribute('stroke-width', '1');
    gridGroup.appendChild(leftStartLine);
    
    const rightStartLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightStartLine.setAttribute('x1', viewBoxWidth / 2 + 10);
    rightStartLine.setAttribute('y1', 0);
    rightStartLine.setAttribute('x2', viewBoxWidth / 2 + 10);
    rightStartLine.setAttribute('y2', viewBoxHeight);
    rightStartLine.setAttribute('stroke', '#ccc');
    rightStartLine.setAttribute('stroke-width', '1');
    gridGroup.appendChild(rightStartLine);
    
    // 横線（各歳の境界線）
    for (let age = 0; age <= 100; age++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', viewBoxHeight - (age * this.options.ageHeight));
      line.setAttribute('x2', viewBoxWidth);
      line.setAttribute('y2', viewBoxHeight - (age * this.options.ageHeight));
      // 5歳ごとに線を少し太くする
      if (age % 5 === 0) {
        line.setAttribute('stroke', '#ddd');
        line.setAttribute('stroke-width', '2');
      } else {
        line.setAttribute('stroke', '#eee');
        line.setAttribute('stroke-width', '1');
      }
      
      gridGroup.appendChild(line);
    }
    
    this.sceneGroup.appendChild(gridGroup);
  }

  drawAgeLabels() {
    const ageLabelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ageLabelGroup.setAttribute('class', 'age-labels');
    
    // 固定座標（1108x600）を使用
    const viewBoxWidth = 1108;
    const viewBoxHeight = 600;
    
    // 5歳ごとに年齢ラベルを表示（0歳から100歳まで）
    for (let age = 0; age <= 100; age += 5) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = age;
      label.setAttribute('x', viewBoxWidth / 2);
      label.setAttribute('y', viewBoxHeight - (age * this.options.ageHeight) - this.options.ageHeight / 2);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#666');
      label.setAttribute('font-weight', 'bold');
      
      ageLabelGroup.appendChild(label);
    }
    
    this.sceneGroup.appendChild(ageLabelGroup);
  }

  drawSpecialAgeLines() {
    const specialLineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    specialLineGroup.setAttribute('class', 'special-age-lines');
    
    // 固定座標（1108x600）を使用
    const viewBoxWidth = 1108;
    const viewBoxHeight = 600;
    
    // 15歳、65歳、75歳の特別な横線とラベル
    const specialAges = [15, 65, 75];
    const ageLabels = ['15歳', '65歳', '75歳'];
    
    specialAges.forEach((age, index) => {
      const y = viewBoxHeight - (age * this.options.ageHeight);
      
      // 枠一杯の横線
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', viewBoxWidth);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#999');
      line.setAttribute('stroke-width', '3');
      
      // 年齢ラベル
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = ageLabels[index];
      label.setAttribute('x', viewBoxWidth - 10);
      label.setAttribute('y', y - 5);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'bottom');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#666');
      label.setAttribute('font-weight', 'bold');
      
      specialLineGroup.appendChild(line);
      specialLineGroup.appendChild(label);
    });
    
    this.sceneGroup.appendChild(specialLineGroup);
  }



  drawGenderLabels() {
    // 男性ラベル
    const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    maleLabel.setAttribute('x', 1108 / 2 - 50);
    maleLabel.setAttribute('y', 20);
    maleLabel.setAttribute('text-anchor', 'middle');
    maleLabel.setAttribute('fill', this.options.maleColor);
    maleLabel.setAttribute('font-size', this.options.fontSize + 2);
    maleLabel.setAttribute('font-weight', 'bold');
    maleLabel.setAttribute('class', 'gender-label');
    maleLabel.textContent = '男性';
    this.sceneGroup.appendChild(maleLabel);
    
    // 女性ラベル
    const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    femaleLabel.setAttribute('x', 1108 / 2 + 50);
    femaleLabel.setAttribute('y', 20);
    femaleLabel.setAttribute('text-anchor', 'middle');
    femaleLabel.setAttribute('fill', this.options.femaleColor);
    femaleLabel.setAttribute('font-size', this.options.fontSize + 2);
    femaleLabel.setAttribute('font-weight', 'bold');
    femaleLabel.setAttribute('class', 'gender-label');
    femaleLabel.textContent = '女性';
    this.sceneGroup.appendChild(femaleLabel);
  }

  calculateScale(data, unitSize = null, margin = 15) {
    if (unitSize !== null && unitSize !== undefined) {
      this.scale = unitSize;
      return;
    }
    
    if (this.options.scaleMode === 'fixed') {
      this.scale = this.options.maxWidth / this.getMaxPopulation(data);
    } else {
      // 自動モード: 現在のサイズに基づいてスケールを計算
      // 元の比率（400/1108）を維持しつつ、現在の幅に適用
      const originalRatio = 400 / 1108;
      const currentMaxWidth = this.options.width * originalRatio;
      const totalPopulation = this.getTotalPopulation(data);
      if (totalPopulation > 0) {
        this.scale = (currentMaxWidth * 101) / totalPopulation;
      } else {
        this.scale = 0;
      }
    }
    
    // デバッグ用: スケール値をコンソールに出力
    console.log(`calculateScale: width=${this.options.width}, currentMaxWidth=${this.options.width * (400/1108)}, scale=${this.scale}`);
  }

  getMaxPopulation(data) {
    let max = 0;
    data.forEach(item => {
      if (item[2] && item[3]) {
        const male = parseInt(item[2].replace(/,/g, '')) || 0;
        const female = parseInt(item[3].replace(/,/g, '')) || 0;
        max = Math.max(max, male, female);
      }
    });
    return max;
  }

  getTotalPopulation(data) {
    let total = 0;
    data.forEach(item => {
      if (item[2] && item[3]) {
        const male = parseInt(item[2].replace(/,/g, '')) || 0;
        const female = parseInt(item[3].replace(/,/g, '')) || 0;
        total += male + female;
      }
    });
    return total;
  }

  calculateBarWidth(count, unitSize = null) {
    const scale = unitSize || this.scale;
    return Math.max(1, count * scale); // 最小幅1ピクセル
  }

  clearBars() {
    // 既存のバー要素を削除
    const bars = this.svg.querySelectorAll('.age-bar, .male-bar, .female-bar, .population-label, .male-bottom-line, .female-bottom-line');
    bars.forEach(bar => bar.remove());
  }

  drawAgeBar(age, maleCount, femaleCount, unitSize = null, barHeight = null) {
    // barHeightが指定されている場合は使用、そうでなければオプションの値を使用
    const currentBarHeight = barHeight !== null && barHeight !== undefined ? barHeight : this.options.ageHeight;
    
    // 固定座標（1108x600）を使用
    const viewBoxWidth = 1108;
    const viewBoxHeight = 600;
    
    // 年齢の位置を計算（0歳が下、100歳が上）
    const agePosition = viewBoxHeight - (age * currentBarHeight) - currentBarHeight;
    
    // 男性の棒を描画（左側）- 中央線から10px離す
    if (maleCount > 0) {
      const maleWidth = this.calculateBarWidth(maleCount, unitSize);
      const maleBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      maleBar.setAttribute('x', viewBoxWidth / 2 - maleWidth - 10); // 中央線から10px離す
      maleBar.setAttribute('y', agePosition);
      maleBar.setAttribute('width', maleWidth);
      maleBar.setAttribute('height', currentBarHeight);
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
        bottomLine.setAttribute('y1', agePosition + currentBarHeight);
        bottomLine.setAttribute('x2', viewBoxWidth / 2 - 10);
        bottomLine.setAttribute('y2', agePosition + currentBarHeight);
        bottomLine.setAttribute('stroke', this.options.maleStrokeColor);
        bottomLine.setAttribute('stroke-width', '3');
        bottomLine.setAttribute('class', 'male-bottom-line');
        this.sceneGroup.appendChild(bottomLine);
      }
      
      // 人数ラベル
      if (this.options.showNumbers && maleWidth > 30) {
        const maleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        maleLabel.setAttribute('x', viewBoxWidth / 2 - maleWidth - 15); // 棒の左端から5px左
        maleLabel.setAttribute('y', agePosition + currentBarHeight / 2);
        maleLabel.setAttribute('text-anchor', 'end');
        maleLabel.setAttribute('fill', this.options.textColor);
        maleLabel.setAttribute('font-size', this.options.fontSize - 3);
        maleLabel.setAttribute('class', 'population-label');
        maleLabel.textContent = maleCount.toLocaleString();
        maleLabel.setAttribute('dominant-baseline', 'middle');
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
      femaleBar.setAttribute('height', currentBarHeight);
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
        bottomLine.setAttribute('y1', agePosition + currentBarHeight);
        bottomLine.setAttribute('x2', viewBoxWidth / 2 + femaleWidth + 10);
        bottomLine.setAttribute('y2', agePosition + currentBarHeight);
        bottomLine.setAttribute('stroke', this.options.femaleStrokeColor);
        bottomLine.setAttribute('stroke-width', '3');
        bottomLine.setAttribute('class', 'female-bottom-line');
        this.sceneGroup.appendChild(bottomLine);
      }
      
      // 人数ラベル
      if (this.options.showNumbers && femaleWidth > 30) {
        const femaleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        femaleLabel.setAttribute('x', viewBoxWidth / 2 + femaleWidth + 15); // 棒の右端から5px右
        femaleLabel.setAttribute('y', agePosition + currentBarHeight / 2);
        femaleLabel.setAttribute('text-anchor', 'start');
        femaleLabel.setAttribute('fill', this.options.textColor);
        femaleLabel.setAttribute('font-size', this.options.fontSize - 3);
        femaleLabel.setAttribute('class', 'population-label');
        femaleLabel.textContent = femaleCount.toLocaleString();
        femaleLabel.setAttribute('dominant-baseline', 'middle');
        this.sceneGroup.appendChild(femaleLabel);
      }
    }
  }

  render(data, unitSize = null, barHeight = null) {
    this.data = data;
    
    // 既存のバー要素をクリア
    this.clearBars();
    
    // スケールを計算
    this.calculateScale(data, unitSize);
    
    // barHeightが指定されている場合はオプションを更新
    if (barHeight !== null && barHeight !== undefined) {
      this.options.ageHeight = barHeight;
    }
    
    // データから年齢別人口のマップを作成
    const populationMap = new Map();
    data.forEach((item, index) => {
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
      this.drawAgeBar(age, population.male, population.female, unitSize, barHeight);
    }
  }

  // オプションの動的変更
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.init();
    if (this.data) {
      this.render(this.data);
    }
  }

  // スケールの動的変更
  setScale(scale) {
    this.scale = scale;
    if (this.data) {
      this.render(this.data, scale);
    }
  }

  // ピラミッドのサイズ調整（ハイブリッド方式）
  resize(options = {}) {
    if (options.width && options.height) {
      // 方式1: 全体サイズ指定
      this.resizeByDimensions(options.width, options.height);
    } else if (options.unitSize || options.barHeight) {
      // 方式2: 個別パラメータ指定
      this.resizeByParameters(options.unitSize, options.barHeight);
    } else if (typeof options === 'number' && typeof arguments[1] === 'number') {
      // 後方互換性: resize(width, height) の呼び出し
      this.resizeByDimensions(options, arguments[1]);
    }
  }

  // 方式1: 全体サイズ指定によるリサイズ
  resizeByDimensions(width, height) {
    // 新しいサイズを設定
    this.options.width = width;
    this.options.height = height;
    
    // SVGのサイズを変更
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    
    // viewBoxは固定（1108x600）のまま
    // transform属性で拡大縮小を行う
    const scaleX = width / 1108;
    const scaleY = height / 600;
    const scale = Math.min(scaleX, scaleY); // 相似形を保つ
    
    // 中央を基準とした拡大縮小
    const translateX = (width - 1108 * scale) / 2;
    const translateY = (height - 600 * scale) / 2;
    
    // sceneGroupのtransform属性を更新
    this.sceneGroup.setAttribute('transform', `translate(${translateX},${translateY}) scale(${scale})`);
    
    // デバッグ用
    console.log(`resizeByDimensions: width=${width}, height=${height}, scale=${scale}, translate=(${translateX},${translateY})`);
  }

  // 方式2: 個別パラメータ指定によるリサイズ
  resizeByParameters(unitSize = null, barHeight = null) {
    let needsReinit = false;
    
    // unitSizeが指定されている場合
    if (unitSize !== null && unitSize !== undefined) {
      this.options.unitSize = unitSize;
      needsReinit = true;
    }
    
    // barHeightが指定されている場合
    if (barHeight !== null && barHeight !== undefined) {
      this.options.ageHeight = barHeight;
      needsReinit = true;
    }
    
    // パラメータが変更された場合は再初期化
    if (needsReinit) {
      this.init();
      if (this.data) {
        this.render(this.data, this.options.unitSize, this.options.ageHeight);
      }
    }
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

// 既存のpyramid.jsとの互換性を保つための関数
function createSVGPyramid(containerId, pyramidData, unitSize, options = {}) {
  return PyramidSVGRenderer.createFromExisting(containerId, pyramidData, unitSize, options);
}

// 既存のchange_pyramid関数を拡張してSVGレンダラーを使用可能にする
function change_pyramid_svg(pyramidData, unit_size, containerId = 'pyramid', options = {}) {
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
    svgContainer.style.height = '600px';
    existingContainer.parentNode.insertBefore(svgContainer, existingContainer.nextSibling);
  }
  
  // SVGレンダラーでピラミッドを描画
  const renderer = createSVGPyramid(svgContainerId, pyramidData, unit_size, options);
  
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
function change_pyramid(pyramidData, unit_size) {
  // SVGレンダラーを使用するかどうかの判定
  const useSVG = window.useSVGRenderer === true;
  
  if (useSVG) {
    return change_pyramid_svg(pyramidData, unit_size);
  } else {
    // 既存のHTMLベースの描画処理
    return change_pyramid_original(pyramidData, unit_size);
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
