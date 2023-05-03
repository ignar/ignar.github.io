require 'kramdown/parser/kramdown'
require 'kramdown-parser-gfm'

# Based on the API doc comment: https://github.com/gettalong/kramdown/blob/master/lib/kramdown/parser/kramdown.rb
# https://gist.github.com/DivineDominion/83feb20f7a1fa059b915d6e5c412e1b9
class Kramdown::Parser::GFMWikiLink < Kramdown::Parser::GFM
  def initialize(source, options)
    super

    # Override existing Table parser to use our own start Regex which adds a check for wikilinks
    @@parsers.delete(:table) #Data(:table, TABLE_START, nil, "parse_table")
    self.class.define_parser(:table, TABLE_START)

    @span_parsers.unshift(:wikilinks)
  end

  # Override Kramdown table pipe check so we can write `[[pagename|Anchor Text]]`.
  # https://github.com/gettalong/kramdown/blob/master/lib/kramdown/parser/kramdown/table.rb
  # Regex test suite: https://regexr.com/5rb9q
  TABLE_PIPE_CHECK = /^(?:\|(?!\[\[)|[^\[]*?(?!\[\[)[^\[]*?\||.*?(?:\[\[[^\]]+\]\]).*?\|)/.freeze  # Fail for wikilinks in same line
  TABLE_LINE = /#{TABLE_PIPE_CHECK}.*?\n/.freeze  # Unchanged
  TABLE_START = /^#{OPT_SPACE}(?=\S)#{TABLE_LINE}/.freeze  # Unchanged

  WIKILINKS_MATCH = /\[\[(.*?)\]\]/.freeze
  define_parser(:wikilinks, WIKILINKS_MATCH, '\[\[')

  def parse_wikilinks
    line_number = @src.current_line_number

    # Advance parser position
    @src.pos += @src.matched_size

    wikilink = Wikilink.parse(@src[1])
    el = Element.new(:a, nil, {'href' => wikilink.url, 'title' => wikilink.title}, location: line_number)
    add_text(wikilink.title, el)
    @tree.children << el

    el
  end

  # [[page_name|Optional title]]
  # For a converter that uses the available pages, see: <https://github.com/metala/jekyll-wikilinks-plugin/blob/master/wikilinks.rb>
  class Wikilink
    def self.parse(text)
      name, title = text.split('|', 2)
      title = name if title.nil?
      self.new(name, title)
    end

    attr_accessor :name, :title
    attr_reader :match

    def initialize(name, title)
      @name = name.strip.gsub(/ +/, '-')
      @title = title
    end

    def title
      @title || @name
    end

    def url
      "/notes/#{@name}.html"
    end
  end
end