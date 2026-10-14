# Limon Promosyon client feedback demo

[Open the interactive demo](https://berkyusufoversoy.github.io/limonpromosyondemo/)

This repository contains the static website published by GitHub Pages from the `main` branch. It includes the homepage, product customizer, cart, checkout and simulated customer/management workflows.

Demo requests, files and saved designs run entirely in browser memory and clear on reload. Cart preferences use tab-scoped session storage. Use **Demoyu sıfırla** to clear the complete demo session. Orders and payments are simulated.

The original source repository remains private. Its `npm run build:demo` command generates the static files in `demo-site/`; copy those generated files here to publish a source update. Changes pushed to this repository automatically redeploy GitHub Pages.

## Product sources

The catalog contains only 1,181 İlpen XML products and 239 Alina products. İlpen data is the extracted 7 October 2026 snapshot, not live inventory. Supplier IDs, descriptions, links, variants, stock and prices are retained. Unknown stock, zero prices and an invalid VAT value remain flagged rather than guessed.

The supplier XML endpoint and linked pages timed out during this update. There are 137 usable cached photos associated with exact İlpen identities; the other 1,044 products retain their external supplier image URLs. Product pages expose the available source data and a JSON download. Print geometry, production minimums and printing charges are not supplied by the feed; customization and checkout are demonstrations.
