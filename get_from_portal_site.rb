#coding:utf-8
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
require 'mail'


Dir.chdir(__dir__)

RShiku = {"age"=>"横浜市", "tsurumi"=>"鶴見区", "kanagawa"=>"神奈川区", "nishi"=>"西区", "naka"=>"中区", "minami"=>"南区", "konan"=>"港南区", "hodogaya"=>"保土ケ谷区", "asahi"=>"旭区", "isogo"=>"磯子区", "kanazawa"=>"金沢区", "kohoku"=>"港北区", "midori"=>"緑区", "aoba"=>"青葉区", "tsuzuki"=>"都筑区", "totsuka"=>"戸塚区", "sakae"=>"栄区", "izumi"=>"泉区", "seya"=>"瀬谷区"}
ShiKu = {"横浜市"=>0, "鶴見区"=>1, "神奈川区"=>2, "西区"=>3, "中区"=>4, "南区"=>5, "港南区"=>6, "保土ケ谷区"=>7, "旭区"=>8, "磯子区"=>9, "金沢区"=>10, "港北区"=>11, "緑区"=>12, "青葉区"=>13, "都筑区"=>14, "戸塚区"=>15, "栄区"=>16, "泉区"=>17, "瀬谷区"=>18}

Site = 'https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/'
#市区別年齢別人口（推計人口）のインデックスのページ
Parent_url_shiku = 'jinko/nenrei/suikei.html'
Child_url_shiku  = 'suikei.files/'

#町丁別年齢別人口のインデックスのページ
Parent_url_cho   = 'jinko/chocho/nenrei/index.html'
Child_url_cho    = '<gen>cho-nen.files/<ku><nengetsu>.csv'

#ローカルフォルダ
Root_dir          = File.dirname(File.expand_path(__FILE__))
Local_excel_shiku = Root_dir+'/excel'
Local_json_shiku  = Root_dir+'/nenreibetsu'
Local_csv_cho     = Root_dir+'/nenreibetsu'

#一時保存フォルダ
Local_tmp_excel_shiku = Root_dir+'/tmp/excel'
Local_tmp_json_shiku  = Root_dir+'/tmp/nenreibetsu'
Local_tmp_csv_cho     = Root_dir+'/tmp/nenreibetsu'


class Integer
  def to_str_add_cumma
    self.to_s.reverse.gsub( /\d{3}(?=\d)/, '\0,').reverse
  end
end
class String
  def to_str_add_cumma
    self
  end
end


#市区年齢別推計人口のexcelファイルのリストを返す。
#戻り値：uriオブジェクトの配列
def get_url_list_shiku()
  uri  = URI(Site).merge(Parent_url_shiku)
  html = uri.read
  list = html.scan(/<a class="xls" href=".*(suikei\.files\/\d\d_hyo22\.xlsx)">/).flatten
  list.map{|file| uri.merge(file)}
end
#list = get_url_list_shiku()
  
#uriリストのうち、ローカルにダウンロード済みでないもののリストを返す。
def select_not_downloaded(list,up_folder,tmp_folder)
  downloaded = list.select{|uri| 
    local1 = File.join( up_folder , File.basename(uri.path))
    local2 = File.join( tmp_folder , File.basename(uri.path))
    ( File.exist?(local1) and
      URI.open(uri).last_modified.localtime < File.stat(local1).mtime.localtime ) or
    ( File.exist?(local2) and
      URI.open(uri).last_modified.localtime < File.stat(local2).mtime.localtime )
  }
  list - downloaded
end
#p select_not_downloaded(get_url_list_shiku(),"./excel")

#uriのファイルをローカルにダウンロードする(サーバーに保存する).
def download(uri,dest_folder)
  dest_file = File.join( dest_folder , File.basename(uri.path) )
  FileUtils.mkdir_p(dest_folder) unless Dir.exist?(dest_folder)
  open(dest_file, "w+b") do |dest|
    dest.write(uri.read)
  end
end
#list = get_url_list_shiku()
#download(list[1],'./excel')

#uriリストのファイルをローカルにダウンロードする(サーバーに保存する).
def download_by_list(uri_list,dest_folder)
  uri_list.each do |uri|
    p "download : " + uri.path
    download(uri,dest_folder)
  end
end
#list     = get_url_list_shiku()
#download_by_list(list,'./excel')

