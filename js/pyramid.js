// 横浜市の人口ピラミッド ver2.12 2020.12.30  INUZUKA Katsu

//  主要イベント

var $KakusaiObject = {}; //グローバル変数 {100:{male:xx,female:xx},99:{male:xx,female:xx}・・・
var $nengetsu = 0;
var $hitoku = false;
var $optionsCache = {
  shiku: null,
  cho: null,
  lastUpdate: null,
  cacheExpiry: 5 * 60 * 1000, // 5分間のキャッシュ
};

//最初にページを読み込んだときの処理
function on_page_load() {
  console.log("on_page_load");
  var lStorage = get_browser_usage_of_localStorage();
  //************初期設定1****************
  //ブラウザの違いによるCSSの調整を行う.
  safari_style();
  console.log("safari_style");
  //スクリーンショットボタンの表示調整
  modify_screen_shot_button();
  console.log("modify_screen_shot_button");
  //フッターの位置を調整する.
  //adjustFooterPosition();
  //************初期設定1ここまで**********

  redisplay_pyramid();
  console.log("redisplay_pyramid");
  //************初期設定2****************
  //端末へのデータ保存のチェックボックス表示を各人の既定値にする.
  if (lStorage == "use") {
    localStorage_defautSetting();
  }
  console.log("localStorage_defautSetting");
  //市区・町丁の年月日セレクトボックスをローカルに保存し、HTMLも更新する.
  all_option_renew();
  console.log("all_option_renew");
  //市区の年月日セレクトボックスを更新する.
  //shiku_option();
  //町丁の年月日セレクトボックスを更新する.
  //cho_option();
  //************初期設定2ここまで**********

  $(function () {
    if (lStorage == "use") {
      $("#save").on({
        mouseenter: function () {
          sethover = setTimeout(function () {
            localStorage_list();
          }, 3000);
        },
        mouseleave: function () {
          clearTimeout(sethover);
        },
      });
    }
  });
  console.log("previous kubunDisplay");
  //年齢３区分別の人口構成比を表示
  kubunDisplay();
  console.log("after kubunDisplay");
}
//最初にページを読み込んだときの処理(ここまで)

//市区セレクトボックスを変更したときの処理
function change_shiku() {
  console.log("change_shiku開始");
  if (get_pyramid_mode() == "cho") {
    set_another_nengetsu("shiku");
  }
  $nengetsu = get_selected_nengetsu();

  console.log("change_shiku $nengetsu", $nengetsu);

  if ($nengetsu.match(/年/)) {
    $nengetsu = "9301";
    document.getElementById("shiku_year").value = $nengetsu;
  } else if ($nengetsu.match(/^\d{6}$/) && Number($nengetsu) < 199301) {
    $nengetsu = "199301";
    document.getElementById("shiku_year").value = $nengetsu;
  }
  //alert("change_shiku");
  change_shiku_option();
  //alert("change_shiku_option");
  change_display("shiku", $nengetsu);
}

//町丁別人口ピラミッドボタンを押したときの処理
function cho_pyramid_button() {
  scrollTo(0, 0);
  if (get_pyramid_mode() == "cho") {
    $nengetsu = get_selected_nengetsu("cho");
  } else {
    $nengetsu = set_another_nengetsu("cho");
  }
  change_display("cho", $nengetsu);
}

//区人口ピラミッドボタンを押したときの処理
function ku_pyramid_button() {
  scrollTo(0, 0);
  if (get_pyramid_mode() == "shiku") {
    return;
  }
  $nengetsu = set_another_nengetsu("shiku");
  change_display("shiku_not_refresh_cholist", $nengetsu);
}

//市区用の年月日セレクトボックスを変更したときの処理
function change_shiku_year() {
  set_comment("off");
  shiku_pyramid();
}

//町丁別用の年月日セレクトボックスを変更したときの処理
function change_cho_year() {
  set_comment("off");
  cho_pyramid();
}

//端末データ保存のラジオボタンを変更したときの処理
function localStorage_Setting() {
  //localStorage_list();
  if (document.getElementById("save").checked == true) {
    var opt = "save";
  } else {
    var opt = "clear";
  }
  var strTitle = "データ保存の設定";
  var strComment = get_comment(opt);

  $("#dialog").text(strComment);
  $("#dialog").dialog({
    modal: true,
    title: strTitle,
    buttons: {
      OK: function () {
        $(this).dialog("close");
        data_save_setting(opt);
      },
      キャンセル: function () {
        $(this).dialog("close");
        localStorage_defautSetting();
      },
    },
  });
}

//人数表示のラジオボタンを変更したときの処理
function showNinzu_Setting() {
  if (document.getElementById("show").checked == true) {
    var opt = ""; //"inline" ;
    var val = "show";
  } else {
    var opt = "none";
    var val = "hidden";
  }
  for (var i = 0; i <= 100; i++) {
    document.getElementById("mn" + i).style.display = opt;
    document.getElementById("fn" + i).style.display = opt;
  }
  //safari_style();
  show_ninzu_setting(val);
}

//動画ボタンを押したときの処理
function ani_mation() {
  // 従来の動画機能を実行
  console.log('従来の動画機能を開始');
  legacy_animation();
}

// 既存のアニメーション実装（フォールバック用）
function legacy_animation() {
  var pyramode = get_pyramid_mode();
  if (pyramode == "shiku") {
    var op = document
      .getElementsByName("shiku_year")[0]
      .getElementsByTagName("option");
    var disp = "shiku_not_refresh_cholist";
  } else if (pyramode == "cho") {
    var op = document
      .getElementsByName("cho_year")[0]
      .getElementsByTagName("option");
    var disp = "cho";
  }
  if (pyramode == "shiku") {
    var unit_size = {
      age: 0.01082,
      tsurumi: 0.1398,
      kanagawa: 0.1672,
      nishi: 0.4038,
      naka: 0.27086,
      minami: 0.2072,
      konan: 0.1888,
      hodogaya: 0.19563,
      asahi: 0.16439,
      isogo: 0.24262,
      kohoku: 0.11585,
      midori: 0.22294,
      aoba: 0.13037,
      kanazawa: 0.20197,
      tsuzuki: 0.1912,
      totsuka: 0.14584,
      sakae: 0.3342,
      izumi: 0.26408,
      seya: 0.327,
    };
    var shiku = get_selected_shiku();
    set_UnitSize(unit_size[shiku]);
  }
  doLoop(op.length, 1, op, disp);
}
function doLoop(maxCount, i, op, disp) {
  if (get_pyramid_mode() == "shiku") {
    var unit_size = get_UnitSize();
  }
  if (i <= maxCount) {
    op[op.length - i].selected = true;
    $nengetsu = op[op.length - i].value;
    change_display(disp, $nengetsu, unit_size);
    setTimeout(function () {
      doLoop(maxCount, ++i, op, disp);
    }, 800);
  }
}

//########################################################
//###　主要な処理  #########################################
//########################################################

//年月日セレクトボックスの初期設定
function all_option_renew() {
  ajax("all_options");
}
//キャッシュを使用して年月日セレクトボックスの内容を取得する.
function getOptionsWithCache(type) {
  var now = Date.now();

  // メモリキャッシュが有効な場合はそれを使用
  if (
    $optionsCache[type] &&
    $optionsCache.lastUpdate &&
    now - $optionsCache.lastUpdate < $optionsCache.cacheExpiry
  ) {
    return $optionsCache[type];
  }

  // LocalStorageから取得を試行
  var cached = localStorage_get(type + "_option");
  if (cached) {
    $optionsCache[type] = cached;
    $optionsCache.lastUpdate = now;
    return cached;
  }

  // キャッシュがない場合はサーバーから取得
  ajax("all_options", null, 1);
  return null; // 非同期で取得される
}
//町丁用の年月日セレクトボックスを最新の内容に更新する.(初期設定)
//function cho_option(){
//  ajax("cho_option");
//}
//端末へのデータ保存と人数の設定をlocalStorageから読み込みラジオボタンを各自の既定値にセットする
function localStorage_defautSetting() {
  //端末へのデータ保存の設定: 保存しないで固定
  document.getElementById("save").checked = false;
  document.getElementById("clear").checked = true;
}
//ピラミッドを画面表示する.
function change_display(pyramode, nengetsu, unit_size) {
  set_comment("off");
  switch (pyramode) {
    case "shiku":
      set_pyramid_mode("shiku");
      shiku_pyramid(nengetsu, unit_size);
      cho_list(); //町丁名リストの表示/非表示
      change_cmbbox_display("shiku"); //年月選択セレクトボックスの市区用と町丁別用の表示切り替え
      break;
    case "shiku_not_refresh_cholist":
      set_pyramid_mode("shiku");
      shiku_pyramid(nengetsu, unit_size);
      change_cmbbox_display("shiku");
      break;
    case "cho":
      set_pyramid_mode("cho");
      //町丁別ピラミッド作成
      if (cho_pyramid(nengetsu, unit_size) == false) {
        return;
      }
      change_cmbbox_display("cho");
  }
}
//市区ピラミッドを作成する.
function shiku_pyramid(nengetsu, unit_size) {
  myFunc()
  //ローカルデータがあればローカルデータで描画する.
  //console.log("step1");
  //console.log(nengetsu); //市区を変更したときは、undefined

  //テストのため一時的にコメント化
  var ans ; //= escape_ajax("shiku_json", nengetsu, unit_size);
  //console.log("step2");
  if (ans === false || ans == undefined) {
    //ローカルデータが存在しないときはサーバから取得して描画する.
    //console.log("step3");
    ajax("shiku_json", nengetsu, 1, unit_size);
  }
}
//町丁別ピラミッドを作成する.
function cho_pyramid(nengetsu, unit_size) {
  //alert("cho_pyramid => "+nengetsu);
  var checked = get_selected_cho();
  //町丁が選択されていないときはメッセージを表示して終了.
  if (checked == null) {
    return false;
  }
  //ローカルデータがあればローカルデータで描画する.
  var ans = escape_ajax("cho_csv", nengetsu, unit_size);
  if (ans === false) {
    //ローカルデータが存在しないときはサーバから取得して描画する.
    ajax("cho_json", nengetsu, 1, unit_size);
  }
  adjust_title_size(checked.join(","));
}
//ローカルデータを読み出して描画処理する.（ピラミッドのみ？町丁名一覧は？）
//mode: shiku_json, cho_json, cho_csv, cho_list
function escape_ajax(mode, nengetsu, unit_size) {
  var key = isLocalData(mode, nengetsu);
  if (key != false) {
    //console.log("step1.5-1");
    var response = localStorage_get(key);
    if (mode == "cho_csv" && response.substr(0, 2) != "町名") {
      response = JSON.parse(response).csv;
    }
    //console.log("step1.5-1-2");
    //console.log(response);
    modify_html(response, mode, nengetsu, unit_size);
    return true;
  } else {
    //console.log("step1.5-2");
    return false;
  }
}
//サーバからデータを取得して描画処理する.
//mode: shiku_json, cho_json, syorai_json, cho_csv, cho_csv_for_save, all_option, shiku_option, cho_list
function ajax(mode, nengetsu, i, unit_size) {
  //console.log("ajax start");
  //console.log(nengetsu);
  if (i === undefined) {
    i = 1;
  }
  //if (isOnline != true){
  //  jAlert("インターネット接続してません.","インターネットに接続していないためデータを読み込めません.");
  //  return;
  //}
  var xmlHttp = null;
  if (window.XMLHttpRequest) {
    xmlHttp = new XMLHttpRequest();
  } else {
    //IE6とIE7の場合
    if (windows.ActiveXObject) {
      xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
    } else {
      xmlHttp = null;
    }
  }
  if (null == xmlHttp) {
    // 初期化失敗時
    return;
  }
  //タイムアウトの設定（5回試行する.）
  var timerId = window.setTimeout(function () {
    xmlHttp.abort();
    time_stamp();
    if (i < 5) {
      i++;
      ajax(mode, nengetsu, i);
    } else {
      set_comment("on", "データを読み込めませんでした。", 1000);
    }
  }, 5000);
  //応答時の処理定義
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
      //応答成功時、タイトルとピラミッドを書き換え
      window.clearTimeout(timerId);
      set_comment("off");
      var response = xmlHttp.responseText;
      //s=mode+"の戻り値\n"+response;
      //alert(s);

      //レスポンスデータをHTMLに表示またはHTMLの要素に組み込む
      if (mode != "cho_csv_for_save") {
        modify_html(response, mode, nengetsu, unit_size);
        //alert("modify_htmlの戻り値："+String(unit_size));
      }

      //ローカルストレージにデータを保存
      if (isDataSaveMode() == true || mode == "all_options") {
        if (mode == "cho_json") {
          ajax("cho_csv_for_save", nengetsu);
        }
        if (mode == "cho_csv_for_save") {
          mode = "cho_csv";
        }
        responseData_save(response, mode, nengetsu);
      }
    }
  };
  var SendData = get_SendData(mode, nengetsu);
  xmlHttp.open("POST", "./PyramidAjax.cgi", true);
  xmlHttp.setRequestHeader("content-type", "application/x-www-form-urlencoded");
  console.log("SendData", SendData);
  encodeURIComponent(SendData).replace(/%20/g, "+");
  console.log("SendData2", SendData);
  //alert(mode+"のpostデータ\n"+SendData);
  xmlHttp.send(SendData);
  //set_comment("on","サーバと通信中です! ( "+ mode + " )");
}

