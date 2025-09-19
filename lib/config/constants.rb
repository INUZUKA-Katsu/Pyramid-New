# -*- coding: utf-8 -*-

# 横浜市の人口ピラミッドアプリケーション用定数定義
module PyramidConstants
  # 横浜市サイト関連
  SHI_HOST = "https://www.city.yokohama.lg.jp"
  TOKEI_PORTAL = "/city-info/yokohamashi/tokei-chosa/portal"
  CHO_TOP = "/jinko/chocho/nenrei"
  CHO_CSV = "/jinko/chocho/nenrei/<gen>cho-nen.files/<ku><nengetsu>.csv"
  KU_JUKI_TOP = "/jinko/nenrei/juki"
  
  # ファイルパステンプレート
  JSON_FILE_S3 = "Pyramid/nenreibetsu/<ku><nengetsu>-j.txt"  # 市区別推計人口データ
  JSON_FILE_SYORAI = "/syoraisuikei/<nen>-suikei.txt"        # 市将来推計人口データ
  JSON_FILE_KUJUKI_S3 = "Pyramid/jukijinko/<ku><nen>-t.txt"  # 区別住基人口データ（現在は未使用）
  JSON_FILE_KU_SYORAI = "/syoraisuikei/kubetsu/<ku>-<nen>-suikei.txt" # 区別将来推計人口データ
  CSV_FILE_S3 = "Pyramid/nenreibetsu/<ku><nengetsu>.csv"     # 町丁別データファイル
  SHIKU_CSV_FILE = "/e3yokohama<nengetsu>/e3<ku><nengetsu>.csv"
  AYUMI_CSV_FILE = "/ayumi/ayumi.csv"                        # 市長期時系列データ
  AYUMI_KU_FILE = "/ayumi/ku/<ku><nengetsu>-5g.txt"          # 区別長期時系列データ
    
  # オプションファイル
  SHI_OPTION_FILE_S3 = "Pyramid/option/shi-option.txt"
  KU_OPTION_FILE_S3 = "Pyramid/option/ku-option.txt"
  CHO_OPTION_FILE_S3 = "Pyramid/option/cho-option.txt"
  AYUMI_OPTION_FILE_S3 = "Pyramid/option/ayumi-option.txt"
  SYORAI_OPTION_FILE_S3 = "Pyramid/option/syorai-option.txt"
  KU_JUKI_OPTION_FILE_S3 = "Pyramid/option/kujuki-option.txt"
  # 開発中代替ファイル
  KU_OPTION_FILE = "/option/ku-option.txt"

  # ディレクトリ
  DIR_SHIKU_JSON_S3 = "Pyramid/nenreibetsu/"
  
  # 区名マッピング
  KU_NAME_MAP = {
    "tsurumi" => "鶴見区",
    "kanagawa" => "神奈川区", 
    "nishi" => "西区",
    "naka" => "中区",
    "minami" => "南区",
    "konan" => "港南区",
    "hodogaya" => "保土ケ谷区",
    "asahi" => "旭区",
    "isogo" => "磯子区",
    "kanazawa" => "金沢区",
    "kohoku" => "港北区",
    "midori" => "緑区",
    "aoba" => "青葉区",
    "tsuzuki" => "都筑区",
    "totsuka" => "戸塚区",
    "sakae" => "栄区",
    "izumi" => "泉区",
    "seya" => "瀬谷区",
    "age" => "横浜市"
  }.freeze
  
  # 年号変換テーブル
  ERA_TABLE = {
    heisei: { start: 1989, end: 2019, offset: 1988, name: "平成" },
    reiwa: { start: 2020, end: 2999, offset: 2018, name: "令和" },
    showa: { start: 1926, end: 1988, offset: 1925, name: "昭和" },
    taisho: { start: 1912, end: 1925, offset: 1911, name: "大正" }
  }.freeze
end

