#!/usr/bin/env ruby
# -*- coding: utf-8 -*-

#// 横浜市の人口ピラミッド ver2.10 2017.1.14  INUZUKA Katsu
require "bundler/setup"
require "json"
require "time"
require "cgi"
require "kconv"
require "fileutils"
require "net/https"
require 'open-uri'
require 'openssl'
require 'csv'
require './s3client'

#$KCODE = "utf-8"
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE
Encoding.default_external = "utf-8" if RUBY_VERSION[0]=="2"
S3=S3Client.new

JSONFile_S3         = "Pyramid/nenreibetsu/<ku><nengetsu>-j.txt"
JSONFile_SYORAI     = "/syoraisuikei/<nen>-suikei.txt"
JSONFile_KUJUKI_S3  = "Pyramid/jukijinko/<ku><nen>-t.txt"
JSONFile_KU_SYORAI  = "/syoraisuikei/kubetsu/<ku>-<nen>-suikei.txt"
CSVFile_S3          = "Pyramid/nenreibetsu/<ku><nengetsu>.csv"
ShikuCSVFile        = "/e3yokohama<nengetsu>/e3<ku><nengetsu>.csv"
AyumiCSVFile        = "/ayumi/ayumi.csv"
ShiOptionFile_S3    = "Pyramid/option/shi-option.txt"
KuOptionFile_S3     = "Pyramid/option/ku-option.txt"
ChoOptionFile_S3    = "Pyramid/option/cho-option.txt"
AyumiOptionFile_S3  = "Pyramid/option/ayumi-option.txt"
SyoraiOptionFile_S3 = "Pyramid/option/syorai-option.txt"
KuJukiOptionFile_S3 = "Pyramid/option/kujuki-option.txt"
DirShikuJson_S3     = "Pyramid/nenreibetsu/"

#横浜市サイト
ShiHost            = "https://www.city.yokohama.lg.jp"
#統計ポータルサイト
TokeiPortal        = "/city-info/yokohamashi/tokei-chosa/portal"
#町丁別年齢別人口のトップページ
ChoTop             = "/jinko/chocho/nenrei"
#町丁別年齢別人口のcsvファイルのパス(統計ポータルサイト内)
ChoCSV             = "/jinko/chocho/nenrei/<gen>cho-nen.files/<ku><nengetsu>.csv" #<gen>:h31,r02,r03
#年齢別住基人口のトップページ
KuJukiTop          = "/jinko/nenrei/juki"

def alert(s)
    str = "Content-Type: text/html\n\n"
    #print s.gsub(/Shift_JIS|shift_jis/u,"UTF-8")
    str << '<html>'
    str << '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>'
    str << s
    str << "</html>"
    ["text/html",str]
end

class String
  def to_utf8
    if RUBY_VERSION[0,3]=="1.8"
      self
    else
      self.force_encoding("utf-8")
    end
  end
end

class ChoMeiList
  attr_reader :cho_mei,:html
  def initialize(csv_data)
    csv=[]
    csv_data.each_line { |line|
      csv << line.split(",")[0]
    }
    cho_mei = csv.uniq.select{|ch| ch.size<30 and not ch.match("町名") and not ch.match("合計")}
    col_num=8 #町丁名リストの列数を指定する。
    if cho_mei.size%col_num==0
      num    = cho_mei.size/col_num
    else
      num    = cho_mei.size/col_num.to_i+1
    end
    html_a   = []
    cho_mei.each_with_index{|ch,i|
      html_a << "<div class=\"cho\">\n"        if i==0
      html_a << "</div><div class=\"cho\">\n"  if i>0 and i%num==0
      html_a << "  <li><input name=\"cho_list\" value=\"#{ch}\" type=\"checkbox\" id=\"cho#{i}\"><label for=\"cho#{i}\">#{ch}</label></li>\n"
    }
    html_a << "</div>"
    @html    = html_a.join
    #puts "@html => " + @html[0,100]
  end
end

