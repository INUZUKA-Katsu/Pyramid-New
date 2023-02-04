#require "mechanize"
#require "uri"
#
#Site = 'https://www.city.yokohama.lg.jp/city-info/yokohamashi/tokei-chosa/portal/'
##市区別年齢別人口（推計人口）のインデックスのページ
#Parent_url_shiku = 'jinko/nenrei/suikei.html'
#Child_url_shiku  = 'suikei.files/'

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
  agent = Mechanize.new
  uri  = URI(Site).merge(Parent_url_shiku)
  page = agent.get(uri)
  page.links_with(:href=>/hyo22/).map{|l| uri.merge(l.href)}
end
#get_url_list_shiku

#uriリストのうち、AWSに保存済みでないもののリストを返す。戻り値はuriの配列。
def select_not_downloaded(uri_list,s3_excel_hash)
  uri_list.select do |uri| 
    book_name = File.basename(uri.path)
      #p book_name
      #puts "uri-time => " +  URI.open(uri).last_modified.localtime.to_s
      #puts "aws-time => " +  s3_excel_hash[book_name].to_s
      #p     (not s3_excel_hash.keys.include?(book_name) or
      #URI.open(uri).last_modified.localtime.to_s > s3_excel_hash[book_name]) ? :new : :not_new
      #puts
    not s3_excel_hash.keys.include?(book_name) or
    URI.open(uri).last_modified.localtime.to_s > s3_excel_hash[book_name]
  end
end

#uriリストのファイルをAWSにダウンロードする(サーバーに保存する).
def download_by_list(uri_list,dest_folder)
  uri_list.each do |uri|
    p "download : " + uri.path
    dest_file = File.join( dest_folder , File.basename(uri.path) )
    S3.write(dest_file, uri.read)
  end
end
#list     = get_url_list_shiku()
#download_by_list(list,'./excel')

#AWSのexcelファイルリスト（ハッシュ）を更新する。
def update_s3_excel_hash(s3_excel_hash, new_excel_uri_list)
  new_excel_uri_list.each do |uri|
    book_name = File.basename(uri.path)
    s3_excel_hash[book_name] = Time.now.floor.localtime.to_s
  end
  json = JSON.generate(s3_excel_hash)
  S3.write(AWS_excel_list, json)
end

def get_local_excel_nen(s3_excel_hash)
  return $nen if defined? $nen
  nen = []

  s3_excel_hash.keys.each do |book|
    ans = book.match(/(\d{2})_hyo22.xlsx/)
    nen << ans[1] if ans
  end
  $nen = nen.sort
  $nen
end

def get_local_excel_nen_old()
  return $nen if defined? $nen
  nen = []
  #p S3.get_list(AWS_excel_shiku)
  S3.get_list(AWS_excel_shiku).each do |f|
    ans = f.match(/(\d{2})_hyo22.xlsx/)
    nen << ans[1] if ans
  end
  $nen = nen.sort
  $nen
end

#ローカルにエクセルは存在するが、対応するjsonファイルがない区をリストアップする.
def not_made_json_shiku(s3_excel_hash, s3_txt_hash)
  p "not_made_json_shiku"
  p "s3_excel_hash"
  p s3_excel_hash
  puts
  p "s3_txt_hash"
  p s3_txt_hash
  puts
  ary = []
  nen  = get_local_excel_nen(s3_excel_hash)
  p "nen"
  p nen
  puts
  nen.each do |yy|
    RShiku.keys.each do |ku|
      json = ku + yy + '01-j.txt'
      p "json"
      p json
      puts
      unless s3_txt_hash.keys.include?(json)
        ary << [ku, yy+'_hyo22.xlsx', json]
      end
    end
  end
  p ary
  ary
end

#ローカルにエクセルは存在するが、対応するjsonファイルがない区をリストアップする.
def not_made_json_shiku_old()
  ary = []
  nen  = get_local_excel_nen()
  nen.each do |yy|
    RShiku.keys.each do |ku|
      json = ku + yy + '01-j.txt'
      unless S3.exist? File.join(AWS_json_shiku, json)
        ary << [ku, yy+'_hyo22.xlsx', json]
      end
    end
  end
  ary
end
#p not_made_json_shiku