//ローカルまたはサーバから取得したデータを元にHTML変更処理を振り分ける.
function modify_html(response, mode, nengetsu, unit_size) {
  //s=mode+"の戻り値\n"+nengetsu+"\n"+response;
  //alert(s);
  //console.log("modify_html start");
  //console.log(mode);
  //console.log(nengetsu);
  switch (mode) {
    case "shiku_json":
    case "cho_json":
      try {
        console.log("response", response);
        console.log("JSON.parse(response)開始");
        var pyramidData = JSON.parse(response);
        console.log("JSON.parse(response)終了");

        //戻り値が配列の場合はオブジェクトに変換する。
        let objectData = getObjectPiramidData(pyramidData);

        //ピラミッドを作成する。
        change_pyramid(objectData);
      } catch (e) {
        //サーバ側のrubyのJSON作成処理で文字コードに起因するエラーが発生した場合、
        //CSVファイルを返すようにした。CSVはJSON.parseでエラーになるのでリカバリーする.
        if (response.substr(0, 2) == "町名") {
          console.log("makePyramidData呼出し");
          var pyramidData = makePyramidData(response);
          change_pyramid(pyramidData, unit_size);
        } else {
          console.log(e.name + "\n" + e.message);
          //alert(e.name+"\n"+e.message);
        }
      }
      break;
    case "cho_csv":
      var pyramidData = makePyramidData(response);
      change_pyramid(pyramidData, unit_size);
      break;
    case "cho_list":
      //console.log("step=cho_list");
      change_cho_list(response);
      break;
    case "shiku_option":
      //console.log("step=shiku_option");
      change_shiku_option(response);
      break;
    case "cho_option":
      change_cho_option(response);
      break;
    case "all_options":
      var options = JSON.parse(response);
      //var options = (new Function("return " + response))();
      var shiku = get_selected_shiku();

      // メモリキャッシュを更新
      $optionsCache.shi = options.shi_option;
      $optionsCache.ku = options.ku_option;
      $optionsCache.cho = options.cho_option;
      $optionsCache.lastUpdate = Date.now();

      if (shiku == "age") {
        var shiku_option = options.shi_option;
      } else {
        var shiku_option = options.ku_option;
      }
      change_shiku_option(shiku_option);
      change_cho_option(options.cho_option);
      break;
    case "cho_csv_for_save":
      return; //ローカルストレージへのデータ保存専用なのでここでは何もはしない.
  }
}

//#######  ピラミッドを描画するコアプログラム  ##########

