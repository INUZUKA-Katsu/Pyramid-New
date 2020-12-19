# coding: utf-8

require 'dropbox_api'
require 'fileutils'

Dir.chdir(__dir__)
$access_token = "yqqyQxpAqngAAAAAAAAAAdYt0WfwqexuF4ahEUugRoOFxetIGwz1qVH09zlvfYBm"
$client = DropboxApi::Client.new($access_token)

def get_files_path_list(folder,files,kakuchoshi)
  adds = []
  list = $client.list_folder folder
  list.entries.each do |path|
    f = path.path_display
    if f[-5,5].match(/\./)
      files << f if not kakuchoshi or File.extname(f)==kakuchoshi
    else
      p f
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
      f.write contents
    end  
  rescue
    false
  end
end

if ARGV[0]
  kakuchoshi = ARGV[0]
else
  kakuchoshi = nil
end
list = get_files_path_list("/mp3",[],kakuchoshi)
puts
list.each do |path|
  p path
  FileUtils.mkdir_p(File.dirname('./mcc'+path),:mode => 666)
  get_from_dropbox(path,'./mcc'+path)
end
