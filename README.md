# Development

The site needs the Ruby version in `.ruby-version` (4.0.9). The stylesheet is
compiled with Dart Sass through `nanoc-dart-sass`.

```
bundle install
bundle exec nanoc compile -W
```

```
bundle exec nanoc view -L
```

The profile links under the intro (github, linkedin, email) are set in
`nanoc.yaml` under `links`. A link with no `url` is not shown.

The diagrams at the top of the page are drawn by `content/assets/js/figures.js`.

# Publishing

```
bundle exec nanoc compile
bundle exec nanoc deploy
```

GitHub Pages serves the `gh-pages` branch at https://melnykov.dev. Keep
`content/CNAME`: it is copied to the root of the output, and Pages reads the
custom domain from it.
