
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
def select_not_downloaded(list,up_folder)
  list.select do |uri| 
    local = File.join( up_folder , File.basename(uri.path))
    not S3.exist?(local) or
    URI.open(uri).last_modified.localtime > S3.last_modified(local).localtime
  end
end
#p select_not_downloaded(get_url_list_shiku(),"./excel")

#uriリストのファイルをローカルにダウンロードする(サーバーに保存する).
def download_by_list(uri_list,dest_folder)
  uri_list.each do |uri|
    p "download : " + uri.path
    dest_file = File.join( dest_folder , File.basename(uri.path) )
    S3.write(dest_file, uri.read)
  end
end
#list     = get_url_list_shiku()
#download_by_list(list,'./excel')

def get_local_excel_nen()
  return $nen if defined? $nen
  nen = []
  #p S3.get_list(Local_excel_shiku)
  S3.get_list(Local_excel_shiku).each do |f|
    ans = f.match(/(\d{2})_hyo22.xlsx/)
    nen << ans[1] if ans
  end
  $nen = nen.sort
  $nen
end

#ローカルにエクセルは存在するが、対応するjsonファイルがない区をリストアップする.
def not_made_json_shiku()
  ary = []
  nen  = get_local_excel_nen()
  nen.each do |yy|
    RShiku.keys.each do |ku|
      json = ku + yy + '01-j.txt'
      unless S3.exist? File.join(Local_json_shiku, json)
        ary << [ku, yy+'_hyo22.xlsx', json]
      end
    end
  end
  ary
end
#p not_made_json_shiku

#ローカルに存在するエクセルと対応するjsonファイルを比較してjsonファイルの方が古い区をリストアップする.
def is_old_json_shiku()
  ary = []
  nen  = get_local_excel_nen()
  nen.each do |yy|
    excel = yy+'_hyo22.xlsx'
    excel_fullpath = File.join( Local_excel_shiku, excel)
    excel_modified = S3.last_modified( excel_fullpath )  if S3.exist? excel_fullpath
    
    RShiku.keys.each do |ku|
      json  = ku+yy+'01-j.txt'
      json_fullpath = File.join( Local_json_shiku, json)
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
def save_json_from_excel_hyo22(ary, dest_folder)
  ku,xlsx_file,json = ary
  local = File.join( Local_excel_shiku, xlsx_file )
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

  csv_links = []
  links.each do |link|
    agent = Mechanize.new
    agent.user_agent_alias = 'Mac Safari'
    url = URI(Site).merge(link).to_s
    csv_links += agent.get(url).links_with(:href => /cho-nen.files\/\w+\d\d09.csv/).map{|a| URI(url).merge(a.href).to_s}
  end
  h = {}
  csv_links.each do |csv|
    h[csv] = URI.open(csv).last_modified.localtime
  end
  h
end
#p File.basename(get_csv_url_list.keys[0])

#戻り値は、AWSの町丁別CSVファイル名=>更新日時のハッシュ
def get_local_csv_list
  h = {}
  S3.get_list(Local_csv_cho).each do |l|
    if l[-3,3]=='csv'
      #p File.basename(l)
      h[File.basename(l)] = S3.last_modified(l).localtime
    end
  end
  h
end

def get_rack_or_old
  site_csv  = get_csv_url_list
  local_csv = get_local_csv_list
  #不足するもの又は古いもの
  rack_or_old = {}
  site_csv.keys.each do |url|
    csv = File.basename(url)
    if not local_csv.keys.include?(csv) or site_csv[url] > local_csv[csv]
      rack_or_old[url] = Local_csv_cho+csv
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