//ピラミッド描画エンジン(引数isAnm: アニメーション中かどうかのフラグ, isInterpolation: 補間アニメーション中かどうかのフラグ)
function change_pyramid(objectData, isAnm = false, isInterpolation = false) {
  console.log("change_pyramid開始");
  console.log(objectData["kijunbi"]);
  console.warn(`🎨 change_pyramid呼び出し: isAnm=${isAnm}, isInterpolation=${isInterpolation}, kijunbi=${objectData["kijunbi"]}`);
  
  myFunc();

  //ピラミッドを描画する。
  if (window.pyramidRenderer == null) {
    renderPyramid(objectData, isAnm);
  } else {
    window.pyramidRenderer.updateData(objectData, isAnm);
  }

  //その他の情報

  console.log("change_pyramid step2");

  var shiku = objectData["shiku"];
  var not_exist = objectData["not_exist"];
  var kijunbi = objectData["kijunbi"];
  var source = objectData["source_url"];
  
  // デバッグ: kakusai_betsuの構造を確認
  console.log("change_pyramid: kakusai_betsu配列の長さ:", objectData["kakusai_betsu"].length);
  console.log("change_pyramid: kakusai_betsu[0]の内容:", objectData["kakusai_betsu"][0]);
  console.log("change_pyramid: kakusai_betsu[0][1] (総数):", objectData["kakusai_betsu"][0][1]);
  console.log("change_pyramid: kakusai_betsu[0][2] (男性):", objectData["kakusai_betsu"][0][2]);
  console.log("change_pyramid: kakusai_betsu[0][3] (女性):", objectData["kakusai_betsu"][0][3]);
  
  // 重要な情報をalertで表示
  if (objectData["kakusai_betsu"] && objectData["kakusai_betsu"].length > 0) {
    const firstElement = objectData["kakusai_betsu"][0];
    console.warn(`📊 人口データ表示:\n` +
          `kakusai_betsu配列長: ${objectData["kakusai_betsu"].length}\n` +
          `kakusai_betsu[0]: ${JSON.stringify(firstElement)}\n` +
          `総数: ${firstElement[1]}\n` +
          `男性: ${firstElement[2]}\n` +
          `女性: ${firstElement[3]}\n` +
          `最初の要素[0]: ${firstElement[0]} (${typeof firstElement[0]})`);
  } else {
    console.warn(`❌ エラー: kakusai_betsuが空または未定義です！`);
  }
  
  var sosu = objectData["kakusai_betsu"][0][1];
  var male = objectData["kakusai_betsu"][0][2];
  var female = objectData["kakusai_betsu"][0][3];
  var kakusaiData = objectData["kakusai_betsu"].filter((item) =>
    /\d+(以上)?/.test(item[0])
  );

  console.log("change_pyramid step2.1");

  if (!isAnm) displey_hitoku_comment(objectData["hitoku"]);

  console.log("change_pyramid step3");

  //alert(pyramidData["shiku"]);
  //  if(pyramidData instanceof Array){
  //    var shiku     = pyramidData[1];
  //    var kijunbi   = pyramidData[2];
  //    var source    = pyramidData[3];
  //    var sosu      = pyramidData[4][1];
  //    var male      = pyramidData[4][2];
  //    var female    = pyramidData[4][3];
  //    pyramidData.splice(0,5);
  //    var kakusaiData   = pyramidData;
  //  }else{
  //    var shiku     = pyramidData["shiku"];
  //    var not_exist = pyramidData["not_exist"];
  //    var kijunbi   = pyramidData["kijunbi"];
  //    var source    = pyramidData["source_url"];
  //    var sosu      = pyramidData["kakusai_betsu"][0][1];
  //    var male      = pyramidData["kakusai_betsu"][0][2];
  //    var female    = pyramidData["kakusai_betsu"][0][3];
  //    var kakusaiData   = pyramidData["kakusai_betsu"]
  //    displey_hitoku_comment(pyramidData["hitoku"])
  //    //kakusaiData.splice(0,1);
  //  }
  //  console.log(kijunbi);
  //  if(unit_size===undefined){
  //    if(sosu!="0"){
  //      var unit    = 400*101/parseInt(sosu.replace(/,/g, ''));
  //    }else{
  //      var unit    = 0;
  //    }
  //  }else{
  //      var unit    = unit_size;
  //  }
  //  //console.log("change_pyramid-2");
  //  var time_series = [[],[],[]];
  kakusaiData.forEach(function (val) {
    var nenrei = val[0];
    var m_nin = val[2];
    var f_nin = val[3];
    $KakusaiObject[nenrei] = {
      male: m_nin.replace(",", ""),
      female: f_nin.replace(",", ""),
    };
  });

  //    if(val[0].match(/総数|合計|年齢不詳/) || val[2]==null){return;}
  //    var nenrei= val[0];
  //    var m_nin = val[2];
  //    var f_nin = val[3];
  //    var m_len = (parseInt(m_nin.replace(/,/g, '')) * unit ).toFixed(1);
  //    var f_len = (parseInt(f_nin.replace(/,/g, '')) * unit ).toFixed(1);
  //    var m_bar = m_len + "px" ;
  //    var f_bar = f_len + "px" ;
  //    document.getElementById("mn"+nenrei).innerHTML   = m_nin;
  //    document.getElementById("fn"+nenrei).innerHTML   = f_nin;
  //    document.getElementById("mb"+nenrei).style.width = m_bar;
  //    document.getElementById("fb"+nenrei).style.width = f_bar;
  //    time_series[1].push(parseInt(m_len));
  //    time_series[2].push(parseInt(f_len));
  //  adjust_size(time_series);
  if (!isAnm){
    var nengetsu = get_selected_nengetsu();
    if (nengetsu == undefined) {
      nengetsu = $nengetsu;
    }
    if (
      nengetsu == "9501" &&
      (shiku == "港北区" ||
        shiku == "緑区" ||
        shiku == "都筑区" ||
        shiku == "青葉区")
    ) {
      shiku = "港北・緑・青葉・都筑４区";
    }
  }
  console.log("change_pyramid step4");

  var h2 = shiku + '<span class="inline-block">' + kijunbi + "</span>";
  h2 = h2.replace("将来推計人口", '<span class="small">将来推計人口</span>');
  h2 = h2.replace(
    /10月(1|１)日(現在)?/,
    '10月1日現在<span class="small">(国勢調査結果)</span>'
  );
  if (not_exist != undefined && not_exist != "") {
    if (not_exist == "青葉区" || not_exist == "都筑区") {
      comment = "はこのころまだありませんでした.";
    } else {
      comment =
        "のデータはありません.住居表示等で新しい町名ができる前と思われます.";
    }
    h2 = h2 + "<br><span id='red'>(" + not_exist + comment + ")</span>";
  }
  console.log("change_pyramid step5");

  //h2(タイトル)を西暦主体に書き直す.
  h2 = change_seireki_main(h2);
  document.getElementById("h2").innerHTML = h2;
  if (!isInterpolation) {
    document.getElementById("sosu").innerHTML = plus_comma(sosu);
    document.getElementById("male").innerHTML = plus_comma(male);
    document.getElementById("female").innerHTML = plus_comma(female);
  }
  document.getElementById("source").innerHTML = source_str(shiku, source);
  if (!isAnm) basic_data_position();
  
  console.log("change_pyramid step6");

  //現在のピラミッドを次回ロード時に再現するための情報を保存する.
  if (!isAnm) save_last_pyramid();

  console.log("change_pyramid step7");

  //年齢３区分別の人口構成比を表示（補間アニメーション中はスキップ）
  if (!isInterpolation) {
    kubunDisplay();
  }

  function source_str(shiku, source) {
    console.log("source_str開始");
    var str = "データの出典： 横浜市統計ポータルサイト ";
    var nengetsu = get_selected_nengetsu();
    if (nengetsu == undefined) {
      nengetsu = $nengetsu;
    }
    // nengetsuがまだundefinedやnullの場合は空文字列に設定
    if (nengetsu == undefined || nengetsu == null) {
      nengetsu = "";
    }
    //console.log("source_str nengetsu");
    //console.log(nengetsu);
    console.log(`🔍 source_str: nengetsu = "${nengetsu}" (型: ${typeof nengetsu})`);
    console.log(`🔍 source_str: nengetsu.match(/年/) 実行前`);
    if (shiku == "横浜市" && nengetsu && typeof nengetsu === 'string' && nengetsu.match(/年/)) {
      var stat1 = "「横浜市 人口のあゆみ 2010」";
      var stat2 = "第4表 年齢別各歳別男女別人口";
      var url =
        "http://www.city.yokohama.lg.jp/ex/stat/jinko/ayumi/index-j.html";
      stat = "<a href='" + url + "'>" + stat1 + "</a>" + stat2;
    } else if (nengetsu && typeof nengetsu === 'string' && nengetsu.match(/\d\d\d\dft/)) {
      var str = "データの出典： 横浜市政策局ホームページ ";
      var stat = "横浜市将来推計人口";
      var url =
        "https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.html";
      stat = "<a href='" + url + "'>" + stat + "</a>";
    } else if (shiku == "横浜市" || shiku.slice(-1) == "区") {
      if (source.match(/kokusei/)) {
        var stat = "年齢別男女別人口（国勢調査）";
      } else {
        var stat = "年齢別男女別人口（推計人口）";
      }
    } else {
      var stat = "町丁別年齢別男女別人口（登録者数）";
    }
    var source_str =
      str +
      stat +
      '<span class="inline-block">' +
      '（<a href="' +
      source +
      '">' +
      source +
      "</a>）" +
      "</span>";
    //console.log(source_str);
    return source_str;
    //return source ;
  }
}

function set_UnitSize(size) {
  document.getElementById("unit_size").value = size;
}

function get_UnitSize() {
  return document.getElementById("unit_size").value;
}

//　ピラミッド描画のためのデータ変換処理  ########################################################

//  配列で受け取ったデータをオブジェクトに変換する。
function getObjectPiramidData(pyramidData) {
  console.log("getObjectPiramidData開始");
  let shiku, kijunbi, source_url, kakusai_betsu;
  if (Array.isArray(pyramidData)) {
    console.log("getObjectPiramidData rout1");
    shiku = pyramidData[1];
    kijunbi = pyramidData[2];
    source_url = pyramidData[3];
    kakusai_betsu = pyramidData.filter(Array.isArray);
    return {
      shiku: shiku,
      kijunbi: kijunbi,
      source_url: source_url,
      kakusai_betsu: kakusai_betsu,
    };
  } else {
    console.log("getObjectPiramidData rout2");
    return pyramidData;
  }
}

//町丁別年齢別CSVデータと被選択町丁配列からピラミッド作成用オブジェクトを作成する。
//基本的にはサーバー側で処理し、JSONデータを受け取るので、この処理は行われない。
//しかし、ローカルストレージにデータを保存するときは全町丁のデータをCSVで保存するため、
//ローカルストレージのデータを使うときはこの処理が行われる。
//ブラウザ側でこの処理が行われる場合にも秘匿処理の表示がされるように修正する必要がある。2021.11.28
function makePyramidData(csv) {
  console.log("makePyramidData開始");
  var cho = get_selected_cho();
  var ary = createArray(csv);
  var choArray = get_cho_data(ary, cho);
  var exist_cho = exist_cho(choArray);
  var not_exist = not_exist_cho(cho, exist_cho);
  var sumArray = sum_rows(choArray);
  var objectData = {};
  objectData["shiku"] = exist_cho.join(",");
  objectData["not_exist"] = not_exist_cho(cho, exist_cho);
  objectData["kijunbi"] = get_kijunbi();
  objectData["source_url"] = get_source_url();
  objectData["kakusai_betsu"] = make_kakusaiData(sumArray);

  console.log("makePyramidDataの戻り値", objectData);
  return objectData;

  //町丁別csvデータを二次元配列に変換する。
  function createArray(csvData) {
    console.log("createArray開始");
    var tempArray = csvData.split("\n");
    var csvArray = new Array();
    for (var i = 0; i < tempArray.length; i++) {
      if (tempArray[i].indexOf(",")) {
        csvArray[i] = tempArray[i].split(",");
      }
    }
    return csvArray;
  }
  //指定した町丁のデータに絞り込む。
  function get_cho_data(csvArray, choArray) {
    console.log("get_cho_data開始");
    var selectedArray = csvArray.filter(function (item) {
      if (choArray.indexOf(item[0]) >= 0) {
        return true;
      }
    });
    return selectedArray;
  }
  function exist_cho(choArray) {
    console.log("exist_cho開始");
    return choArray
      .map(function (ch) {
        return ch[0];
      })
      .filter(function (ch, i, self) {
        return ch == self[i + 1];
      });
  }
  function not_exist_cho(cho, exist_cho) {
    console.log("not_exist_cho開始");
    if (choArray.length == 0) {
      var not_exist = cho;
    } else {
      var not_exist = cho.filter(function (ch) {
        return exist_cho.indexOf(ch) == -1;
      });
    }
    return not_exist;
  }
  //複数行の年齢別データを合算する。
  function sum_rows(csvArray) {
    var rows = csvArray.length;
    var male = [];
    var female = [];
    for (i = 0; i < 102; i++) {
      male[i] = 0;
    }
    for (i = 0; i < 102; i++) {
      female[i] = 0;
    }
    var sumArray = [male, female];
    $hitoku = false;
    for (var r = 0; r < rows; r++) {
      for (var i = 0; i < 102; i++) {
        if (csvArray[r][2] == "男") {
          let mnin = Number(csvArray[r][i + 3]);
          //秘匿処理されているときは0とする。
          if (isNaN(mnin)) {
            mnin = 0;
            $hitoku = true;
          }
          sumArray[0][i] = Number(sumArray[0][i]) + mnin;
        } else if (csvArray[r][2] == "女") {
          let fnin = Number(csvArray[r][i + 3]);
          //秘匿処理されているときは0とする。
          if (isNaN(fnin)) {
            fnin = 0;
            $hitoku = true;
          }
          sumArray[1][i] = Number(sumArray[1][i]) + fnin;
        }
      }
    }
    console.log("sumArray", sumArray);
    return sumArray;
  }
  //[["総数",xxx,xxx,xxx],["0",xx,xx,xx],･･･["100",xx,xx,xx]]の形に変換する.
  function make_kakusaiData(sumArray) {
    var ary = [];
    var title = "";
    for (i = 0; i < 102; i++) {
      if (i == 0) {
        title = "総数";
      } else {
        title = String(i - 1);
      }
      var total = String(sumArray[0][i] + sumArray[1][i]);
      var male = String(sumArray[0][i]);
      var female = String(sumArray[1][i]);
      ary.push([title, total, male, female]);
    }
    return ary;
  }
}

//　その他のHTMLの描画処理  ########################################################

