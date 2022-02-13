#coding:utf-8
require 'bundler/setup'
require "time"
require "cgi"
require "kconv"
require "fileutils"
require "net/https"
require 'open-uri'
require 'openssl'
require 'roo'
require 'json'
require 'net/ftp'
require 'net/smtp'
require 'mechanize'
require 'mail'
require 'logger'
require './s3client'
require './get_from_portal_site'
require './make_shiku_option'
require './make_cho_option'

Dir.chdir(__dir__)

S3=S3Client.new

RShiku = {"age"=>"横浜市", "tsurumi"=>"鶴見区", "kanagawa"=>"神奈川区", "nishi"=>"西区", "naka"=>"中区", "minami"=>"南区", "konan"=>"港南区", "hodogaya"=>"保土ケ谷区", "asahi"=>"旭区", "isogo"=>"磯子区", "kanazawa"=>"金沢区", "kohoku"=>"港北区", "midori"=>"緑区", "aoba"=>"青葉区", "tsuzuki"=>"都筑区", "totsuka"=>"戸塚区", "sakae"=>"栄区", "izumi"=>"泉区", "seya"=>"瀬谷区"}
ShiKu = {"横浜市"=>0, "鶴見区"=>1, "神奈川区"=>2, "西区"=>3, "中区"=>4, "南区"=>5, "港南区"=>6, "保土ケ谷区"=>7, "旭区"=>8, "磯子区"=>9, "金沢区"=>10, "港北区"=>11, "緑区"=>12, "青葉区"=>13, "都筑区"=>14, "戸塚区"=>15, "栄区"=>16, "泉区"=>17, "瀬谷区"=>18}

Site = 'https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/'
#市区別年齢別人口（推計人口）のインデックスのページ
Parent_url_shiku = 'jinko/nenrei/suikei.html'
Child_url_shiku  = 'suikei.files/'

#町丁別年齢別人口のインデックスのページ
Parent_url_cho   = "jinko/chocho/nenrei/"
Child_url_cho    = '<gen>cho-nen.files/<ku><nengetsu>.csv'

#市区別年齢別人口（住基人口）のインデックスページ
Parent_url_shikujuki = "jinko/nenrei/juki/"

#ローカルフォルダ
Local_excel_shiku = 'Pyramid/excel/'
Local_json_shiku  = 'Pyramid/nenreibetsu/'
Local_csv_cho     = 'Pyramid/nenreibetsu/'

#オプションファイル
Local_shi_option    = "Pyramid/option/shi-option.txt"
Local_ku_option     = "Pyramid/option/ku-option.txt"
Local_ayumi_option  = "Pyramid/option/ayumi-option.txt"
Local_syorai_option = "Pyramid/option/syorai-option.txt"
Local_cho_option    = "Pyramid/option/cho-option.txt"
Local_kujuki_option = "Pyramid/option/kujuki-option.txt"


$logger = Logger.new(STDOUT)

  #********************************
  #                               *
  # 1 推計人口の新データ確認、更新処理  *
  #                               *
  #********************************
  
  #ローカルにない市区年齢別人口のexcelファイルをダウンロードする.
  # 1. ポータルサイトのファイル一覧を取得し、
  portal_site_shiku_excel_list = get_url_list_shiku()
  
  # 2. そのうちローカルにないものをリストアップする。
  need_to_download_shiku_excel_file = select_not_downloaded( portal_site_shiku_excel_list, Local_excel_shiku )
  p 'need_to_download_shiku_excel_file'
  p need_to_download_shiku_excel_file
  puts
  
  # 3. リストアップしたファイルをダウンロードする。
  if need_to_download_shiku_excel_file.size>0
    p '市サイトからダウンロードする.=>'+need_to_download_shiku_excel_file.to_s
    download_by_list( need_to_download_shiku_excel_file , Local_excel_shiku )
  end
  
  # 4. ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する。
  p "ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する"
  list1 = not_made_json_shiku
  if list1.size>0
    list1.each do |ary|
      save_json_from_excel_hyo22( ary, Local_json_shiku )
    end
  else
    p "不足しているjsonはありませんでした."
  end
  # 5. ローカルのexcelとjsonを比較し、excelの方が新しいときjsonを作成し、上書き保存する。
  p "excelとjsonのmtimeを比較し、excelの方が新しいとき、jsonを再作成し、上書き保存する"
  list2 = is_old_json_shiku
  if list2.size>0
    list2.each do |ary|
      save_json_from_excel_hyo22( ary, Local_json_shiku )
    end
  else
    p "excelよりmtimeの古いjsonはありませんでした。"
  end
  p "人口データUpdate終了。"
  
  
  #************************************
  #                                   *
  # 2 区町丁別年齢別CSVファイル取得・更新   *
  #                                   *
  #************************************

  get_rack_or_old.keys.each do |url|
    p url
    dest_file = get_rack_or_old[url]
    S3.write(dest_file, URI.parse(url).read.toutf8)
  end

  #********************************
  #                               *
  # 3 市区オプションファイル更新処理   *
  #                               *
  #********************************
  
  S3.write(Local_shi_option, make_shiku_option("age"))
  S3.write(Local_ku_option, make_shiku_option("tsurumi"))
  
  
  #********************************
  #                               *
  # 4 町丁オプションファイル更新処理   *
  #                               *
  #********************************

  if not S3.exist?(Local_cho_option) or S3.last_modified(Local_cho_option).to_date<(Date.today-1)
    p :made_new_option
    puts make_cho_option.split("\n")
  else
    p :existed_option
    puts S3.read(Local_cho_option).split("\n")
  end

  if not S3.exist?(Local_kujuki_option) or S3.last_modified(Local_kujuki_option).to_date<(Date.today-1)
    p :made_new_option
    puts make_kujuki_option.split("\n")
  else
    p :existed_option
    puts S3.read(Local_kujuki_option).split("\n")
  end


