# coding: utf-8

#Dropboxのmp3フォルダをHerokuのtmpフォルダにコピーする。
#HerokuのDyno起動時に実行する。

require 'dropbox_api'
require 'fileutils'

Dir.chdir(__dir__)
#p Dir.pwd

$access_token = "yqqyQxpAqngAAAAAAAAAAdYt0WfwqexuF4ahEUugRoOFxetIGwz1qVH09zlvfYBm"
$client = DropboxApi::Client.new($access_token)

def get_files_path_list(folder,files,kakuchoshi)
  adds = []
  list = $client.list_folder folder
  list.entries.each do |path|
    f = path.path_display
    if f[-5,5].match(/\./)
      if not kakuchoshi or kakuchoshi.include? File.extname(f)
        files << f
        p f
      end
    else
      adds << f
    end
  end
  adds.each do |f|
    get_files_path_list(f,files,kakuchoshi)
  end
  files
end

def get_from_dropbox(src_path,dest_path)
  begin
    contents = ""
    $client.download src_path do |chunk|
      contents << chunk
    end
    File.open(dest_path,"wb") do |f|
      p dest_path
      f.write contents
    end  
  rescue
    false
  end
end

if ARGV[0]
  kakuchoshi = ARGV[0]
else
  kakuchoshi = %W|.mp3 .m4a|
end
#Dropboxの'/アプリ/mcc-choir/mp3'以下のファイルのpathをリストアップする。
#外からは、mcc-choirフォルダが'/'になる。
folder     = '/mp3'
files     = []
list = get_files_path_list(folder,files,kakuchoshi)
puts
#Dropboxのファイルを読み出し、Herokuの一時保存フォルダに保存する。
#保存先は、'/tmp/mcc/mp3'とする。
list.each do |path|
  #p '/tmp/mcc'+path
  src_path  = path
  dest_path = './tmp/mcc'+path
  get_from_dropbox(src_path,dest_path)
  File.chmod(666,dest_path)
end