//選択した町丁が多いとき、タイトルのフォントを小さくする.
function adjust_title_size(title) {
  if (title.length > 50) {
    document.getElementById("h2").style.fontSize = "90%";
  }
}
//人口データの表示位置を調整する.
function basic_data_position() {
  //var nengetsu = get_selected_nengetsu(get_pyramid_mode());
  ////alert(nengetsu);
  //if (nengetsu == undefined) {
  //  nengetsu = $nengetsu;
  //}
  ////alert(nengetsu);
  ////console.log(nengetsu);
  //var obj = document.getElementById("basic_data");
  //var btn = document.getElementById("kubun_button");
  //if (nengetsu.match(/昭和|大正/)) {
  //  if (btn.style.display == "none") {
  //    obj.style.bottom = "400px";
  //  } else {
  //    obj.style.bottom = "300px";
  //  }
  //} else {
  //  if (btn.style.display == "none") {
  //    obj.style.bottom = "66pt";
  //    obj.style.right = "5pt";
  //  } else {
  //    obj.style.bottom = "66pt";
  //    obj.style.right = "10pt";
  //  }
  //}
}
//フッターの縦位置を調整する.
//function adjustFooterPosition() {
//  const cho = document.querySelector("#cho");
//  const menu = document.querySelector(".left-controls");
//  const pyramid = document.querySelector("#pyramid-block");
//  const footer = document.querySelector("#footer");
//  if (!footer || !cho) return;
//  // 表示中のみ下に配置
//  //if (cho.style.display !== 'none') {
//  //  const rect = cho.getBoundingClientRect();
//  //  footer.style.position = 'absolute';
//  //  footer.style.top = (rect.bottom + window.scrollY + 20) + 'px'; // 20pxは余白
//  //} else {
//  // cho非表示時はウィンドウ下部
//  const rect1 = pyramid.getBoundingClientRect();
//  const rect2 = menu.getBoundingClientRect();
//  footer.style.position = "absolute";
//  //footer.style.top = (window.innerHeight - footer.offsetHeight) + 'px';
//  footer.style.top = Math.max(rect1.bottom, rect2.bottom) + 20 + "px";
//  //}
//}
//市区の選択が横浜市か区かを判別して、町丁一覧の表示・非表示を切り替える処理.
function cho_list() {
  console.log("cho_list開始");
  var index = document.forms[0].shiku.selectedIndex;
  var shiku = document.forms[0].shiku.options[index].value;
  if (shiku == "age") {
    document.getElementById("cho_list").innerHTML = "";
    document.getElementById("cho").style.display = "none";
    document.getElementById("link").style.visibility = "hidden";

  } else {
    //ローカルデータがあればローカルデータで描画する.
    if (escape_ajax("cho_list") == false) {
      //ローカルデータが存在しないときはサーバから取得して描画する.
      ajax("cho_list");
    }
    document.getElementById("cho").style.display = "inline-block";
    document.getElementById("cho_year").style.display = "inline-block";
    document.getElementById("link").style.visibility = "visible";
  }
  //フッターの位置を調整する.
  //adjustFooterPosition();
}
//ピラミッドの大きさが標準サイズを超えるときメインブロックやテーブルの幅を拡張する.
//function adjust_size(time_series){
//  var max_m  = Math.max.apply(null,time_series[1]);
//  var max_f  = Math.max.apply(null,time_series[2]);
//  var max    = max_m + max_f;
//
//  if (max>(1108-55)){
//    var w    = (max+55)+"px";
//  }else{
//    var w    = "1108px";
//  }
//  document.getElementById("main").style.width    = w;
//  document.getElementById("pyramid").style.width = w;
//  document.getElementById("table").style.width   = w;
//}
//町丁名一覧を書き換える.
function change_cho_list(str) {
  document.getElementById("cho_list").innerHTML = str;
}
//市区ピラミッド用の年月日セレクトボックスの選択肢を更新する.
function change_shiku_option(str) {
  if (str === undefined) {
    var shiku = get_selected_shiku();
    var optionType;

    if (shiku == "age") {
      optionType = "shi";
    } else {
      optionType = "ku";
    }
    str = getOptionsWithCache(optionType);

    if (!str) {
      // キャッシュがない場合はサーバーから取得
      ajax("all_options", null, 1);
      return;
    }
  }
  var nengetsu = get_selected_nengetsu("shiku");
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }
  document.getElementById("shiku_year").innerHTML = str;
  select_nengetsu(nengetsu, "shiku");
}
//町丁ピラミッド用の年月日セレクトボックスの選択肢を更新する.
function change_cho_option(str) {
  //alert(str);
  var nengetsu = get_selected_nengetsu("cho");
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }
  document.getElementById("cho_year").innerHTML = str;
  select_nengetsu(nengetsu, "cho");
}
//町丁名一覧の選択をすべて解除する.
function checkbox_clear() {
  var chosu = document.chobetsu.length - 1;
  for (i = 0; i < chosu; i++) {
    document.chobetsu.elements[i].checked = false;
  }
}
//市区ピラミッド用と町丁別ピラミッド用の年月日セレクトボックスを切り替える.
//それとともに動画ボタンの表示・非表示を切り替える.
function change_cmbbox_display(pyramode) {
  //return;  //動作テスト用変更箇所
  switch (pyramode) {
    case "shiku":
      //alert("change_cmbbox_display shiku");
      document.getElementById("shiku_year").style.display = "inline-block";
      document.getElementById("doga").style.display       = "inline-block";
      document.getElementById("cho_year").style.display = "none";
      break;
    case "cho":
      document.getElementById("shiku_year").style.display = "none";
      document.getElementById("doga").style.display       = "inline-block";
      document.getElementById("cho_year").style.display = "inline-block";
  }
}
//ブラウザに対応してCSSを調整する.
function safari_style() {
  //var userAgent = window.navigator.userAgent.toLowerCase();
  ////alert(userAgent);
  //if (userAgent.indexOf("windows nt 10.0")>1 &&
  //    userAgent.indexOf("chrome")>1 &&
  //    userAgent.indexOf("edge")==-1){
  //  document.getElementById("table").style.lineHeight='0.8';
  //}
  //if (userAgent.indexOf("intel mac os x")>1 && userAgent.indexOf("safari")>1){
  //  document.getElementById("table").style.lineHeight='40%';
  //}
}
//秘匿処理データがあるとき秘匿データの処理について注記する。
function displey_hitoku_comment(hitoku) {
  console.log("displey_hitoku_comment開始");
  if (hitoku == true) {
    document.getElementById("hitoku").style.display = "block";
  } else {
    document.getElementById("hitoku").style.display = "none";
  }
}

//　HTMLの状態を読み取り、情報を取得する処理  ########################################################

function get_pyramid_mode() {
  return document.getElementById("mode").value;
}
//AjaxでPOSTリクエストするときのパラメータを作成する.
function get_SendData(mode, nengetsu) {
  //mode: shiku_json, cho_json, cho_csv, cho_csv_for_save,shiku_option, ayumi_option, cho_list
  if (nengetsu == undefined) {
    nengetsu = get_selected_nengetsu();
  }
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }

  var SendData = [];
  switch (mode) {
    case "cho_json":
      var checked_cho = get_selected_cho();
      SendData.push("Cho=" + JSON.stringify(checked_cho));
      var shiku = get_selected_shiku();
      SendData.push("ShikuName=" + shiku);
      SendData.push("Year=" + nengetsu);
      SendData.push("Level=" + mode);
      break;
    case "shiku_json":
    case "cho_csv":
    case "cho_csv_for_save":
    case "cho_list":
      var shiku = get_selected_shiku();
      SendData.push("ShikuName=" + shiku);
      SendData.push("Year=" + nengetsu);
      SendData.push("Level=" + mode);
      break;
    case "shiku_option":
    case "cho_option":
    case "all_options":
      SendData.push("Level=" + mode);
  }
  return SendData.join("&");
}

//市区セレクトボックスで選択されている市区情報を取得する.
function get_selected_shiku() {
  var index = document.forms[0].shiku.selectedIndex;
  var cmb_value = document.forms[0].shiku.options[index].value;
  return cmb_value;
}

//町丁名一覧でチェックさている町丁名を取得する.(引数は未選択時のメッセージの有無、戻り値は配列)
function get_selected_cho(mode) {
  var chosu = document.chobetsu.length - 1;
  var checked = [];
  for (i = 0; i < chosu; i++) {
    var obj = document.chobetsu.elements[i];
    if (obj.checked == true) {
      checked.push(obj.value);
    }
  }
  if (checked.length > 0) {
    return checked;
  } else {
    if (mode === undefined) {
      jAlert(
        "町名が選択されていません！",
        "町名を選択してからボタンをクリックしてください。" +
          "\n複数の町を選択して複数の町からなる地域の人口ピラミッドを描くことができます。"
      );
      throw new Error(); //強制終了
    }
    return null;
  }
}

//年月日セレクトボックスで選択されている年月を取得する.
//戻り値のパターン: 201701 6501syorai
function get_selected_nengetsu(pyramode) {
  if (pyramode === undefined) {
    pyramode = get_pyramid_mode();
  }
  console.log(`🔍 get_selected_nengetsu: pyramode = "${pyramode}"`);
  try {
    if (pyramode == "shiku") {
      var index = document.forms[0].shiku_year.selectedIndex;
      var cmb_value = document.forms[0].shiku_year.options[index].value;
      console.log(`🔍 get_selected_nengetsu: shiku_year selectedIndex = ${index}, value = "${cmb_value}"`);
    } else if (pyramode == "cho") {
      var index = document.forms[0].cho_year.selectedIndex;
      var cmb_value = document.forms[0].cho_year.options[index].value;
      console.log(`🔍 get_selected_nengetsu: cho_year selectedIndex = ${index}, value = "${cmb_value}"`);
    }
  } catch (e) {
    var cmb_value = undefined;
    console.log(`🔍 get_selected_nengetsu: エラー発生:`, e);
  }
  console.log("get_selected_nengetsu cmb_value", cmb_value);
  return cmb_value;
}

