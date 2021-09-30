desc "Prepare gh-pages branch for deploy"
task :prepare do
  system('git checkout gh-pages')
  system('git checkout main -- output')
  Dir.foreach(__dir__) do |f|
    next if %w(. .. .git .idea output Rakefile).include?(f)
    FileUtils.rm_rf(f)
  end
  Dir.foreach(File.join(__dir__, 'output')) do |f|
    next if %w(. ..).include?(f)
    FileUtils.cp_r(File.join(__dir__, 'output', f), File.join(__dir__, f))
  end
  FileUtils.rm_rf('output')
end

desc "Commit and deploy"
task :deploy do
  system('git add .')
  system('git commit')
  system('git push origin gh-pages')
end