def get_local_excel_nen()
  return $nen if defined? $nen
  nen1 = Dir.glob(File.join(Local_excel_shiku,"*.xlsx")).map{|f| f.match(/(\d{2})_hyo22\.xlsx/)[1]}
  nen2 = Dir.glob(File.join(Local_tmp_excel_shiku,"*.xlsx")).map{|f| f.match(/(\d{2})_hyo22\.xlsx/)[1]}
  $nen = (nen1 + nen2).uniq.sort
  $nen
end

#ローカルにエクセルは存在するが、対応するjsonファイルがない区をリストアップする.
def not_made_json_shiku()
  ary = []
  nen  = get_local_excel_nen()
  nen.each do |yy|
    RShiku.keys.each do |ku|
      json = ku + yy + '01-j.txt'
      if ( not File.exist? File.join(Local_json_shiku, json) ) and
         ( not File.exist? File.join(Local_tmp_json_shiku, json) )
        ary << [ku, yy+'_hyo22.xlsx', json]
      end
    end
  end
  p ary
  ary
end
#p not_made_json_shiku

#ローカルに存在するエクセルと対応するjsonファイルを比較してjsonファイルの方が古い区をリストアップする.
def is_old_json_shiku()
  ary = []
  nen  = get_local_excel_nen()
  nen.each do |yy|
    excel = yy+'_hyo22.xlsx'

    excel_modified = []
    excel1 = File.join( Local_excel_shiku, excel)
    excel_modified << File.stat( excel1 ).mtime  if File.exist? excel1
    excel2 = File.join( Local_tmp_excel_shiku, excel)
    excel_modified << File.stat( excel2 ).mtime  if File.exist? excel2
    
    RShiku.keys.each do |ku|
      json_modified = []
      json  = ku+yy+'01-j.txt'
      json1 = File.join( Local_json_shiku, json)
      json_modified << File.stat( json1 ).mtime if File.exist? json1
      json2 = File.join( Local_tmp_json_shiku, json)
      json_modified << File.stat( json2 ).mtime if File.exist? json2    
      p "json_modified => " + json_modified.to_s
      p "excel_modified=> " + excel_modified.to_s
      p json_modified.max < excel_modified.max
      if json_modified.max < excel_modified.max
        ary << [ku, yy+'_hyo22.xlsx', json]
      end
    end
  end
  ary    
end
#p is_old_json_shiku

def save_json_from_excel_hyo22(ary, dest_folder)
  ku,xlsx_file,json = ary
  local = File.join( Local_tmp_excel_shiku, xlsx_file )
  xlsx  = Roo::Excelx.new( local )
  sheet = xlsx.sheet(ShiKu[RShiku[ku]])
  first = sheet.first_row
  last  = sheet.last_row
  kijunbi = nil
  ary1  = []
  ary2  = [] 
  (first..last).each do |r|
     kijunbi ||= sheet.row(r).find{|c| c!=nil and c.match(/日現在/)}
     d1 = sheet.row(r)[0..3]
     if d1[0]
       if d1[0].class==Integer
         ary1 << d1
       elsif d1[0].match(/総[　 ]*数/)
        d1[0] = '総数'
         ary1 << d1
       end
     end
     d2 = sheet.row(r)[4..7]
     if d2[0]
       if d2[0].class==Integer
         ary2 << d2
       elsif d2[0].match(/100[　 ]*歳[　 ]*以[　 ]*上|年[　 ]*齢[　 ]*不[　 ]*詳$/)
         d2[0] = 100 if d2[0][0,3]=='100'
         ary2 << d2
       end
     end
  end
  remote = URI(Site).merge(Parent_url_shiku).merge(Child_url_shiku).merge(xlsx_file)
  ary = ary1 + ary2
  ary.map! do |a|
    a.map!{|d| d ? d.to_str_add_cumma : d}
  end
  hs = {}
  hs['last_modified'] = remote.open.last_modified.localtime
  hs['kijunbi']       = kijunbi.tr('０-９','0-9')
  hs['shiku']         = RShiku[ku]
  hs['source_url']    = remote
  hs['kakusai_betsu'] = ary
  FileUtils.mkdir_p(dest_folder) unless Dir.exist?(dest_folder)
  full_path = File.join(dest_folder, json)
  File.write(full_path, JSON.generate(hs))
  p "saved: " + full_path
end
#print get_array_from_excel_hyo22('hodogaya', '19_hyo22.xlsx','hodogaya1901-j.txt')

