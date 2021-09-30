task :compile do
  syscall('bundle')
  syscall('bundle exec nanoc')
end

desc "Deploy to Github pages"
task :deploy do
  syscall('git checkout gh-pages')
  syscall('git checkout main -- Rakefile')
  syscall('git checkout main -- output')
  Dir.foreach(__dir__) do |f|
    next if %w(. .. .git .idea output Rakefile CNAME).include?(f)
    FileUtils.rm_rf(f)
  end
  Dir.foreach(File.join(__dir__, 'output')) do |f|
    next if %w(. ..).include?(f)
    FileUtils.cp_r(File.join(__dir__, 'output', f), File.join(__dir__, f))
  end
  FileUtils.rm_rf('output')

  syscall('ll')

  continue?("Continue? [y, yes]")

  syscall('git add .')
  syscall('git commit')
  syscall('git push origin gh-pages')
end

def syscall(command)
  result = system(command)
  return if result

  print("Failed: #{command}")
  exit
end

def continue?(prompt)
  print(prompt)
  p
  response = gets.chomp
  exit unless %w[yes y].include?(response)
end