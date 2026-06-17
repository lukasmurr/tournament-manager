# tournament-manager

Angular 21 tournament dashboard scaffold using standalone components, Signals, and functional routing.

## Local development

```bash
npm install
npm start
```

## Tests

```bash
npm test -- --watch=false
```

## Build

```bash
npm run build
```

## GitHub Pages deployment (angular-cli-ghpages)

1. Install deploy builder:

```bash
npm install --save-dev angular-cli-ghpages
```

2. Ensure `angular.json` contains this target:

```json
"deploy": {
  "builder": "angular-cli-ghpages:deploy",
  "options": {
    "buildTarget": "tournament-manager:build:production"
  }
}
```

3. Deploy with the required GitHub Pages base href:

```bash
ng deploy --base-href=/tournament-manager/
```
