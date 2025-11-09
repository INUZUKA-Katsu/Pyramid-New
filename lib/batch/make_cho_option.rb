
#市サイトから「cho-option.txt」の文字列データを作成する。(単体で動作する。)
def make_cho_option
  url = Site+Parent_url_cho
  cho_option=[]
  uri = URI.parse(url)
  uri.read.scan(/(?<=cho-nen.html">).*?<\/a>/).each do |line|
    ans   = line.match(/(令和|平成).*?\((\d{4})\)年/)
    yyyy  = ans[2]
    gg    = ans[0].sub(/\(#{yyyy}\)/,"")
    cho_option << "                  <option value=\"#{yyyy}09\">#{gg}9月30日現在</option>"
  end
  str = cho_option.join("\n")
  S3.write(AWS_cho_option,str)
  str
end

#市サイトから「kujuki_option.txt」の文字列データを作成する。(単体で動作する。)
def make_kujuki_option
  url = Site+Parent_url_shikujuki
  kujuki_option = []
  uri = URI.parse(url)
  uri.read.scan(/(?<=nen.html">).*?<\/a>/).each do |line|
    ans   = line.match(/(令和|平成).*?\((\d{4})\)年/)
    yyyy  = ans[2]
    gg    = ans[0].sub(/\(#{yyyy}\)/,"")
    kujuki_option << "                  <option value=\"#{yyyy}09\">#{gg}9月30日現在</option>"
  end
  str = kujuki_option.join("\n")
  S3.write(AWS_kujuki_option,str)
  str
end