//元データの横浜市統計ポータルサイトのURLを取得する.
function get_source_url(nengetsu) {
  if (nengetsu == undefined) {
    nengetsu = get_selected_nengetsu();
  }
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }

  var yy = nengetsu.slice(0, 2);
  if (yy <= 19) {
    var gen = "h" + (yy + 12);
  } else if (yy <= 59) {
    var gen = "r" + (yy - 18);
  } else if (yy <= 88) {
    var gen = "s" + (yy - 25);
  } else if (yy <= 99) {
    var gen = "h" + (yy - 88);
  }

  var shiku = get_selected_shiku();
  var pyramode = get_pyramid_mode();
  if (yy < 3 || 74 < yy) {
    var Location1 =
      "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/choki.files/4.xlsx";
  } else {
    var Location1 =
      "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/nenrei/suikei.files/<yy>_hyo22.xlsx";
  }

  var Location2 =
    "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/<gen>cho-nen.files/<ku><nengetsu>.csv";
  switch (pyramode) {
    case "shiku":
      var src = Location1;
      break;
    case "cho":
      var src = Location2;
  }
  src = src
    .replace(/<nengetsu>/g, nengetsu)
    .replace(/<ku>/g, shiku)
    .replace(/<yy>/g, yy)
    .replace(/<gen>/g, gen);
  return src;
}

//年月日セレクトボックスの選択値を読み取り、yymm形式を平成x年x月x日に変換する。
function get_kijunbi(nengetsu) {
  if (nengetsu == undefined) {
    nengetsu = get_selected_nengetsu();
  }
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }
  if (nengetsu.length == 6) {
    var nen = Number(nengetsu.slice(2, 4));
    var getsu = Number(nengetsu.slice(4));
  } else if (nengetsu.length == 4) {
    var nen = Number(nengetsu.slice(0, 2));
    var getsu = Number(nengetsu.slice(2));
  }
  if (getsu == 1) {
    var hi = 1;
  } else {
    var hi = 30;
  }
  if (nen < 50) {
    if (nen == 19) {
      if (getsu < 4) {
        var kijunbi = "平成31年" + getsu + "月" + hi + "日現在";
      } else {
        var kijunbi = "令和元年" + getsu + "月" + hi + "日現在";
      }
    } else if (nen > 19) {
      var kijunbi = "令和" + (nen - 18) + "年" + getsu + "月" + hi + "日現在";
    } else {
      var kijunbi = "平成" + (nen + 12) + "年" + getsu + "月" + hi + "日現在";
    }
  } else {
    var kijunbi = "平成" + (nen - 88) + "年" + getsu + "月" + hi + "日現在";
  }
  return kijunbi;
}

//データ保存モードかどうかの判別
function isDataSaveMode() {
  //return document.getElementById("save").checked;
  return false;
}

//端末保存データの有無を調べ,あるときはkeyを取得する.
function isLocalData(mode, nengetsu) {
  //mode: shiku_json, cho_json, cho_csv, cho_list, shiku_option
  if (get_browser_usage_of_localStorage() == "not_use") {
    return false;
  }
  var key = localStorage_key(mode, nengetsu);
  if (isInlocalStorage(key) == true) {
    return key;
  } else {
    return false;
  }
}

//データ保存ラジオボタンをクリックしたときの表示メッセージを取得する.
function get_comment(opt) {
  if (opt == "save") {
    var mes = "以後、この端末に人口ピラミッドのデータを保存します.";
  } else if (opt == "clear") {
    if (is_localStorage_data() == true) {
      var mes =
        "これまでに端末に保存された年齢別人口データを消去します." +
        "\n以後端末にデータを保存しません.";
    } else {
      var mes =
        "端末にはデータを保存しません。\n端末にデータを保存すると、" +
        "\n一度表示した人口ピラミッドをオフラインでも表示でき、" +
        "\n確実に描画できるようになります。" +
        "データを保存しない設定にしますか？";
    }
  }
  return mes;
}

//ローカルストレージ処理  ######################################################
function get_browser_usage_of_localStorage() {
  //var usage = document.getElementById("localStorage");
  //if(usage.value=="unknown"){
  //  try{
  //    localStorage.setItem("hello", "world");
  //    usage.value="use";
  //  }catch(e){
  //    usage.value="not_use";
  //  }
  //}
  return "use"; //ローカルストレージ使用で固定
}

function responseData_save(response, mode, nengetsu) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var key = localStorage_key(mode, nengetsu);
  if (mode == "all_options") {
    localStorage_set(key, response);
    return;
  }
  if (document.getElementById("save").checked == true) {
    switch (mode) {
      case "shiku_json":
      case "cho_list":
        localStorage_set(key, response);
        break;
      case "cho_csv":
        var data = JSON.stringify({ timeStamp: dateTime(), csv: response });
        localStorage_set(key, data);
      case "cho_json": //特定の町丁のデータである"cho_json"はローカルには保存しない.
        return;
    }
  }
}

function localStorage_key(mode, nengetsu) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var shiku = get_selected_shiku();
  if (nengetsu == undefined) {
    nengetsu = get_selected_nengetsu();
  }
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }
  switch (mode) {
    case "shiku_json":
      var key = shiku + nengetsu + "-j.txt";
      break;
    case "cho_json":
    case "cho_csv":
      var key = shiku + nengetsu + ".csv";
      break;
    case "cho_list":
      var key = shiku + "_cho_list.txt";
      break;
    case "shiku_option":
      if (shiku == "age") {
        var key = "shi-option";
      } else {
        var key = "ku-option";
      }
      break;
    case "cho_option":
      var key = "cho-option";
      break;
    case "all_options":
      var key = "all_option.txt";
  }
  return key;
}

function localStorage_set(key, value) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    //ローカルストレージが容量いっぱいになったときの処理
    //タイムスタンプの古いcsvファイル2つを削除する.
    localStorage_lotation();
    localStorage.setItem(key, value);
    //document.getElementById("storage_alert").style.display="inline-block";
  }
}

function isInlocalStorage(key) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var exist = false;
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k == key) {
      exist = true;
      break;
    }
  }
  return exist;
}

function localStorage_get(key) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  if (key.substr(-6) == "option") {
    var json = localStorage.getItem("all_option.txt");
    var obj = JSON.parse(json);
    return obj[key];
  } else {
    return localStorage.getItem(key);
  }
}

function data_save_setting(opt) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  opt = opt !== undefined ? opt : "get";
  if (opt == "save") {
    localStorage_set("data_save", "save");
  } else if (opt == "clear") {
    localStorage_data_clear();
    localStorage_set("data_save", "clear");
    document.getElementById("storage_alert").style.display = "none";
  } else if (opt == "get") {
    return localStorage_get("data_save");
  }
}

function show_ninzu_setting(opt) {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  opt = opt !== undefined ? opt : "get";
  if (opt == "show") {
    localStorage_set("show_ninzu", "show");
  } else if (opt == "hidden") {
    localStorage_set("show_ninzu", "hidden");
  } else if (opt == "get") {
    return localStorage_get("show_ninzu");
  }
}

function get_localStorage_keys() {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var num = localStorage.length;
  var keys = [];
  for (i = 0; i < num - 1; i++) {
    if (localStorage.key(i) != "data_save") {
      keys.push(localStorage.key(i));
    }
  }
  return keys;
}

function is_localStorage_data() {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  if (get_localStorage_keys().length > 0) {
    return true;
  } else {
    return false;
  }
}

function localStorage_data_clear() {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var save = localStorage_get("data_save");
  var ninzu = localStorage_get("show_ninzu");
  var last = localStorage_get("last_pyramid");

  localStorage.clear();

  localStorage_set("show_ninzu", ninzu);
  localStorage_set("data_save", save);
  localStorage_set("last_pyramid", last);
}

//ローカルストレージ保存データのうちcsvファイルの古いものを削除する.
//（csvファイルはファイルサイズが大きい.）
function localStorage_lotation() {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var test = [];
  var ary = [];
  for (i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.substr(-4) == ".csv") {
      var val = localStorage[key];
      if (val.substr(0, 2) == "町名") {
        localStorage.removeItem(key); //素のcsvファイルは削除する.
      } else {
        ary.push([key, JSON.parse(val).timeStamp]);
      }
    }
  }
  //タイムスタンプの古い順にソートする.
  ary.sort(function (a, b) {
    if (a[1] < b[1]) {
      return -1;
    } else if (a[1] > b[1]) {
      return 1;
    } else {
      return 0;
    }
  });
  //alert(JSON.stringify(ary));
  //タイムスタンプが古い方から2つを削除する.
  localStorage.removeItem(ary[0][0]);
  localStorage.removeItem(ary[1][0]);
}

function localStorage_list() {
  if (get_browser_usage_of_localStorage() == "not_use") {
    return;
  }
  var ary = [];
  for (i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    ary.push(key);
  }
  //キーの拡張子でソートする.
  ary.sort(function (a, b) {
    if (a.substr(-3) < b.substr(-3)) {
      return -1;
    } else if (a.substr(-3) > b.substr(-3)) {
      return 1;
    } else {
      return 0;
    }
  });
  //alert(JSON.stringify(ary));
}

//　その他 ########################################################
//【年月日切り替え】
//　町丁ピラミッドと市区ピラミッドのボタンを押したとき、
//　現在表示中のピラミッドに一番近い年月を選択状態にする。
function set_another_nengetsu(newPyramode) {
  function get_option_id(select_obj, val) {
    var i;
    for (i = 0; i < select_obj.length; i++) {
      if (select_obj.options[i].value == val) {
        return i;
        break;
      }
    }
    return false;
  }
  var pyramode = get_pyramid_mode();
  if (newPyramode == undefined) {
    if (pyramode == "shiku") {
      var newPyrampde = "cho";
    } else if (pyramode == "cho") {
      var newPyramode = "shiku";
    }
  }
  if (newPyramode == "shiku") {
    var nengetsu = get_selected_nengetsu("cho");
  } else {
    var nengetsu = get_selected_nengetsu("shiku");
  }
  var ku = document.getElementById("shiku_year");
  var cho = document.getElementById("cho_year");
  var another_nengetsu;
  if (newPyramode == "shiku") {
    var nen = Number(nengetsu.substr(0, 4));
    var tsuki = Number(nengetsu.substr(4, 2));
    temp = String(nen + 1) + "01";
    var i = get_option_id(ku, temp);
    if (i == false) {
      i = get_option_id(ku, "new");
    }
    another_nengetsu = ku.options[i].value;
    //ku.value = another_nengetsu;
    select_nengetsu(another_nengetsu, "shiku");
  } else if (newPyramode == "cho") {
    if (nengetsu.match(/年/)) {
      var i = ku.options.length - 1;
    } else if (nengetsu.match(/ft/)) {
      var i = 0;
    } else if (nengetsu.match(/new/)) {
      var pre_ku_nen = ku.options[get_option_id(ku, "new") + 1].value.substr(
        0,
        4
      );
      if (cho.options[0].value.substr(0, 4) == pre_ku_nen) {
        var i = 0;
      } else {
        var i = 1;
      }
    } else {
      var nen = Number(nengetsu.substr(0, 4));
      var tsuki = Number(nengetsu.substr(4, 2));
      if (nen < 1998) {
        var i = cho.options.length - 1;
      } else {
        var i = get_option_id(cho, String(nen - 1) + "09");
      }
    }
    another_nengetsu = cho.options[i].value;
    select_nengetsu(another_nengetsu, "cho");
    //cho.value = another_nengetsu;
  }
  return another_nengetsu;
  //alert("これから開くピラミッドの年月日"+to.options[i+gap].value);
  //alert(get_selected_nengetsu("shiku")+":"+ku.options[i].value);
  //alert(get_selected_nengetsu("cho")+":"+cho.options[i].value);
}