def get_xl_info()
  xl_uri_hash   = Hash.new()
  xl_mtime_hash = Hash.new()
  xl_uri_array  = get_url_list_shiku()
  xl_uri_array.each do |xl_uri|
    yy = xl_uri.path.match(/(\d\d)_hyo22\.xlsx/)[1]
    mtime = URI.open(xl_uri).last_modified
    xl_uri_hash[yy]   = xl_uri
    xl_mtime_hash[yy] = mtime
  end
  [ xl_uri_hash, xl_mtime_hash ]
end

def get_json_info(yy)
  hs = Hash.new
  RShiku.each do |shiku|
    hs[shiku] = get_last_modified_of_json(shiku,yy)
  end
  hs
end

def get_last_modified_of_json(shiku,yy)
  json_file = Local_json_shiku+shiku+yy+"01-j.txt"
  if File.exist? json_file
    File.open(json_file,"r") do |f|
      mt = JSON.parse(f.read)["last_modified"]
      Time.parse(mt)
    end
  else
    nil
  end
end

def send_mail(subject_str,body_str)
  mail = Mail.new do
     from    "czk07503@nifty.com"
     to      "inuzuka0601@gmail.com"
     subject subject_str
     body    body_str
  end
  option = {:address        => "smtp.nifty.com",
            :port           => 587,
            :domain         => "pyramid-yokohama.herokuapp.com",
            :authentication => :plain,
            :user_name      => "czk07503",
            :password       => ENV["NIFPSW"] ,
            :enable_starttls_auto  => true }
  mail.delivery_method(:smtp,option)
  mail.charset = "UTF-8"
  mail.content_transfer_encoding = "8bit"
  mail.deliver
end

#***** FTP送信 *****
def ftp_soshin(files)
  $ftp_server = 'ftp.la.coocan.jp'
  $account    = 'yokohama-micah68.la.coocan.jp'
  $pass       = ENV["LACOCNPSW"]
  $dir        = 'yokohama-micah68.la.coocan.jp/homepage/Stat/nenreibetsu'
  cnt_retry=0
  begin
    ftp = Net::FTP.new
    ftp.connect($ftp_server)
    ftp.login($account,$pass)
    ftp.passive = true
    ftp.binary  = false
    ftp.chdir($dir)
  #アップロードでサーバの応答待ちになったとき５秒でタイムアウトにする。
  Timeout.timeout(5){
    files.each {|file| ftp.put(file)}
  }
    ftp.quit
  rescue Timeout::Error
    cnt_retry+=1
    if cnt_retry<=3
      retry
    else
      title = "FTP送信エラー"
      body  = "LacoocanへのFTP送信に失敗しました。"
      send_mail(title,body)
    end
  rescue => e
      title = "FTP送信エラー"
      body  = "LacoocanへのFTP送信に失敗しました。"
      body += e.message.force_encoding("Windows-31J")
      send_mail(title,body)
  end
end

#p get_last_modified_of_json("tsurumi","19")
  
#xl_uri_hash, xl_mtime_hash = get_xl_info()
#xl_mtime_hash.keys.each do |yy|
#  json_info = get_json_info(yy)
#  RShiku.each do |shiku|
#    js_mtime = json_info[shiku]
#  end
#end


#ローカルにない市区年齢別人口のexcelファイルをダウンロードする.
# 1. ポータルサイトのファイル一覧を取得し、
portal_site_shiku_excel_list = get_url_list_shiku()

# 2. そのうちローカルにないものをリストアップする。
need_to_download_shiku_excel_file = select_not_downloaded( portal_site_shiku_excel_list, Local_excel_shiku, Local_tmp_excel_shiku )

# 3. リストアップしたファイルをダウンロードする。
download_by_list( need_to_download_shiku_excel_file , Local_tmp_excel_shiku )

# 4. ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する。
p "ローカルのexcelとjsonを比較し、不足しているjsonを作成し、保存する"
list1 = not_made_json_shiku
#p list1
list1.each do |ary|
  save_json_from_excel_hyo22( ary, Local_tmp_json_shiku )
end
# 5. ローカルのexcelとjsonを比較し、excelの方が新しいときjsonを作成し、上書き保存する。
p "excelの方が新しいので、jsonを作成し、上書き保存する"
list2 = is_old_json_shiku
#p list2
list2.each do |ary|
  save_json_from_excel_hyo22( ary, Local_tmp_json_shiku )
end
# 6. 今回保存したjsonファイルをLacoocanにも保存する。
list = list1+list2
new_files = list.map{|ary| File.join(Local_tmp_json_shiku,ary[2])}
ftp_soshin(new_files)