#ここから!
#ローカルに存在するエクセルと対応するjsonファイルを比較してjsonファイルの方が古い区をリストアップする.
def is_old_json_shiku(s3_excel_hash)
  ary = []
  nen  = get_local_excel_nen(s3_excel_hash)
  nen.each do |yy|
    excel = yy+'_hyo22.xlsx'
    excel_fullpath = File.join( AWS_excel_shiku, excel)
    excel_modified = S3.last_modified( excel_fullpath )  if S3.exist? excel_fullpath
    
    RShiku.keys.each do |ku|
      json  = ku+yy+'01-j.txt'
      json_fullpath = File.join( AWS_json_shiku, json)
      json_modified = S3.last_modified( json_fullpath ) if S3.exist? json_fullpath
      #p json_fullpath
      #p "json_modified => " + json_modified.to_s
      #p "excel_modified=> " + excel_modified.to_s
      #p json_modified < excel_modified
      if json_modified < excel_modified
        p '要補充 => '+json_fullpath
        ary << [ku, yy+'_hyo22.xlsx', json]
      end
    end
  end
  ary    
end

#p is_old_json_shiku
def save_json_from_excel_hyo22( ary, dest_folder, s3_txt_hash )
  ku,xlsx_file,json = ary
  local = File.join( AWS_excel_shiku, xlsx_file )
  unless Dir.exist? './tmp/'
   Dir.mkdir('./tmp/')
  end
  S3.download( local, './tmp/'+xlsx_file )
  xlsx  = Roo::Excelx.new( './tmp/'+xlsx_file )
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
  full_path = File.join(dest_folder, json)
  S3.write(full_path, JSON.generate(hs))
  s3_txt_hash[json] = Time.now.floor.localtime.to_s
  p "saved: " + full_path
  #保存したjsonファイルの情報を追加した"s3_txt_hash"を返す。
  s3_txt_hash
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
  json_file = AWS_json_shiku+shiku+yy+"01-j.txt"
  if S3.exist? json_file
    S3.read(json_file) do |f|
      mt = JSON.parse(f)["last_modified"]
      Time.parse(mt)
    end
  else
    nil
  end
end

#######################################################
#ここからは市サイトの町丁別年齢別CSVの取得・更新プログラム
#######################################################

#戻り値は、市サイトの町丁別年齢別CSVのURL=>更新日時のハッシュ
def get_csv_url_list
  agent = Mechanize.new
  agent.user_agent_alias = 'Mac Safari'
  
  links = agent.get(Site+Parent_url_cho).links_with(:href => /cho-nen\.html/).map{|link| link.href}
  #p "links"
  #p links
  #puts
  csv_links = []
  links.each do |link|
    #p "link"
    #p link
    #puts
    agent = Mechanize.new
    agent.user_agent_alias = 'Mac Safari'
    url = URI(Site).merge(link).to_s
    csv_links += agent.get(url).links_with(:href => /cho-nen.files\/\w+\d\d09.csv/).map{|a| URI(url).merge(a.href).to_s}
  end
  h = {}
  csv_links.each do |csv|
    h[csv] = URI.open(csv).last_modified.localtime
    #p "csv => h[csv]"
    #p csv + " => " + h[csv].to_s
  end
  h
end
#p File.basename(get_csv_url_list.keys[0])

#戻り値は、AWSの町丁別CSVファイル名=>更新日時のハッシュ
def get_aws_csv_list
  JSON.parse( S3.read( AWS_csv_list ) )
end

def get_aws_csv_list_old
  h = {}
  S3.get_list(AWS_csv_cho).each do |l|
    if l[-3,3]=='csv'
      #p File.basename(l)
      h[File.basename(l)] = S3.last_modified(l).localtime
      p "File.basename(l) => h[File.basename(l)]"
      p File.basename(l) + "=>" + h[File.basename(l)].to_s
    end
  end
  h
end

def get_rack_or_old(site_csv_list,aws_csv_list)
#戻り値は、{市サイトのcsvのurl => AWSに保存するファイルのフルパス}のハッシュ
  #p "site_csv_list"
  #p site_csv_list
  #puts
  #p "aws_csv_list"
  #p aws_csv_list

  #不足するもの又は古いもの
  rack_or_old = {}
  site_csv_list.keys.each do |url|
    csv = File.basename(url)
    if not aws_csv_list.keys.include?(csv) or site_csv_list[url] > Time.parse(aws_csv_list[csv])
      rack_or_old[url] = AWS_csv_cho+csv
    end
  end
  rack_or_old
end

#########################################################
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
  begin
    mail.deliver
  rescue => e
    $logger.error( e.message )
    $logger.error( e.backtrace.join("\n") )
  end
end