function set_pyramid_mode(pyramode) {
  switch (pyramode) {
    case "shiku":
      document.getElementById("mode").value = "shiku";
      break;
    case "cho":
      document.getElementById("mode").value = "cho";
  }
}

function select_shiku(shiku) {
  document.getElementById("shiku").value = shiku;
}

function select_nengetsu(nengetsu, pyramode) {
  if (pyramode === undefined) {
    pyramode = get_pyramid_mode();
  }
  if (nengetsu == undefined) {
    nengetsu = $nengetsu;
  }
  
  const selectElement = document.getElementById(pyramode + "_year");
  if (!selectElement) {
    console.error(`select_nengetsu: セレクトボックスが見つかりません (${pyramode}_year)`);
    return;
  }
  
  // オプションが準備できるまで待機
  waitForSelectOptions(selectElement, nengetsu, pyramode);
}

// セレクトボックスのオプションが準備できるまで待機する関数
function waitForSelectOptions(selectElement, targetValue, pyramode, maxWaitTime = 10000) {
  const startTime = Date.now();
  
  function checkOptions() {
    const currentTime = Date.now();
    
    // タイムアウトチェック
    if (currentTime - startTime > maxWaitTime) {
      console.error(`select_nengetsu: オプション待機がタイムアウトしました (${pyramode}_year)`);
      setFallbackValue(selectElement, pyramode);
      return;
    }
    
    // オプションが存在するかチェック
    if (selectElement.options && selectElement.options.length > 0) {
      console.log(`select_nengetsu: オプション準備完了 (${pyramode}_year), オプション数: ${selectElement.options.length}`);
      
      // 指定された値が存在するかチェック
      if (optionExists(selectElement, targetValue)) {
        selectElement.value = targetValue;
        console.log(`select_nengetsu: 値を設定しました (${pyramode}_year = ${targetValue})`);
      } else {
        console.log(`select_nengetsu: 指定値が見つからないためフォールバック値を設定 (${pyramode}_year, 指定値: ${targetValue})`);
        setFallbackValue(selectElement, pyramode);
      }
    } else {
      // オプションがまだ準備されていない場合は再試行
      console.log(`select_nengetsu: オプション待機中 (${pyramode}_year)...`);
      setTimeout(checkOptions, 50); // 50ms間隔で再試行
    }
  }
  
  checkOptions();
}

// 指定された値がオプションに存在するかチェック
function optionExists(selectElement, value) {
  if (!selectElement.options || selectElement.options.length === 0) {
    return false;
  }
  
  for (let i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].value === value) {
      return true;
    }
  }
  return false;
}

// フォールバック値を設定
function setFallbackValue(selectElement, pyramode) {
  if (!selectElement.options || selectElement.options.length === 0) {
    console.error(`setFallbackValue: オプションが存在しません (${pyramode}_year)`);
    return;
  }
  
  let fallbackValue;
  
  if (pyramode === "shiku") {
    // 市区ピラミッドの場合："new"を選択（最新データ）
    fallbackValue = "new";
    if (!optionExists(selectElement, fallbackValue)) {
      // "new"が存在しない場合は最初のオプション
      fallbackValue = selectElement.options[0].value;
    }
  } else if (pyramode === "cho") {
    // 町丁別ピラミッドの場合：最初の選択肢（最新データ）
    fallbackValue = selectElement.options[0].value;
  } else {
    // その他の場合は最初のオプション
    fallbackValue = selectElement.options[0].value;
  }
  
  selectElement.value = fallbackValue;
  console.log(`setFallbackValue: フォールバック値を設定しました (${pyramode}_year = ${fallbackValue})`);
}

function set_comment(display, mes, timer) {
  if (display == "on") {
    document.getElementById("comment").style.display = "block";
    document.getElementById("comment").innerHTML = mes;
    if (timer !== undefined) {
      window.setTimeout(function () {
        set_comment("off");
      }, timer);
    }
  } else if (display == "off") {
    document.getElementById("comment").style.display = "none";
  }
}

function jAlert(strTitle, strMessage) {
  $("#dialog").text(strMessage);
  $("#dialog").dialog({
    modal: true,
    title: strTitle,
    width: 400,
    height: 300,
    buttons: {
      OK: function () {
        $(this).dialog("close");
      },
    },
  });
}

function save_last_pyramid() {
  var pyramode = get_pyramid_mode();
  var shiku = get_selected_shiku();
  var nengetsu = get_selected_nengetsu(pyramode);
  var cho = get_selected_cho("no_message");
  var pyraId = {
    pyramode: pyramode,
    shiku: shiku,
    nengetsu: nengetsu,
    cho: cho,
  };
  var json = JSON.stringify(pyraId);
  localStorage_set("last_pyramid", json);
}

function redisplay_pyramid() {
  var json = localStorage_get("last_pyramid");
  if (json) {
    var pyraId = JSON.parse(json);
    //console.log(pyraId);
    set_pyramid_mode(pyraId.pyramode);
    change_cmbbox_display(pyraId.pyramode);
    select_shiku(pyraId.shiku);
    $nengetsu = pyraId.nengetsu;
    select_nengetsu($nengetsu);
    if (pyraId.pyramode == "shiku") {
      shiku_pyramid($nengetsu);
      cho_list();
      change_cmbbox_display("shiku");
    } else {
      cho_list();
      if (get_selected_nengetsu("cho") == undefined) {
        var nengetsu = set_another_nengetsu("cho");
      }
      //alert("shiku:" + get_selected_nengetsu("shiku"));
      //alert("cho:" + get_selected_nengetsu("cho"));
      //町丁のリストをinnerHTMLで追加しても、インターバルをとらないと
      //DOMとして認識しないため、setIntervalを使い、認識するまで待ってから実行する。
      var step = 0;
      var select_cho = setInterval(function () {
        step++;
        var chosu = document.chobetsu.length - 1;
        if (chosu > 5) {
          clearInterval(select_cho);
          for (i = 0; i < chosu; i++) {
            var obj = document.chobetsu.elements[i];
            if (pyraId.cho.indexOf(obj.value) >= 0) {
              obj.checked = true;
            }
          }
          cho_pyramid();
        }
      }, 10);
    }
    return true;
  } else {
    change_display("shiku");
    return false;
  }
}

function dateTime(arg = "-sec") {
  var day = new Date();
  var y = String(day.getFullYear());
  var M = ("0" + String(day.getMonth() + 1)).substr(-2);
  var d = ("0" + String(day.getDate())).substr(-2);
  var h = day.getHours();
  var m = day.getMinutes();
  var s = day.getSeconds();
  if (arg == "-sec") {
    var t = y + M + d + " " + h + ":" + m;
  } else if (arg == "+sec") {
    var t = y + M + d + "_" + h + m + s;
  }
  //alert(t);
  return t;
}

//3桁区切りのカンマを入れる。
function plus_comma(su, unit) {
  if (unit == "%") {
    return su;
  }
  if (typeof su == "string") {
    if (su.match(/^\d+$/)) {
      num = Number(su);
    } else {
      return su;
    }
  } else {
    num = su;
  }
  try {
    return num.toLocaleString();
  } catch (e) {
    console.log('このブラウザでは"toLocaleStringは使えません。');
    return String(num).replace(/(\d)(?=(\d{3})+$)/g, "$1,");
  }
}

function change_seireki_main(hi) {
  //「元号年月日」形式を「西暦年(元号年)月日」形式に変換する。
  var a = hi.match(/(大正|昭和|平成|令和)(\d+|元).*年\)?/);
  var org = a[0];
  var gen = a[1];
  var nen = a[2];
  if (nen == "元") {
    var num_nen = 1;
  } else {
    var num_nen = Number(nen);
  }
  if (gen == "大正") {
    var seireki = 1911 + num_nen;
  } else if (gen == "昭和") {
    var seireki = 1925 + num_nen;
  } else if (gen == "平成") {
    var seireki = 1988 + num_nen;
  } else if (gen == "令和") {
    var seireki = 2018 + num_nen;
  }
  if (hi.match(/1月|3月|9月|10月/)) {
    var alt = seireki + "年(" + gen + nen + "年)";
  } else {
    var alt = seireki + "年";
  }
  hi = hi.replace(org, alt).replace(/\d{4}/, "&nbsp;$&");
  //alert(hi);
  //console.log("hi2="+hi);
  return hi;
}

//年齢区分別人口の処理区分（ページ読込時、ピラミッド描画時、セレクトボックス変更時に実行）
function kubunDisplay() {
  console.log("kubunDisplay開始");
  var opt = document.getElementById("kubun_unit");
  var val = opt.value;
  var disp = document.getElementById("nenrei_3kubun");
  var btn = document.getElementById("kubun_button");
  var info = document.getElementById("info_3kubun");
  if (val == "構成比") {
    var ratio = true;
    disp.style.display = "inline-block";
    btn.style.display = "none";
    info.style.display = "inline";
  } else if (val == "人口") {
    var ratio = false;
    disp.style.display = "inline-block";
    btn.style.display = "none";
    info.style.display = "inline";
  } else if (val == "非表示") {
    opt.style.display = "none";
    disp.style.display = "none";
    btn.style.display = "block";
    info.style.display = "none";
  }
  basic_data_position();
  console.log("kubunChange呼出し");
  kubunChange(ratio);
}

