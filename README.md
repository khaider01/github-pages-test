# github-pages-test

A minimal static site for testing GitHub Pages.

## Live site

Once Pages is enabled (Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`) the site is published at:

https://khaider01.github.io/github-pages-test/

## Local preview

Open `index.html` in a browser, or serve the folder:

```powershell
python -m http.server 8000
```

## How it deploys

Everything on the `main` branch root is served as-is. No build step, no workflow:
edit `index.html`, commit, push, and the live site updates within a minute or so.
