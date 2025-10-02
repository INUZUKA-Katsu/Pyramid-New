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
  console.warn("on_page_load get_selected_nengetsu()",get_selected_nengetsu());
  redisplay_pyramid();
  console.log("redisplay_pyramid");
  //************初期設定2****************
  //端末へのデータ保存のチェックボックス表示を各人の既定値にする.
  //if (lStorage == "use") {
  //  localStorage_defautSetting();
  //}
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
  //if ($nengetsu.match(/年/)) {
  //  $nengetsu = "9301";
  //  document.getElementById("shiku_year").value = $nengetsu;
  //} else if ($nengetsu.match(/^\d{6}$/) && Number($nengetsu) < 199301) {
  //  $nengetsu = "199301";
  //  document.getElementById("shiku_year").value = $nengetsu;
  //}
  //alert("change_shiku");
  change_shiku_option();
  //alert("change_shiku_option");
  change_display("shiku", $nengetsu);
}
//「地域別人口ピラミッドのための町丁名の指定」リンクをクリックしたときの処理
function showChoSection() {
  const choElement = document.getElementById("cho");
  const windowWidth = window.innerWidth;
  
  if (choElement) {
    // 1380px以下の場合は#choを表示
    if (windowWidth <= 1380) {
      choElement.style.display = "inline-block";
    }
    
    // #choセクションにスクロール
    choElement.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
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
  restore_cho_display();
  if (get_pyramid_mode() == "shiku") {
    return;
  }
  $nengetsu = set_another_nengetsu("shiku");
  change_display("shiku_not_refresh_cholist", $nengetsu);

  function restore_cho_display() {
    // #choを元の状態に戻す(画面が狭いため非表示だったときは非表示)
    const choElement = document.getElementById("cho");
    const windowWidth = window.innerWidth;
    if (choElement) {
    
      if (windowWidth <= 1380) {
        // 1380px以下の場合は非表示に戻す
        choElement.style.display = "none";
      } else {
        // 1380pxより大きい場合は表示状態に戻す
        choElement.style.display = "inline-block";
      }
    }
  }
}

//市区用の年月日セレクトボックスを変更したときの処理
function change_shiku_year() {
  set_comment("off");
  shiku_pyramid();
  $nengetsu = get_selected_nengetsu();
}

//町丁別用の年月日セレクトボックスを変更したときの処理
function change_cho_year() {
  set_comment("off");
  cho_pyramid();
}

//市区用の年月日を設定してピラミッドを更新する.
//動作するが未使用(select_nengetsu()との異同未解明)
function set_shiku_nengetsu(nengetsu) {
  let elm = document.getElementById('shiku_year');
  elm.addEventListener('change', function() {
    console.log('shiku_year changed');
  });
  elm.value = nengetsu;
  elm.dispatchEvent(new Event('change'));
  $nengetsu = nengetsu;
}
//set_shiku_nengetsu('201501');

//町丁別用の年月日を設定してピラミッドを更新する.
function set_cho_nengetsu(nengetsu) {
  let elm = document.getElementById('cho_year');
  elm.addEventListener('change', function() {
    console.log('cho_year changed');
  });
  elm.value = nengetsu;
  elm.dispatchEvent(new Event('change'));
  $nengetsu = nengetsu;
}
//set_cho_nengetsu('201509');

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
function change_display(pyramode, nengetsu) {
  set_comment("off");
  switch (pyramode) {
    case "shiku":
      set_pyramid_mode("shiku");
      shiku_pyramid(nengetsu);
      cho_list(); //町丁名リストの表示/非表示
      change_cmbbox_display("shiku"); //年月選択セレクトボックスの市区用と町丁別用の表示切り替え
      break;
    case "shiku_not_refresh_cholist":
      set_pyramid_mode("shiku");
      shiku_pyramid(nengetsu);
      change_cmbbox_display("shiku");
      break;
    case "cho":
      set_pyramid_mode("cho");
      //町丁別ピラミッド作成
      if (cho_pyramid(nengetsu) == false) {
        return;
      }
      change_cmbbox_display("cho");
  }
}
//市区ピラミッドを作成する.
function shiku_pyramid(nengetsu) {
  myFunc()
  //ローカルデータがあればローカルデータで描画する.
  var ans = escape_ajax("shiku_json", nengetsu);
  if (ans === false || ans == undefined) {
    ajax("shiku_json", nengetsu, 1);
  }
}
//町丁別ピラミッドを作成する.
function cho_pyramid(nengetsu) {
  //alert("cho_pyramid => "+nengetsu);
  var checked = get_selected_cho();
  //町丁が選択されていないときはメッセージを表示して終了.
  if (checked == null) {
    return false;
  }
  //ローカルデータがあればローカルデータで描画する.
  var ans = escape_ajax("cho_csv", nengetsu);
  if (ans === false) {
    //ローカルデータが存在しないときはサーバから取得して描画する.
    ajax("cho_json", nengetsu, 1);
  }
  //adjust_title_size(checked.join(","));
}
//ローカルデータを読み出して描画処理する.（ピラミッドのみ？町丁名一覧は？）
//mode: shiku_json, cho_json, cho_csv, cho_list
function escape_ajax(mode, nengetsu) {
  //console.warn(`escape_ajax開始: mode=${mode}, nengetsu=${nengetsu}`);
  function isJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
  var key = isLocalData(mode, nengetsu);
  //console.warn(`escape_ajax: key=${key}`);
  if (key != false) {
    //console.log("step1.5-1");
    var response = localStorage_get(key);
    //console.warn(`escape_ajax: response=${response}`);
    //不正なデータであればローカルデータを削除してAjaxに進む.
    if (mode == "shiku_json" || mode == "cho_json") {
      if (isJson(response) == false) {
        localStorage.removeItem(key);
        return false;
      }
    }else if (/content-type: text\/html/i.test(response)) {
      //responseがエラーであることを示すhtmlがそのままストレージに保存されてしまうことがある。
      localStorage.removeItem(key);
      return false;
    }
    //console.warn(`escape_ajax: step2`);
    if (mode == "cho_csv" && response.slice(0, 2) != "町名") {
      try {
        response = JSON.parse(response).csv;
      } catch (e) {
        localStorage.removeItem(key);
        return false;
      }
    }
    //console.warn(`escape_ajax: step3`);
    //console.warn(`mode:${mode}, nengetsu:${nengetsu}, response:${response}`);
    try {
      modify_html(response, mode, nengetsu);
    } catch (e) {
      localStorage.removeItem(key);
      return false;
    }
    //console.warn(`escape_ajax: step4`);
    return true;
  } else {
    //console.warn(`escape_ajax: step5`);
    //console.log("step1.5-2");
    return false;
  }
}
//サーバからデータを取得して描画処理する.
//mode: shiku_json, cho_json, syorai_json, cho_csv, cho_csv_for_save, all_option, shiku_option, cho_list
function ajax(mode, nengetsu, i) {
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
        modify_html(response, mode, nengetsu);
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
function modify_html(response, mode) {
  //s=mode+"の戻り値\n"+nengetsu+"\n"+response;
  switch (mode) {
    case "shiku_json":
    case "cho_json":
      try {
        var pyramidData = JSON.parse(response);

        //戻り値が配列の場合はオブジェクトに変換する。
        let objectData = getObjectPiramidData(pyramidData);

        //ピラミッドを作成する。
        change_pyramid(objectData);
      } catch (e) {
        //サーバ側のrubyのJSON作成処理で文字コードに起因するエラーが発生した場合、
        //CSVファイルを返すようにした。CSVはJSON.parseでエラーになるのでリカバリーする.
        if (response.slice(0, 2) == "町名") {
          //console.log("makePyramidData呼出し");
          var pyramidData = makePyramidData(response);
          change_pyramid(pyramidData);
        } else {
          myFunc();
          console.log(e.name + "\n" + e.message);
        }
      }
      break;
    case "cho_csv":
      var pyramidData = makePyramidData(response);
      change_pyramid(pyramidData);
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
function change_pyramid(objectData, animeMode) {
  //console.log("change_pyramid開始");
  //console.log(objectData["kijunbi"]);
    
  let isAnm ;
  let isInterpolation ;
  if ( animeMode != undefined) {
    isAnm = true;
    isInterpolation = animeMode.isInterpolation;
    $nengetsu = animeMode.nengetsu;
  } else {
    isAnm = false;
    isInterpolation =false ;
  }
  //console.warn(`🎨 change_pyramid呼び出し: isAnm=${isAnm}, isInterpolation=${isInterpolation}, kijunbi=${objectData["kijunbi"]}`);
  //console.warn("1 get_selected_nengetsu()",get_selected_nengetsu());
  //console.warn("1 $nengetsu",$nengetsu);


  //ピラミッドを描画する。
  if (window.pyramidRenderer == null) {
    renderPyramid(objectData, animeMode);
  } else {
    window.pyramidRenderer.updateData(objectData, animeMode);
  }

  //その他の情報

  //console.log("change_pyramid step2");
  //console.warn("2 get_selected_nengetsu()",get_selected_nengetsu());
  //console.warn("2 $nengetsu",$nengetsu);  
  var shiku = objectData["shiku"];
  var not_exist = objectData["not_exist"];
  var kijunbi = objectData["kijunbi"];
  var source = objectData["source_url"];
  
  data_key = objectData.hasOwnProperty("kakusai_betsu") ? "kakusai_betsu" : "five_year_age_group";

  // デバッグ: kakusai_betsuの構造を確認
  //console.log("change_pyramid: kakusai_betsu配列の長さ:", objectData[data_key].length);
  //console.log("change_pyramid: kakusai_betsu[0]の内容:", objectData[data_key][0]);
  //console.log("change_pyramid: kakusai_betsu[0][1] (総数):", objectData[data_key][0][1]);
  //console.log("change_pyramid: kakusai_betsu[0][2] (男性):", objectData[data_key][0][2]);
  //console.log("change_pyramid: kakusai_betsu[0][3] (女性):", objectData[data_key][0][3]);
  
  // 重要な情報をalertで表示
  if (objectData[data_key] && objectData[data_key].length > 0) {
    const firstElement = objectData[data_key][0];
    console.warn(`📊 人口データ表示:\n` +
          `kakusai_betsu配列長: ${objectData[data_key].length}\n` +
          `kakusai_betsu[0]: ${JSON.stringify(firstElement)}\n` +
          `総数: ${firstElement[1]}\n` +
          `男性: ${firstElement[2]}\n` +
          `女性: ${firstElement[3]}\n` +
          `最初の要素[0]: ${firstElement[0]} (${typeof firstElement[0]})`);
  } else {
    console.warn(`❌ エラー: kakusai_betsuが空または未定義です！`);
  }
  
  var sosu = objectData[data_key][0][1];
  var male = objectData[data_key][0][2];
  var female = objectData[data_key][0][3];
  var kakusaiData = objectData[data_key].filter((item) =>
    /\d+(以上)?/.test(item[0])
  );

  //console.log("change_pyramid step2.1");
  //console.warn("3 get_selected_nengetsu()",get_selected_nengetsu());
  //console.warn("3 $nengetsu",$nengetsu);
  
  if (!isAnm) displey_hitoku_comment(objectData["hitoku"]);

  //console.log("change_pyramid step3");

  // グローバル変数を初期化
  $kakusaiObject = {};

  kakusaiData.forEach(function (val) {
    var nenrei = val[0];
    var m_nin = val[2];
    var f_nin = val[3];
    $KakusaiObject[nenrei] = {
      male: m_nin.replace(",", ""),
      female: f_nin.replace(",", ""),
    };
  });


  if (!isAnm){
    if (
      $nengetsu == "199501" &&
      (shiku == "港北区" ||
        shiku == "緑区" ||
        shiku == "都筑区" ||
        shiku == "青葉区")
    ) {
      shiku = "港北・緑・青葉・都筑４区<span class='small'> (分区直後で区別データなし)</span>";
    }
  }

  var h2 = shiku + '<span>' + kijunbi + "</span>";
  h2 = h2.replace("将来推計人口", '<span class="small">将来推計人口</span>');
  h2 = h2.replace(
    /10月(1|１)日(現在)?/,
    '10月1日現在<span class="small">(国勢調査結果)</span>'
  );
  //h2(タイトル)を西暦主体に書き直す.
  h2 = change_seireki_main(h2);
  h2 = add_gengo_to_syoraisuikei(h2);
  
  KU_START = {
    港北区: "1939年(昭和14年)4月1日",
    戸塚区: "1939年(昭和14年)4月1日",
    南区: "1943年(昭和18年)12月1日",
    西区: "1944年(昭和19年)4月1日",
    金沢区: "1948年(昭和23年)5月15日",
    港南区: "1969年(昭和44年)10月1日",
    旭区: "1969年(昭和44年)10月1日",
    緑区: "1969年(昭和44年)10月1日",
    瀬谷区: "1969年(昭和44年)10月1日",
    泉区: "1986年(昭和61年)11月3日",
    栄区: "1986年(昭和61年)11月3日",
    青葉区: "1994年(平成6年)11月6日",
    都筑区: "1994年(平成6年)11月6日"
  }

  if (not_exist != undefined && not_exist != "") {
    if (not_exist.match(/区$/)) {
      comment = `${not_exist}はまだありません.${not_exist}は${KU_START[not_exist]}に新設されました.`;
    } else {
      comment =
        `${not_exist}のデータはありません.住居表示等で新しい町名ができる前と思われます.`;
    }
    h2 = h2 + "<br><span id='red'>(" + comment + ")</span>";
  }
  console.log("change_pyramid step5");

  document.getElementById("h2").innerHTML = h2;
  adjust_title_size("h2");

  if (!isInterpolation) {
    document.getElementById("sosu").innerHTML = plus_comma(sosu);
    document.getElementById("male").innerHTML = plus_comma(male);
    document.getElementById("female").innerHTML = plus_comma(female);
  }
  document.getElementById("source").innerHTML = source_str(shiku, source);

  //if (!isAnm) basic_data_position();
  
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

    function get_cho_csv_url(nengetsu) {
      let year = Number(nengetsu.slice(0,4));
      let gnen = "";
      if (year <= 2019) {
        gnen = "h" + String(year - 2000 + 12);
      } else {
        gnen = "r" + String((year - 2000 - 18 ));
      }
      return cho_csv_url.replace("<gnen>", gnen);
    }

    var nengetsu = get_selected_nengetsu();
    if (nengetsu == undefined || isAnm) {
      nengetsu = $nengetsu;
    }

    console.warn(`🌹source_str shiku: ${shiku}、nengetu: ${nengetsu}、nengetu: ${nengetsu}`);
    console.warn(`🌹source: ${source}`);
    
    //掲載ページ
    const choki_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/choki.html";
    const syorai_url ="https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.html";
    const suikei_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/nenrei/suikei.html";
    const R2_kokucho_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/kekka/kokusei/r2/r2-01jinko.html";
    const tokeisyo_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/tokeisho/02.html";
    const chobetsu_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/";
    //データファイル
    const shi_syorai_excel_url = "https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.files/0046_20240326.xlsx";
    const ku_syorai_excel_url = "https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.files/0048_20240410.xlsx";
    const cho_csv_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/chocho/nenrei/<gnen>cho-nen.html";
    const tokeisy_excel_url = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/tokeisho/02.files/t020500.xlsx";

    let stat_str = "";

    if (shiku == "横浜市" && nengetsu != "new" && nengetsu < "200301") {
      stat_str = "データの出典： 横浜市統計情報ポータル ";
      stat_str += `<a href="${choki_url}">長期時系列データ</a>`;
      stat_str += "「04 年齢(各歳)、男女別人口 - 市」";

    } else if (shiku == "横浜市将来推計人口") {
      stat_str = `データの出典： <a href="${syorai_url}">横浜市将来推計人口</a>`;
      stat_str += "「横浜市の男女別・各歳・年齢３区分・年齢４区分・年齢５歳階級別人口」";
      source = shi_syorai_excel_url;

    } else if (shiku == "横浜市" && (nengetsu == "new" || nengetsu.slice(4,6) == "01")) {
      stat_str = "データの出典： 横浜市統計情報ポータル ";
      stat_str += `<a href="${suikei_url}">市・区の年齢別の人口（推計人口による、１月１日現在）</a>`;
    
    } else if (shiku == "横浜市" && nengetsu == "202010") {
      stat_str = "データの出典： 横浜市統計情報ポータル ";
      stat_str += `<a href="${R2_kokucho_url}">令和2年国勢調査 人口等基本集計結果 第2表</a>`;
    
    } else if (shiku.slice(-1) == "区" && nengetsu != "new" && nengetsu < "199301" ){
      stat_str = "データの出典： 横浜市統計情報ポータル ";
      stat_str += `<a href="${choki_url}">長期時系列データ</a>`;
      stat_str += "「05 年齢(5歳階級)、男女別人口 - 区」";
      
    } else if (shiku.slice(-7) == "区将来推計人口"){
      stat_str = `データの出典： <a href="${syorai_url}">横浜市将来推計人口</a>`;
      stat_str += "「行政区別の男女別・各歳・年齢３区分・年齢４区分・年齢５歳階級別人口」";
      source = ku_syorai_excel_url;

    } else if (shiku.slice(-1) == "区" && nengetsu >= "200001" ){
      stat_str = "データの出典： 横浜市統計情報ポータル ";
      stat_str += `<a href="${suikei_url}">市・区の年齢別の人口（推計人口による、１月１日現在）</a>`;
      stat_str += `又は<a href="${tokeisyo_url}">「横浜市統計書」</a>第5表`;
      if (nengetsu <= "200201") {
        //H12,13,14は、横浜市統計書のページにのみ掲載
        source = tokeisy_excel_url;
      }

    } else if (shiku.slice(-1) == "区" && nengetsu.slice(4,6) == "01"){
      stat_str = "データの出典： 横浜市統計ポータルサイト ";
      stat_str += `<a href="${suikei_url}">市・区の年齢別の人口（推計人口による、１月１日現在）</a>`;
      stat_str += "（1999年以前のものは現在はホームページ非掲載）"
      source = "";

    } else if (nengetsu.slice(4,6) == "09"){
      stat_str = "データの出典： 横浜市統計情報ポータル ";
      stat_str += `<a href="${chobetsu_url}">町丁別の年齢別人口（住民基本台帳による、３月・９月末現在）</a>`;
      source = get_cho_csv_url(nengetsu);

    } else {
      stat_str = "データの出典： 横浜市統計情報ポータル(詳細不明) ";
    }
    //if (shiku == "横浜市" && nengetsu && typeof nengetsu === 'string' && nengetsu.match(/年/)) {
    //  var stat1 = "「横浜市 人口のあゆみ 2010」";
    //  var stat2 = "第4表 年齢別各歳別男女別人口";
    //  var url =
    //    "http://www.city.yokohama.lg.jp/ex/stat/jinko/ayumi/index-j.html";
    //  stat = "<a href='" + url + "'>" + stat1 + "</a>" + stat2;
    //} else if (nengetsu && typeof nengetsu === 'string' && nengetsu.match(/\d\d\d\dft/)) {
    //  var str = "データの出典： 横浜市政策局ホームページ ";
    //  var stat = "横浜市将来推計人口";
    //  var url =
    //    "https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.html";
    //  stat = "<a href='" + url + "'>" + stat + "</a>";
    //} else if (shiku == "横浜市" || shiku.slice(-1) == "区") {
    //  if (source.match(/kokusei/)) {
    //    var stat = "年齢別男女別人口（国勢調査）";
    //  } else {
    //    var stat = "年齢別男女別人口（推計人口）";
    //  }
    //} else {
    //  var stat = "町丁別年齢別男女別人口（登録者数）";
    //}
    var source_str = stat_str ;
    if (source != "") {
      source_str += `<span class="inline-block"><a href="${source}">${source}</a></span>`;
    }
    return source_str;
  }
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
  if (objectData.hasOwnProperty("kakusai_betsu")){
    objectData["kakusai_betsu"] = make_kakusaiData(sumArray);
  } else {
    objectData["five_year_age_group"] = make_kakusaiData(sumArray);
  }

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
function adjust_title_size(target_elm, base_font_size = 28) {
  let h2Eelement;
  if (target_elm instanceof HTMLElement) {
    h2Eelement = target_elm;
  } else {
    h2Eelement = document.getElementById(target_elm);
  }
  
  let fontSize = base_font_size;
  h2Eelement.style.fontSize = fontSize + "px";
  while (h2Eelement.scrollHeight > h2Eelement.clientHeight && fontSize > 8) {
    fontSize--;
    h2Eelement.style.fontSize = fontSize + "px";
  }
  console.log("adjust_title_size 終了!");
}

//市区の選択が横浜市か区かを判別して、町丁一覧の表示・非表示を切り替える処理.
function cho_list() {
  console.log("cho_list開始");
  var index = document.getElementById('shiku').selectedIndex;
  var shiku = document.getElementById('shiku').options[index].value;
  if (shiku == "age") {
    document.getElementById("cho_list").innerHTML = "";
    document.getElementById("cho").style.display = "none";
    document.getElementById("link").style.opacity = "0";
    document.getElementById("link").style.visibility = "hidden";

  } else {
    //ローカルデータがあればローカルデータで描画する.
    if (escape_ajax("cho_list") == false) {
      //ローカルデータが存在しないときはサーバから取得して描画する.
      ajax("cho_list");
    }
    document.getElementById("cho").style.display = "";
    document.getElementById("cho_year").style.display = "inline-block";
    document.getElementById("link").style.visibility = "visible";
    document.getElementById("link").style.opacity = "1";
  }
}
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
    console.log(`getOptionsWithCache(${optionType}): ${str}`);

    if (!str) {
      // キャッシュがない場合はサーバーから取得
      ajax("all_options", null, 1);
      return;
    }
  }
  // $nengetsuが設定されている場合はそれを優先使用（前回データの復元）
  var nengetsu;
  if ($nengetsu && $nengetsu !== 0) {
    nengetsu = $nengetsu;
    console.log(`change_shiku_option: $nengetsuを使用 (${nengetsu})`);
  } else {
    nengetsu = get_selected_nengetsu("shiku");
    if (nengetsu == undefined) {
      nengetsu = $nengetsu;
    }
  }
  //console.log(`change_shiku_option: ${str}`);
  document.getElementById("shiku_year").innerHTML = str;
  select_nengetsu(nengetsu, "shiku");
  
  // セレクトボックスとスライドバーを連動
  setTimeout(() => {
    syncSelectBoxWithSlider('shiku');
  }, 100); // 少し遅延させてDOM更新を待つ
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
  
  // セレクトボックスとスライドバーを連動
  setTimeout(() => {
    syncSelectBoxWithSlider('cho');
  }, 100); // 少し遅延させてDOM更新を待つ
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
      
      // スライドバーの表示/非表示を制御
      const shikuSliderContainer = document.getElementById("shiku-year-slider-container");
      const choSliderContainer = document.getElementById("cho-year-slider-container");
      if (shikuSliderContainer) {
        shikuSliderContainer.style.display = "block";
      }
      if (choSliderContainer) {
        choSliderContainer.style.display = "none";
      }
      break;
    case "cho":
      document.getElementById("shiku_year").style.display = "none";
      document.getElementById("doga").style.display       = "inline-block";
      document.getElementById("cho_year").style.display = "inline-block";
      
      // スライドバーの表示/非表示を制御
      const shikuSliderContainer2 = document.getElementById("shiku-year-slider-container");
      const choSliderContainer2 = document.getElementById("cho-year-slider-container");
      if (shikuSliderContainer2) {
        shikuSliderContainer2.style.display = "none";
      }
      if (choSliderContainer2) {
        choSliderContainer2.style.display = "block";
      }
      break;
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
  var index = document.getElementById('shiku').selectedIndex;
  var cmb_value = document.getElementById('shiku').options[index].value;
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
      var index = document.getElementById('shiku_year').selectedIndex;
      var cmb_value = document.getElementById('shiku_year').options[index].value;
      console.log(`🔍 get_selected_nengetsu: shiku_year selectedIndex = ${index}, value = "${cmb_value}"`);
    } else if (pyramode == "cho") {
      var index = document.getElementById('cho_year').selectedIndex;
      var cmb_value = document.getElementById('cho_year').options[index].value;
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
  if (key.slice(-6) == "option") {
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
    if (key.slice(-4) == ".csv") {
      var val = localStorage[key];
      if (val.slice(0, 2) == "町名") {
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
    if (a.slice(-3) < b.slice(-3)) {
      return -1;
    } else if (a.slice(-3) > b.slice(-3)) {
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
    var nen = Number(nengetsu.slice(0, 4));
    var tsuki = Number(nengetsu.slice(4, 6));
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
      var pre_ku_nen = ku.options[get_option_id(ku, "new") + 1].value.slice(0,4);
      if (cho.options[0].value.slice(0, 4) == pre_ku_nen) {
        var i = 0;
      } else {
        var i = 1;
      }
    } else {
      var nen = Number(nengetsu.slice(0, 4));
      var tsuki = Number(nengetsu.slice(4, 6));
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
    // 人数表示
    //const showNumbers = localStorage_get("show_ninzu");
    //if (showNumbers == "hidden") {
    //  if (window.pyramidRenderer) {
    //    window.pyramidRenderer.updateOptions({
    //      showNumbers: false
    //    });
    //  }
    //}
    return true;
  } else {
    change_display("shiku");
    return false;
  }
}

function dateTime(arg = "-sec") {
  var day = new Date();
  var y = String(day.getFullYear());
  var M = ("0" + String(day.getMonth() + 1)).slice(-2);
  var d = ("0" + String(day.getDate())).slice(-2);
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
  function zen2han(str) {
    return str.replace(/[０-９]/g, function(match) {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
  }
  //「元号年月日」形式を「西暦年(元号年)月日」形式に変換する。
  console.warn("change_seireki_main hi", hi);
  console.warn("change_seireki_main zen2han(hi)", zen2han(hi));
  hi = zen2han(hi);
  var a = hi.match(/(大正|昭和|平成|令和)(\d+|元).*年\)?/);
  if (!a) {
    console.warn("change_seireki_main 元号が見つかりませんでした");
  }
  var org = a[0];
  console.warn("元号change_seireki_main org", org);
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
//西暦年のみの将来推計人口に括弧書きで元号年を追加する。
function add_gengo_to_syoraisuikei(h2) {
  if (h2.match(/将来推計人口/)) {
    ans = h2.match(/\d\d(?=年)/);
    return `${h2}(令和${ ans[0] - 18 }年)`;
  }else{
    return h2;
  }
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
  //basic_data_position();
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
  //basic_data_position();
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
  var ageGroupData = Object.assign({}, kakusaiData); //kakusaiDataを参照ではなくコピー
  var hei = {};
  hei.male = 0;
  hei.female = 0;
  var mid = {};
  mid.male = 0;
  mid.female = 0;
  var low = {};
  low.male = 0;
  low.female = 0;

  var keys = Object.keys(ageGroupData);
  
  for (i = 0; i < keys.length; i++) {
    var key = keys[i];
    male = Number(ageGroupData[key].male) || 0;
    female = Number(ageGroupData[key].female) || 0;
    
    // 総数等はスキップする
    if (key.match(/総数|合計|年齢不詳/)) {
      continue;
    }
      
    // 年齢範囲を解析
    var ageRange = parseAgeRange(key);
    if (!ageRange) {
      console.log("年齢範囲を解析できませんでした:", key);
      continue;
    }

    if (ageRange.endAge > esai) {
      hei.male += male;
      hei.female += female;
    } else if (ageRange.startAge >= ssai) {
      mid.male += male;
      mid.female += female;
    } else if (ageRange.endAge < ssai) {
      low.male += male;
      low.female += female;
    } else {
      // 境界をまたぐ場合の処理
      var overlapWithMid = Math.max(0, Math.min(ageRange.endAge, esai) - Math.max(ageRange.startAge, ssai) + 1);
      var overlapWithLow = Math.max(0, Math.min(ageRange.endAge, ssai - 1) - ageRange.startAge + 1);
      var overlapWithHei = Math.max(0, ageRange.endAge - Math.max(ageRange.startAge, esai + 1) + 1);
      
      var totalYears = ageRange.endAge - ageRange.startAge + 1;
      
      if (overlapWithMid > 0) {
        mid.male += Math.round(male * overlapWithMid / totalYears);
        mid.female += Math.round(female * overlapWithMid / totalYears);
      }
      if (overlapWithLow > 0) {
        low.male += Math.round(male * overlapWithLow / totalYears);
        low.female += Math.round(female * overlapWithLow / totalYears);
      }
      if (overlapWithHei > 0) {
        hei.male += Math.round(male * overlapWithHei / totalYears);
        hei.female += Math.round(female * overlapWithHei / totalYears);
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

// 年齢範囲を解析するヘルパー関数
function parseAgeRange(ageGroupStr) {
  // 総数や年齢不詳は除外
  if (ageGroupStr.match(/総数|合計|年齢不詳/)) {
    return null;
  }
  
  // 範囲形式（例：「0～4歳」「5～9歳」）
  var rangeMatch = ageGroupStr.match(/(\d+)[～〜](\d+)歳/);
  if (rangeMatch) {
    return {
      startAge: parseInt(rangeMatch[1]),
      endAge: parseInt(rangeMatch[2])
    };
  }
  
  // 以上形式（例：「80歳以上」「100歳以上」）
  var aboveMatch = ageGroupStr.match(/(\d+)歳以上/);
  if (aboveMatch) {
    var age = parseInt(aboveMatch[1]);
    if (age <= 100) {
      return {
        startAge: age,
        endAge: 100 // 最大年齢を100歳とする
      };
    } else {
      return {
        startAge: age,
        endAge: age
      };
    }
  }
  
  // 単一年齢形式（例：「0歳」「1歳」）
  var singleMatch = ageGroupStr.match(/^(\d+)歳$/);
  if (singleMatch) {
    var age = parseInt(singleMatch[1]);
    return {
      startAge: age,
      endAge: age
    };
  }
  
   // 各歳データ形式（例：「0」「1」「2」...「100」）
   var numberMatch = ageGroupStr.match(/^(\d+)$/);
   if (numberMatch) {
     var age = parseInt(numberMatch[1]);
     return {
       startAge: age,
       endAge: age
     };
   }
   
  return null;
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
function time_stamp(){
  var now  = new Date();
  var hh = now.getHours();
  var mm  = now.getMinutes();
  var ss  = now.getSeconds();
  console.log(hh+':'+mm+':'+ss)
}


//***************************************/
//***** スクリーンショット用の補助関数. *****          
//***************************************/
// 背景色などの装飾スタイルの削除
function ClearStyles(clone_pyramid) {
  const elements = [
    { id: 'body', element: document.body },
    { id: 'pyramid-container', element: clone_pyramid },
    { id: 'pyramid-svg', element: clone_pyramid.querySelector("#pyramid-svg") },
  ];
  
  elements.forEach(({ id, element }) => {
    if (!element) return;
    
    // スタイルをクリア
    element.style.background = "transparent";
    element.style.backgroundColor = "transparent";
    element.style.boxShadow = "none";
    element.style.border = "none";
    element.style.borderTop = "none";
    element.style.borderRight = "none";
    element.style.borderBottom = "none";
    element.style.borderLeft = "none";
    
    // SVG要素の場合は、内部の背景rect要素も処理
    if (id === 'pyramid-svg' && element.tagName === 'svg') {
      const originalRenderer = window.pyramidRenderer;
      const cloneRenderer = PyramidSVGRenderer.attach(element, { ...originalRenderer.options });
      cloneRenderer.updateOptions({ backgroundColor: 'transparent' });
    }
  });
  
  // pyramid-containerの::before疑似要素のボーダーを非表示にする
  const pyramidContainer = document.getElementById("pyramid-container");
  if (pyramidContainer) {
    pyramidContainer.classList.add("screenshot-mode");
  }
}

//***************************************/
//******** スクリーンショットをとる *********/          
//***************************************/
function screen_shot() {

  //ピラミッドを90%に縮小 (タイトルのスペースを作るため)
  window.pyramidRenderer.makeSpaceForScreenshot();

  //***** スクリーンショット用にクローンを作成 *****/
  const target = document.querySelector("#pyramid-container");
  const clone_pyramid = target.cloneNode(true);

  // クローンをオフスクリーンに配置
  clone_pyramid.style.width = "1108px";
  clone_pyramid.style.height = "600px";
  clone_pyramid.style.position = "absolute";
  clone_pyramid.style.left = "-9999px";
  document.body.appendChild(clone_pyramid);

  // 関係要素
  const elm_h2 = document.querySelector("#h2");
  const elm_capture_title = clone_pyramid.querySelector("#capture_title");

  //スクリーンキャプチャ用タイトルをセット
  elm_capture_title.style.display = "block";
  elm_capture_title.innerHTML = elm_h2.innerHTML;
  adjust_title_size(elm_capture_title, 20);
  
  //***** bodyの背景色を保存 *****
  const body_bg_color = document.body.style.background;

  //***** 撮影対象のカラースタイルをクリア *****
  ClearStyles(clone_pyramid);

  //***** 対象要素の配置に関わるスタイル一式を保存 *****/
  //const savedPositionStyles = savePositionStyles();

　//クローンのpyramid-blockの位置を取得
  const pyramid_rect = clone_pyramid.getBoundingClientRect();

  let window_width = pyramid_rect.width;
  let window_height = pyramid_rect.height;
  let canvas_width = window_width + 40;
  let canvas_height = window_height + 40;
  
  //***** 3区分別人口の中位階層の入力欄を単純なテキストに *****
  var s = clone_pyramid.querySelector("smiddle");
  var kubun2_title_original = null;
  if (s) {
    var e = clone_pyramid.querySelector("emiddle");
    var title = clone_pyramid.querySelector("kubun2_title");
    var alt_txt = s.value + "歳〜" + e.value + "歳";
    kubun2_title_original = title.innerHTML;  // 元のテキストを保存
    title.innerHTML = alt_txt;
  }

  window.scrollTo(0, 0);

  //***** html2canvasによるスクリーンショット実行 *****/
  html2canvas( clone_pyramid, {
    x: 0,
    y: -20,
    width: canvas_width, //生成する画像の幅
    height: canvas_height, //生成する画像の高さ
    windowWidth: window_width, //描画領域の幅
    windowHeight: window_height, //描画領域の高さ
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
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
  
    //ピラミッドの90%縮小を解除(元に戻す)
    window.pyramidRenderer.restoreSpaceForScreenshot();

    //***** bodyの背景色を復元 *****
    document.body.style.background = body_bg_color;

    // クローンを削除
    document.body.removeChild(clone_pyramid);
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
//デバッグ用（関数の呼出元をコンソールに表示する）
function myFunc() {
  console.trace();
}