function kubunSelectDisp() {
  var opt = document.getElementById("kubun_unit");
  var disp = document.getElementById("nenrei_3kubun");
  var btn = document.getElementById("kubun_button");
  var info = document.getElementById("info_3kubun");
  opt.options[0].selected = true;
  disp.style.display = "inline-block";
  btn.style.display = "none";
  opt.style.display = "inline-block";
  info.style.display = "";
  basic_data_position();
}

// 年齢入力値の検証関数
function validateAgeInput(input) {
  const value = parseInt(input.value);
  const min = parseInt(input.min);
  const max = parseInt(input.max);
  
  // 値が範囲外の場合は修正
  if (value < min) {
    input.value = min;
  } else if (value > max) {
    input.value = max;
  }
  
  // 開始年齢と終了年齢の整合性チェック
  const smiddle = document.getElementById('smiddle');
  const emiddle = document.getElementById('emiddle');
  
  if (smiddle && emiddle) {
    const startAge = parseInt(smiddle.value);
    const endAge = parseInt(emiddle.value);
    
    if (startAge >= endAge) {
      // 開始年齢が終了年齢以上の場合、終了年齢を調整
      if (input.id === 'smiddle') {
        emiddle.value = Math.min(99, startAge + 1);
        updateAgeDisplay('end', emiddle.value);
      } else {
        smiddle.value = Math.max(0, endAge - 1);
        updateAgeDisplay('start', smiddle.value);
      }
    }
  }
}

// 年齢表示を更新する関数
function updateAgeDisplay(type, value) {
  const displayElement = document.getElementById(type + 'AgeDisplay');
  if (displayElement) {
    displayElement.textContent = value;
  }
}

function current_kubun() {
  var opt = document.getElementById("kubun_unit");
  var num = opt.options.selectedIndex;
  var kubun = opt.options[num].value;
  return kubun;
}

//年齢区分を変更したとき、表側の高年齢区分と低年齢区分を連動させる。
//引数：true(デフォルト) ⇒ 構成比、false ⇒ 人数
function kubunChange(ratio) {
  console.log("kubunChange開始");
  if (current_kubun() == "人口") {
    ratio = false;
  } else {
    ratio = true;
  }
  var smid = document.getElementById("smiddle");
  var emid = document.getElementById("emiddle");
  var low = document.getElementById("lower");
  var hei = document.getElementById("heigher");
  var leftNin = Number(smid.value);
  var rightNin = Number(emid.value);
  low.innerText = leftNin - 1;
  hei.innerText = rightNin + 1;

  console.log("getNin呼出し");

  var numObj = getNin($KakusaiObject, leftNin, rightNin);
  if (ratio == true) {
    numObj = getRatio(numObj);
    var unit = "%";
  } else {
    var unit = "人";
  }
  for (i = 0; i < 3; i++) {
    setText(numObj, "ku" + String(i + 1), "male", unit);
    setText(numObj, "ku" + String(i + 1), "female", unit);
    setText(numObj, "ku" + String(i + 1), "sosu", unit);
  }
  function setText(numObj, kubun, sei, unit) {
    var ku = { ku3: "hei", ku2: "mid", ku1: "low" };
    var n = numObj[ku[kubun]][sei];
    return (document.getElementById(kubun + "_" + sei).innerText =
      plus_comma(n, unit) + unit);
  }
}
//各歳別のデータから年齢３区分別人口を計算して返す。
//戻り値：{hei:{male:nn,female:nn,sosu:nn},mid:{male:nn,female:nn,sosu:nn},low:{male:nn,female:nn,sosu:nn}}
function getNin(kakusaiData, ssai, esai) {
  console.log("getNin開始");
  var hei = {};
  hei.male = 0;
  hei.female = 0;
  var mid = {};
  mid.male = 0;
  mid.female = 0;
  var low = {};
  low.male = 0;
  low.female = 0;
  for (i = 0; i <= 100; i++) {
    if (i in kakusaiData) {
      if (i > esai) {
        hei.male += Number(kakusaiData[i].male);
        hei.female += Number(kakusaiData[i].female);
      } else if (i >= ssai) {
        mid.male += Number(kakusaiData[i].male);
        mid.female += Number(kakusaiData[i].female);
      } else {
        low.male += Number(kakusaiData[i].male);
        low.female += Number(kakusaiData[i].female);
      }
    }
  }
  hei.sosu = hei.male + hei.female;
  mid.sosu = mid.male + mid.female;
  low.sosu = low.male + low.female;
  var kubunNinData = { hei: hei, mid: mid, low: low };
  //console.log(JSON.stringify(kubunNinData));
  return kubunNinData;
}
//年齢3区分別人口から年齢3区分別人口構成比を計算して返す。
//戻り値：{hei:{male:%%,female:%%,sosu:%%},mid:{male:%%,female:%%,sosu:%%},low:{male:%%,female:%%,sosu:%%}}
function getRatio(kubunNinData) {
  var n = kubunNinData;
  n.sosu = {};
  n.sosu.male = n.hei.male + n.mid.male + n.low.male;
  n.sosu.female = n.hei.female + n.mid.female + n.low.female;
  n.sosu.sosu = n.hei.sosu + n.mid.sosu + n.low.sosu;
  var r = {};
  r.hei = {};
  r.mid = {};
  r.low = {};

  r.hei.male = toStr((n.hei.male / n.sosu.male) * 100);
  r.hei.female = toStr((n.hei.female / n.sosu.female) * 100);
  r.hei.sosu = toStr((n.hei.sosu / n.sosu.sosu) * 100);

  r.mid.male = toStr((n.mid.male / n.sosu.male) * 100);
  r.mid.female = toStr((n.mid.female / n.sosu.female) * 100);
  r.mid.sosu = toStr((n.mid.sosu / n.sosu.sosu) * 100);

  r.low.male = toStr((n.low.male / n.sosu.male) * 100);
  r.low.female = toStr((n.low.female / n.sosu.female) * 100);
  r.low.sosu = toStr((n.low.sosu / n.sosu.sosu) * 100);
  return r;

  function toStr(num) {
    var t = String(round(num, 1));
    if (t.match(/^\d+$/)) {
      t += ".0";
    }
    return t;
  }
}

//四捨五入。引数：precision　小数点以下第２位を四捨五入して１位までとするときは'1'とする。
function round(number, precision) {
  var shift = function (number, precision, reverseShift) {
    if (reverseShift) {
      precision = -precision;
    }
    var numArray = ("" + number).split("e");
    return +(
      numArray[0] +
      "e" +
      (numArray[1] ? +numArray[1] + precision : precision)
    );
  };
  return shift(Math.round(shift(number, precision, false)), precision, true);
}

//iOSデバイスの場合、スクリーンショットボタンの表示文字列を変更する.
function modify_screen_shot_button() {
  var agent = navigator.userAgent.toLowerCase();
  var tiptxt;
  
  if (agent.indexOf("iphone") != -1 || agent.indexOf("ipad") != -1) {
    tiptxt = "表示している人口ピラミッドグラフの画像をこのページ最下部に表示します。画像データを写真(Photos)に保存したいときは、画像をロングタップして保存を選択してください。";
  } else {
    tiptxt = "表示している人口ピラミッドグラフの画像をこのページ最下部に表示します。画像データを保存したいときは、画像の右のチェックボックスをチェックしてからダウンロードボタンをクリックしてください。";
  }
  
  // Tippy.jsでツールチップの内容を更新
  var tipElement = document.getElementById("screen_shot_tooltip");
  if (tipElement && tipElement._tippy) {
    tipElement._tippy.setContent(tiptxt);
  }
}
function time_stamp() {
  var now = new Date();
  var hh = now.getHours();
  var mm = now.getMinutes();
  var ss = now.getSeconds();
  console.log(hh + ":" + mm + ":" + ss);
}

