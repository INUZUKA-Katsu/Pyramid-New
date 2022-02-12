require 'bundler/setup'
require 'aws-sdk-s3'

class S3Client
  attr_reader :bucket
  def initialize
    p ENV['AWS_ACCESS_KEY_ID']
    p ENV['AWS_SECRET_ACCESS_KEY']
    @resource = Aws::S3::Resource.new(
      :region => 'us-east-1',
      :access_key_id   => ENV['AWS_ACCESS_KEY_ID'],
      :secret_access_key => ENV['AWS_SECRET_ACCESS_KEY']
    )
    @bucket = @resource.bucket('storgae-for-herokuapp')
  end
  def read(file_name)
    @bucket.object(file_name).get.body.read
  end
  def write(file_name,str)
    @bucket.put_object(key: file_name, body: str)
  end
  def exist?(file_name)
    @bucket.object(file_name).exists?
  end
  def remove(file_name)
    @bucket.object(file_name).delete
  end
  def last_modified(file_name)
    @bucket.object(file_name).last_modified
  end
  def get_list(dir)
    res = []
    @bucket.objects(prefix: dir).each do |obj|
      res << obj.key
    end
    res
  end
end

#動作テスト
#S3=S3Client.new
#S3.get_list("Pyramid/nenreibetsu/").each do |f|
#    if ans = f.match(/tsurumi(\d{4})-j\.txt/)
#      p S3.last_modified(f)
#      p ans[1]
#    end
#end