class GetDATA
  attr_reader :json, :html_str, :csv, :shiku, :nenreibetsu, :json_error

  def initialize(ku,nengetsu,level,cho=nil)
    @ku            = ku
    @nengetsu      = nengetsu
    if nengetsu=="new" and level==:shiku_json
      @nengetsu = get_nengetsu_from_new()
    else
      @nengetsu    = nengetsu
    end
    @cho           = cho
    @json_error    = nil
    case level
    when :shiku_json
      begin
      @json        = get_shiku_data()
      rescue => e
        alert(e.message)
      end
    when :syorai_json
      @json        = get_syorai_data()
    when :syorai_ku_json
      @json        = get_syorai_ku_data(@ku)
    when :cho_csv,:cho_csv_for_save
      @csv         = get_csv_of_cho(@ku,@nengetsu)
    when :cho_json
      @csv         = get_csv_of_cho(@ku,@nengetsu)
      @kijunbi     = kijunbi(nengetsu)
      begin
        @json      = make_json_from_csv(@csv,@kijunbi,@cho)
      rescue
      #文字コードエラーでJSONへの変換ができなかったときはCSVを返す.
        @json_error= true
      end
    when :kujuki_json
      @json        = get_kujuki_data()
    when :ayumi_json
      @csv         = get_csv_of_ayumi()
      @kijunbi     = ayumi_kijunbi(nengetsu)
      @json        = make_json_from_ayumi_csv(@csv,@kijunbi,@nengetsu)
    when :cho_list
      @html_str    = get_newest_cho_list(@ku)
    when :shi_option
      @html_str    = get_shi_option()
    when :ku_option
      @html_str    = get_ku_option()
    when :cho_option
      @html_str    = get_cho_option()
    when :kujuki_option
      @html_str    = get_kujuki_option()
    when :all_options
      @json        = get_all_options()
    end
  end

  def get_nengetsu_from_new
    ary = []
    S3.get_list(DirShikuJson_S3).select{|f| f.match(/tsurumi.*txt/)}.each do |f|
      if ans=f.match(/\d{4}/)
        ary << ans[0]
      end
    end
    yymm = ary.select{|yymm| yymm.to_i<9001}.max
    "20" + yymm
  end

  def local_file(syubetsu,nengetsu=@nengetsu)
    root_dir = File.dirname(File.expand_path(__FILE__))
    case syubetsu
      when :json
        JSONFile_S3.sub("<ku>",@ku).sub("<nengetsu>",nengetsu[2,4])
      when :json_kujuki
        nen = nengetsu[2,4]
        JSONFile_KUJUKI_S3.sub("<ku>",@ku).sub("<nen>",nen)
      when :json_syorai
        nen = nengetsu[0,4]
        root_dir + JSONFile_SYORAI.sub("<nen>",nen)
      when :json_ku_syorai
        nen = nengetsu[0,4]
        root_dir + JSONFile_KU_SYORAI.sub("<ku>",@ku).sub("<nen>",nen)
      when :csv
        CSVFile_S3.sub("<ku>",@ku).sub("<nengetsu>",nengetsu[2,4])
      when :shiku_csv
        if @ku=="age"
          shiku = 'yokohama'
        else
          shiku = @ku
        end
        root_dir + ShikuCSVFile.sub("<ku>",shiku).gsub("<nengetsu>",nengetsu[2,4])
      when :ayumi_csv
        root_dir + AyumiCSVFile
      when :shi_option
        ShiOptionFile_S3
      when :ku_option
        KuOptionFile_S3
      when :cho_option
        ChoOptionFile_S3
      when :ayumi_option
        AyumiOptionFile_S3
      when :syorai_option
        SyoraiOptionFile_S3
      when :kujuki_option
        KuJukiOptionFile_S3
    end
  end

  def get_shiku_data()
    #p :step1
    if ku_not_exist = json_of_not_exist_ku()
      return ku_not_exist
    end
    if @nengetsu[4,2]=="09"
      nengetsu = post_3month(@nengetsu)
    else
      nengetsu = @nengetsu
    end
    unless json = get_local(local_file(:json,nengetsu))
      unless json = get_local(local_file(:json,pre_nen(nengetsu)))
        #国勢調査実施時は一年前のデータも不存在となるので、最新データを取得する。
        json = get_local(local_file(:json,get_nengetsu_from_new()))
      end
    end
    json
  end

  def modify_src(json)
    new_src = 'https://www.city.yokohama.lg.jp/city-info/seisaku/torikumi/shien/jinkosuikei.files/0014_20180907.xls'
    json.sub(/http.*?xls/,new_src)
  end

  def get_syorai_data()
    json_file  = local_file(:json_syorai)
    json       = get_local(json_file)
    json       = modify_src(json)
    json
  end

  def get_kujuki_data()
    json_file  = local_file(:json_kujuki)
    json       = get_local(json_file)
    json
  end

  def get_syorai_ku_data(ku)
    json_file  = local_file(:json_ku_syorai)
    json       = get_local(json_file)
    json       = modify_src(json)
    return json
  end

  def json_of_not_exist_ku()
    if ["aoba","tsuzuki"].include?(@ku) and ["199301","199401"].include?(@nengetsu)
      data                  = Hash.new
      data["shiku"]         = to_kanji(@ku)
      data["not_exist"]     = data["shiku"]
      data["kijunbi"]       = kijunbi(@nengetsu)
      data["source_url"]    = ""
      data["kakusai_betsu"] = Array.new(101){["","0","0","0"]}.each_with_index{|sai,i| sai[0]=i.to_s}
      return JSON.generate(data)
    else
      return nil
    end
  end

  def get_all_options()
    ku_str      = get_ku_option()
    shi_str     = get_shi_option()
    cho_str     = get_cho_option()
    kujuki_str  = get_kujuki_option()
    JSON.generate( {"ku_option"=>ku_str,
                    "shi_option"=>shi_str,
                    "cho_option"=>cho_str,
                    "kujuki_option"=>kujuki_str,
                  } )
  end

  def get_ku_option()
    file = local_file(:ku_option)
    get_local(file)
  end

  def get_shi_option()
    file = local_file(:shi_option)
    get_local(file)
  end

  def get_cho_option()
    #"#{__dir__}/tmp/nenreibetsu/cho-option.txt"
    file = local_file(:cho_option)
    get_local(file)
  end

  def get_kujuki_option()
    file = local_file(:kujuki_option)
    get_local(file)
  end

  def get_local(file)
    p caller_locations(1,1)[0].label
    if file[0,7]=='Pyramid' and S3.exist? file
      S3.read(file)
    elsif File.exist? file
      File.read(file)
    else
      nil
    end
  end

  def save_local(file,str)
    S3.write(file,str)
  end

  def kakusai_betsu(html)
      ary=[]
      tr = html.gsub(/\n/u,"").scan(/<tr.*?tr>/u)
      tr.each do |r|
        ary << r.gsub(/<tr.*?><t(d|h).*?>|<\/t(d|h)><\/tr>/u,"").split(/<\/td?h?><td?h?.*?>/u)
      end
      ary.select{|r| r[0].match(/^\d{1,3}$|総数|100歳以上/u)}
  end

  def get_csv_of_cho(ku,nengetsu)
    file = local_file(:csv)
    csv = get_local(file)  #存在しないときの戻り値は"nil".
    #p file + " => " + csv[0,200] if csv
    csv = csv.kconv(Kconv::UTF8,Kconv::SJIS) if csv and NKF.guess(csv).to_s=="Shift_JIS"
    if csv and csv.match(/(,\d+){102}/)
      #csvに120歳までのデータがある時は100歳以上を合算する。
      summarize_over_100_years_old(csv)
    else
      #csvを市サイトから取得する。
      csv_url = csv_source(ku,nengetsu)
      csv = get_https_body(csv_url)
      csv = csv.kconv(Kconv::UTF8,Kconv::SJIS) if csv and NKF.guess(csv).to_s=="Shift_JIS"
      #csvに120歳までのデータがある時は100歳以上を合算する。
      csv = summarize_over_100_years_old(csv)
      save_local(file,csv)
      csv
    end
  end

  def summarize_over_100_years_old(cho_csv)
  #令和になってからの町丁別年齢別のCSVは120歳以上までの各歳データが載っているのを100歳以上にまとめる。
  #引数、戻り値ともにCSVデータ
    csv_array = CSV.parse(cho_csv)
    if sp = csv_array[0].index("101歳")
      csv_array.map! do |line|
        sum = line.slice((sp-1)..-1).inject{|sum,nin| sum.to_i+nin.to_i}
        new_line = line.slice(0..sp-1)
        if new_line[-1]=="100歳"
          new_line[-1]="100歳以上"
        else
          new_line[-1]=sum
        end
        new_line.to_csv
      end
      csv_array.join
    else
      cho_csv
    end
  end

  def get_csv_of_ayumi()
    file = local_file(:ayumi_csv)
    csv=get_local(file)
    csv
  end

  def get_https_body(url)
    uri   = URI.parse( ShiHost+url )
    https = Net::HTTP.new(uri.host,uri.port)
    https.use_ssl     = true
    https.verify_mode = OpenSSL::SSL::VERIFY_NONE
    response = https.get(uri.request_uri)
    response.body
  end

  #最新の年月とcsvファイルを取得する.戻り値は町名リストのhtml文字列
  def get_newest_cho_list(ku)
    cho_nen_top = TokeiPortal+ChoTop+'/'
    top_page_html = get_https_body(cho_nen_top)

    #最新年の町丁別年齢別csvファイルが掲載されているページのhtmlを取得する.
    pattern = %r!<a href=.*?(#{ChoTop}/..cho-nen\.html).>!
    href    = top_page_html.match(/#{pattern}/)[1]
    newest_nen_page = get_https_body(TokeiPortal+href)

    #目当ての区のcsvファイルのurlを取得する.
    pattern1 = %r!href="(r\d\d?cho-nen.files/#{ku}(\d\d)(\d\d).csv)"!
    ans      = newest_nen_page.match(/#{pattern1}/)
    href1    = ans[1]
    yymm = ans[2]+ans[3]
    if ans[3] == '03'
      #最新データが3月のときは前年の9月のデータのページのURLに差し替える.
      yymm = "#{(ans[2].to_i - 1).to_s}09"
      href1    = href1.sub(/\d\d?/, (ans[2].to_i - 19).to_s ).sub(/\d{4}/,yymm)
    end

    file = local_file(:csv,yymm)
    unless csv = get_local(file)
      url = cho_nen_top+href1
      csv = get_https_body(url).kconv(Kconv::UTF8,Kconv::SJIS)
      save_local(file,csv)
    end
    return ChoMeiList.new(csv).html
  end

  def make_json_from_csv(csv,kijunbi,cho)
    p :step01
    csv=csv.to_utf8 if RUBY_VERSION[0]=="2"
    ary=[]
    hitoku=false
    csv.each_line do |line|
      l = line.chomp.split(",")
      if cho.include?(l[0]) or l[0]=="町名"
        if l.include? "X"
          hitoku=true
        end
        ary << l
      end
    end
    p :step02
    title     = ary[0].map{|c| c.match(/歳/) ? c.sub!(/歳.*/,"") : c }
    if ary.size > 1
      male      = ary_sum(ary.select{|l| l[2]=="男"})
      female    = ary_sum(ary.select{|l| l[2]=="女"})
      total     = ary_sum([male,female])
      exist_cho = ary.map{|l| l[0]}.uniq-["町名"]
      not_exist = cho - exist_cho
      j_ary=[]
      title.zip(total,male,female){|ti,to,m,f| j_ary<<[ti,to,m,f]}
      j_ary.slice!(0,3)
    elsif ary.size==1
      exist_cho = cho
      not_exist = cho
      j_ary     = title.map{|i| [i,"0","0","0"]}
      j_ary.slice!(0, 3)
    end
    p :step03
    data                  = Hash.new
    data["shiku"]         = exist_cho.join(",")
    p :step03_1
    data["kijunbi"]       = kijunbi
    p :step03_2
    data["source_url"]    = ShiHost+csv_source()
    p :step03_3
    data["kakusai_betsu"] = j_ary
    p :step03_4
    data["not_exist"]     = not_exist.size>0 ? not_exist.join(",") : ""
    p :step03_5
    data["hitoku"]        = hitoku
    p :step04
    p data
    JSON.generate(data)
  end

  def make_json_from_ayumi_csv(csv,kijunbi,nengetsu)
    def keta_kugiri(num)
      num.gsub(/(\d)(?=(\d{3})+(?!\d))/, '\1,')
    end
    csv=csv.to_utf8 if RUBY_VERSION[0]=="2"
    ary=[]
    csv.each_line do |line|
      l = line.chomp.split(",")
      ary << l if l[0]=="年" or l[0]==get_gge(nengetsu)
    end
    title     = ary[0].map{|c| c.match(/歳/) ? c.sub!(/歳.*/,"") : c }
    total     = ary[1].map{|nin| keta_kugiri(nin)}
    male      = ary[2].map{|nin| keta_kugiri(nin)}
    female    = ary[3].map{|nin| keta_kugiri(nin)}
    j_ary=[]
    title.zip(total,male,female){|ti,to,m,f| j_ary<<[ti,to,m,f]}
    j_ary.slice!(0,2)

    data                  = Hash.new
    data["shiku"]         = "横浜市"
    data["kijunbi"]       = kijunbi
    data["source_url"]    = "https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/jinko/choki.files/4.xlsx"
    data["kakusai_betsu"] = j_ary
    JSON.generate(data)
  end

  #複数の町丁を選択したときに合計の各歳別人口配列を作成する。
  def ary_sum(ary)
    #alert "Here!"
    def plus(ary1,ary2)
      ary1.zip(ary2).map{|n1,n2| n1.to_i+n2.to_i}
    end
    syokichi = ary[0].map{|i| i=0}
    sum = ary.inject(syokichi) do |sum,item_ary|
      if item_ary[-1]=="100歳以上"
        sum=sum
      else
        sum=plus(sum,item_ary)
      end
    end
    sum.map{|n| n.to_s}
  end

  #"201609","199701"などyyyymm形式を平成x年x月x日に変換する。
  def kijunbi(nengetsu)
    if nengetsu[4,2]=="01" or nengetsu[4,2]=="10"
      day="1"
    else
      day="30"
    end
    "#{get_gge(nengetsu)}#{nengetsu[4,2].to_i}月#{day}日現在"
  end

  def ayumi_kijunbi(nengetsu)
    if nengetsu[0,4].to_i<=1975 or nengetsu[4,2]=="10"
      #get_gge(nengetsu)+"（"+nengetsu[0,4]+"年）10月1日現在"
      get_gge(nengetsu)+"年10月1日現在"
    else
      #get_gge(nengetsu)+"（"+nengetsu[0,4]+"年）1月1日現在"
      get_gge(nengetsu)+"年1月1日現在"
    end
  end

  def isAyumi()
    if @ku=="age" and @nengetsu[0,4].to_i<=1992
      true
    else
      false
    end
  end

  def csv_source(ku=@ku,nengetsu=@nengetsu)
    TokeiPortal +
    ChoCSV.sub("<gen>",get_ge(nengetsu)).
           sub("<ku>" ,ku).
           sub("<nengetsu>",nengetsu[2,4])
  end

  #nengetsu（ex."201909"）から元号年(ex."r1")を取得する.
  #市サイトの町丁別年齢別csvファイルのパスを作成するために使用。2019は"h31"とする。
  def get_ge(nengetsu)
    yyyy = nengetsu[0,4].to_i
    m    = nengetsu[4,2].to_i
    case yyyy
    when 2020..2999 ; "r"+(yyyy-2018).to_s
    when 1989..2019 ; "h"+(yyyy-1988).to_s
    when 1926..1988 ; "s"+(yyyy-1925).to_s
    end
  end

  def get_gge(nengetsu)
    yyyy = nengetsu[0,4].to_i
    m    = nengetsu[4,2].to_i
    case yyyy
    when 2020..2999 ; "令和"+(yyyy-2018).to_s+"年"
    when 2019       ; m==1 ? "平成31年" : "令和元年"
    when 1990..2018 ; "平成"+(yyyy-1988).to_s+"年"
    when 1989       ; m==1 ? "昭和64年" : "平成元年"
    when 1926..1988 ; "昭和"+(yyyy-1925).to_s+"年"
    when 1912..1925 ; "大正"+(yyyy-1911).to_s+"年"
    end
  end

  def to_han(str)
    str.tr('０-９','0-9')
  end

  def to_kanji(kumei)
    h = { "tsurumi"=>"鶴見区" ,  "kanagawa"=>"神奈川区"  , "nishi" =>"西区"  ,  "naka"    =>"中区"  , "minami"  =>"南区"   ,
          "konan"  =>"港南区" ,  "hodogaya"=>"保土ケ谷区", "asahi" =>"旭区"   , "isogo"   =>"磯子区" , "kanazawa"=>"金沢区" ,
          "kohoku" =>"港北区" ,  "midori"  =>"緑区"     , "aoba"  =>"青葉区" , "tsuzuki" =>"都筑区" , "totsuka" =>"戸塚区"  ,
          "sakae"  =>"栄区"   ,  "izumi"   =>"泉区"     , "seya"  =>"瀬谷区" , "age"     =>"横浜市"  }
    h[kumei]
  end

  def get_kijunbi(html)
    html.match(/<title>.*?(平成\d+年\d+月\d+日現在).*?<\/title>/u)[1]
  end
  def pre_nen(nengetsu)
    "#{nengetsu[0,4].to_i-1}#{nengetsu[4,2]}"
  end
  def post_nen(nengetsu)
    "#{nengetsu[0,4].to_i+1}#{nengetsu[4,2]}"
  end
  def pre_9month(nengetsu)
    "#{nengetsu[0,4]}01"
  end
  def post_3month(nengetsu)
    "#{nengetsu[0,4].to_i+1}01"
  end
end

#***********************************
#       ここから実行プロセス
#***********************************

#単体で動作テストする場合は # を削除する.
#mode = :test

#if defined?(mode) and mode == :test
  #shiku    = "tsurumi"
  #nengetsu = "1901"
  #level = :all_options
  #level    = :cho_list
  #level    = :all_options
  #cho      = [] #["相生町","赤門町","曙町","万代町","弁天通","千鳥町","千歳町","千代崎町","富士見町","福富町仲通","福富町西通","福富町東通","不老町","羽衣町","英町","花咲町","初音町","本郷町"]
#else
  #postデータを受け取って引き数をcgiオブジェクトに格納する。
  #cgi      = CGI.new
  #shiku    = cgi.params['ShikuName'][0]
  #nengetsu = cgi.params['Year'][0]
  #level    = cgi.params['Level'][0].to_sym
#end

def main(param)
  #p "This is main"
  shiku    = param["ShikuName"]
  nengetsu = param["Year"]
  level    = param["Level"].to_sym
  p level
  if level == :cho_json
    cho    = JSON.parse(param["Cho"])
  else
    cho    = nil
  end
  case level
  when :shiku_json
    p nengetsu[0,4]
    if nengetsu!="new" and nengetsu[0,4]<="1992"
      level = :ayumi_json
    elsif nengetsu.match(/ft|syorai/)
      case shiku
      when "age" ; level = :syorai_json
      else       ; level = :syorai_ku_json
      end
    end
    nengetsu = nengetsu[0,4]+"ft" if nengetsu.match(/syorai/) #お化け対策
  when :shiku_option
    case shiku
    when "age" ; level = :shi_option
    else       ; level = :ku_option
    end
  when :all_options
    shiku = "tsurumi" unless shiku
  end
    
  begin
    obj = GetDATA.new(shiku,nengetsu,level,cho)
    case level
    when :shiku_json,:cho_json,:kujuki_json,:ayumi_json,:syorai_json,:syorai_ku_json,:all_options
      if obj.json_error
        ["text/plain;charset=utf-8", obj.csv]
      else
        ["text/json;charset=utf-8", obj.json]
      end
    when :cho_csv,:cho_csv_for_save
      ["text/plain;charset=utf-8", obj.csv]
    when :ku_option,:shi_option,:cho_option,:cho_list
      ["text/html;charset=utf-8", obj.html_str]
    end
  rescue => e
      alert(e.message + "<br>\n" + e.backtrace.join("<br>\n"))
  end
end

#このファイルを読み込んだときの初期化動作