//スクリーンショットを撮る.
function screen_shot() {
  //***********************************************/
  //スクリーンショット用にピラミッドのデザインを一部変更する.
  //***********************************************/

  //***** SVG要素の背景色をなくす *****

  // 背景用のrect要素を取得
  var svgElement = document.getElementById("pyramid-svg");
  var bgRect = svgElement.querySelector('rect[fill="#f8f9fa"]');

  // 現在のスタイルを保存
  var originalBgColor = svgElement.style.backgroundColor;
  var originalRectFill = bgRect ? bgRect.getAttribute("fill") : null;

  // 背景色を無くす
  svgElement.style.backgroundColor = "transparent";
  if (bgRect) {
    bgRect.setAttribute("fill", "transparent");
  }

  //***** #basic_dataブロックをスクリーンショット撮影範囲内に移動 *****
  var basicData = document.getElementById("basic_data");
  var originalBasicLeft = basicData.style.left;
  var originalBasicTop = basicData.style.top;
  var originalBasicPosition = basicData.style.position;
  
  // 現在の位置を取得
  var basicRect = basicData.getBoundingClientRect();
  var svgRect = svgElement.getBoundingClientRect();
  
  // スクリーンショット撮影範囲内に移動（左に幅分、上に高さ分移動）
  var newLeft = basicRect.left - basicRect.width + 10; // 左に幅分 + 10px余白
  var newTop = basicRect.top - basicRect.height/2 + 10;  // 上に高さ分 + 10px余白
  
  // 位置を絶対座標で設定
  basicData.style.position = "fixed";
  basicData.style.left = newLeft + "px";
  basicData.style.top = newTop + "px";
  basicData.style.zIndex = "9999"; // 最前面に表示


  //***** 3区分別人口の中位階層の入力欄を単純なテキストに *****
  var s = document.getElementById("smiddle");
  if (s) {
    var e = document.getElementById("emiddle");
    var title = document.getElementById("kubun2_title");
    var alt_txt = s.value + "歳〜" + e.value + "歳";
    var org_txt = title.innerHTML;
    title.innerHTML = alt_txt;
  }

  //***** グラフタイトルとグラフ本体部分だけのスクリーンショットを撮るために撮影範囲を決める. *****
  var h2 = document.getElementById("h2");
  var rect1 = h2.getBoundingClientRect();
  var rect2 = svgElement.getBoundingClientRect();
  var basicData = document.getElementById("basic_data");
  var rect3 = basicData.getBoundingClientRect();

console.log("SVG.right", rect2.right);
console.log("SVG.bottom", rect2.bottom);
console.log("basicData.left", rect3.left);
console.log("basicData.right", rect3.right);
console.log("basicData.top", rect3.top);
console.log("basicData.bottom", rect3.bottom);

  // 全ての要素を含む範囲を計算
  var minLeft = Math.min(rect1.left, rect2.left, rect3.left);
  var maxRight = Math.max(rect1.right, rect2.right, rect3.right);
  var minTop = Math.min(rect1.top, rect2.top, rect3.top);
  var maxBottom = Math.max(rect1.bottom, rect2.bottom, rect3.bottom);

  var x_pos = minLeft;
  var y_pos = minTop;
  var c_width = maxRight - minLeft;
  var c_height = maxBottom - minTop;

  window.scrollTo(0, 0);

  html2canvas(document.body, {
    x: x_pos - 20,
    y: y_pos - 30,
    width: c_width + 50,
    height: c_height + 50,
    windowWidth: c_width,
    windowHeight: c_height,
    scale: 3,
  });

  html2canvas(document.body, {
    x: -20,
    y: -30,
    width: c_width + 30,
    height: c_height + 30,
    windowWidth: c_width,
    windowHeight: c_height,
    scale: 3,
  }).then(function (canvas) {
    var imageData = canvas.toDataURL();

    //--消去ボタンとダウンロードボタンをいったん削除する(2つめ以降のスクリーンショットのとき).
    removeButtonSet();
    //--div要素、その中にimg要素、input要素を生成し、img要素にスクリーンショット画像を埋め込む.
    var elm = document.createElement("div");
    elm.setAttribute("style", "display:inline-block");

    var elm1 = document.createElement("img");
    elm1.setAttribute("src", imageData);
    elm1.setAttribute("class", "img_screenshot");
    elm.appendChild(elm1);

    //--スクリーンショット画像の右にチェックボックスを配置する.
    var elm2 = document.createElement("input");
    elm2.setAttribute("type", "checkbox");
    elm2.setAttribute("class", "chk_screenshot");
    elm.appendChild(elm2);

    var anker = document.getElementById("screen_shot_section");
    anker.setAttribute("style", "margin:2em 0 1em 0;");
    anker.setAttribute("data-html2canvas-ignore", "true");
    anker.appendChild(elm);

    appendButtonSet();

    //***** 画面最下部までスクロールし、撮影したスクリーンショットを表示する. *****

    //--(表示してからスクロールするように遅延処理を行う.)
    var c = 0;
    var scroll = setInterval(function () {
      window.scroll(0, document.documentElement.scrollHeight);
      c++;
      //終了条件
      if (c == 3) {
        clearInterval(scroll);
      }
    }, 100);

    //***** グラフデザインを元に戻す. *****

    //--ピラミッドに背景色をつける.
    svgElement.style.backgroundColor = originalBgColor;
    if (bgRect) {
      bgRect.setAttribute("fill", originalRectFill);
    }
    //--#basic_dataブロックを元の位置に戻す
    basicData.style.position = originalBasicPosition;
    basicData.style.left = originalBasicLeft;
    basicData.style.top = originalBasicTop;
    basicData.style.zIndex = "auto";
  });
}

//canvasデータからpng形式のBlobオブジェクトを作成し、
//BlobオブジェクトのURLをimg要素のsrcに設定する。（ブラウザの違いに対応）
function setImageURL(canvas, elm) {
  var imageURL;
  // HTMLCanvasElement.toBlob() が使用できる場合
  if (canvas.toBlob) {
    // canvasの図形をPNG形式のBlobオブジェクトに変換
    canvas.toBlob(function (blob) {
      // BlobオブジェクトにアクセスできるURLを生成
      imageURL = URL.createObjectURL(blob);
      elm.src = imageURL;
    });
    // IE10以降やEDGEで使えるメソッド
  } else if (canvas.msToBlob) {
    // canvasの図形からPNG形式のBlobオブジェクトを取得
    blob = canvas.msToBlob();
    // BlobオブジェクトにアクセスできるURLを生成
    imageURL = URL.createObjectURL(blob);
    elm.src = imageURL;
    // IEとEDGEの場合 navigator.msSaveBlob() でBlobオブジェクトを保存できるメソッドがある
    link.addEventListener("click", function (ev) {
      ev.preventDefault();
      navigator.msSaveBlob(blob, "canvas.png");
    });
    // Blobオブジェクトに変換できない場合はPNG形式のデータURIスキームとして出力
  } else {
    imageURL = canvas.toDataURL();
    // 要素にURLを適用
    elm.src = imageURL;
  }
}

//チェックされたスクリーンショット画像をダウンロードする.
function downloadScreenShot() {
  //画像データのダウンロード
  function downloadImage(img) {
    var imgData = img.getAttribute("src");
    const elm = document.createElement("a");
    elm.setAttribute("href", imgData);
    elm.setAttribute("download", "pyramid(" + dateTime("+sec") + ").png");
    elm.style.display = "none";
    document.body.appendChild(elm);
    elm.click();
    document.body.removeChild(elm);
  }
  var chkboxs = document.getElementsByClassName("chk_screenshot");
  var chksu = chkboxs.length;
  var chked = countChekedScreenShot(chkboxs);
  if (chked > 0) {
    for (var i = 0; i < chksu; i++) {
      if (chkboxs[i].checked) {
        var img = chkboxs[i].previousElementSibling;
        downloadImage(img);
      }
    }
  } else if (chksu == 1) {
    var img = chkboxs[0].previousElementSibling;
    downloadImage(img);
  } else {
    t = "チェックがありません.";
    m =
      "保存したい画像の右側にあるチェックボックスをチェックしてからダウンロードボタンをクリックしてください.";
    msgBox(t, m);
  }
}

//チェックされたスクリーンショット画像を消去する.
function removeScreenShot() {
  var chkboxs = document.getElementsByClassName("chk_screenshot");
  var chksu = chkboxs.length;
  var chked = countChekedScreenShot(chkboxs);
  if (chked > 0) {
    for (var i = chksu; i > 0; i--) {
      if (chkboxs[i - 1].checked) {
        var anker = document.getElementById("screen_shot_section");
        anker.removeChild(chkboxs[i - 1].parentNode);
      }
    }
    if (chksu == chked) {
      removeButtonSet();
    }
  } else if (chksu == 1) {
    var anker = document.getElementById("screen_shot_section");
    anker.removeChild(chkboxs[0].parentNode);
    removeButtonSet();
  } else {
    t = "チェックがありません.";
    m =
      "消去したい画像の右側にあるチェックボックスをチェックしてから消去ボタンをクリックしてください.";
    msgBox(t, m);
  }
}

//スクリーンショットのチェック済み数
function countChekedScreenShot(chkboxs) {
  var chksu = chkboxs.length;
  var chked = 0;
  for (var i = chked; i < chksu; i++) {
    if (chkboxs[i].checked) {
      chked++;
    }
  }
  return chked;
}

//スクリーンショット用ボタンセットを付加する.
function appendButtonSet() {
  var agent = navigator.userAgent.toLowerCase();
  if (agent.indexOf("iphone") != -1 || agent.indexOf("ipad") != -1) {
    var ios = true; // iOS（iPhone、iPad）である。
  } else {
    var ios = false;
  }
  var elm = document.createElement("p");
  elm.setAttribute("id", "buttonSet");
  var button = document.createElement("input");
  button.setAttribute("type", "button");
  button.setAttribute("onClick", "removeScreenShot()");
  button.setAttribute("value", "イメージ消去");
  elm.appendChild(button);
  if (ios == false) {
    var button2 = document.createElement("input");
    button2.setAttribute("type", "button");
    button2.setAttribute("onClick", "downloadScreenShot()");
    button2.setAttribute("value", "ダウンロード");
    elm.appendChild(button2);
  }
  var anker = document.getElementById("screen_shot_section");
  anker.appendChild(elm);
}

//スクリーンショット用ボタンセットを削除する.
function removeButtonSet() {
  var btnp = document.getElementById("buttonSet");
  if (btnp) {
    var anker = document.getElementById("screen_shot_section");
    anker.removeChild(btnp);
  }
}

function msgBox(title, message) {
  var strTitle = title;
  var strComment = message;
  $("#dialog").text(strComment);
  $("#dialog").dialog({
    modal: true,
    title: strTitle,
    buttons: {
      OK: function () {
        $(this).dialog("close");
      },
    },
  });
}

//　未使用のコード(サーバ側で処理している.)
function isOnline() {
  var isOnline = navigator.onLine;
  if (isOnline === true) {
    return true;
  } else if (isOnline === false) {
    return false;
  } else {
    return "不明です.";
  }
}

//市区年齢別人口のHTMLから人口総数を取得する.
function get_sosu(html) {
  var str = html.replace(/\n/gm, "").replace(/,|<\/?strong>|<\/?b>/g, "");
  var ary = str.match(/<td[^>]+>総\s*数<\/td><td>([,\d]+)<\/td>/);
  var sosu = ary[1];
  return sosu;
}

//市区年齢別人口のHTMLから年齢別人口の配列を作成する.
//戻り値：[["総数","0","1"･･･"100歳以上"],[男女計の数値配列],[男性人口の数値配列],[女性人口の数値配列]]
function htmlToArray(html) {
  str = html.replace(/\n/gm, "").replace(/,|<\/?strong>|<\/?b>/g, "");
  str = zenToHan(str);
  var ary = str.match(
    /<td[^>]+?>(総\s*数|\d\d?|100歳以上)<\/td>(<td>\d+<\/td>)+/g
  );
  var nenrei = [];
  var total = [];
  var male = [];
  var female = [];
  for (var i = 0; i < ary.length; i++) {
    var num = ary[i].match(
      />([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)</
    );
    nenrei[i] = num[1];
    total[i] = Number(num[2]);
    male[i] = Number(num[3]);
    female[i] = Number(num[4]);
  }
  var data = [];
  data.push(nenrei);
  data.push(total);
  data.push(male);
  data.push(female);
  //alert(JSON.stringify(data));
  return data;
}
function myFunc() {
  console.trace();
}
