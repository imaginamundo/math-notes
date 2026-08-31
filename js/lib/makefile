# Regenerate the bundled mathjs. The runtime loads math.bundle.min.js.
# The pinned version lives in this file's import and in package.json.
bundle:
	deno bundle --node-modules-dir=auto --platform=browser -o math.bundle.js math.js
	deno bundle --node-modules-dir=auto --platform=browser --minify -o math.bundle.min.js math.js
