# Paste Type

A VS Code extension that types clipboard text into the editor when you paste.

## What it does

- Overrides paste in text editors (`Ctrl+V` / `Cmd+V`)
- Reads your clipboard text
- Types it character-by-character
- Preserves exact formatting, including spaces, tabs, and indentation
- Adds a status bar toggle so you can quickly turn Paste Type on/off and see current state

## Configuration

- `paste-type.enabled`: Enables/disables Paste Type.
  - Default: `true`
  - When disabled, `Ctrl+V` / `Cmd+V` uses VS Code's default paste behavior.
- `paste-type.typingDelayMs`: Delay (in milliseconds) between each typed character.
  - Default: `0`
  - Increase this if you want visible typing animation.

## Toggle on/off quickly

- Use the status bar button on the right side:
  - `Paste Type: On`
  - `Paste Type: Off`
- Click the button to toggle state.
- You can also run the command: `Paste Type: Toggle Enabled`.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Compile:
   ```bash
   npm run compile
   ```
3. Press `F5` in VS Code to launch an Extension Development Host.
4. Copy code and paste in an editor to see it typed out.

## Install in VS Code

1. Install the VS Code extension packager:
   ```bash
   npm install -g @vscode/vsce
   ```
2. From this project folder, build and package the extension:
   ```bash
   npm install
   npm run compile
   vsce package
   ```
3. Install the generated `.vsix` file using one of these options:

- Command line:
  ```bash
  code --install-extension paste-type-0.0.1.vsix
  ```
- VS Code UI:
  1. Open Extensions view.
  2. Click the `...` menu.
  3. Select `Install from VSIX...`.
  4. Choose the generated `.vsix` file.

4. Reload VS Code when prompted.

## Publish to VS Code Marketplace (App Store)

1. Prepare extension metadata in `package.json`:

- Ensure `name`, `displayName`, `description`, `version`, and `publisher` are correct.
- Add `repository`, `license`, and `icon` fields if missing (recommended for listing quality).

2. Create a publisher profile:

- Go to https://marketplace.visualstudio.com/manage and create a publisher if you do not have one.

3. Create a Personal Access Token (PAT):

- In Azure DevOps (https://dev.azure.com), create a PAT with Marketplace publish/manage permissions.

4. Install `vsce` (if not already installed):

```bash
npm install -g @vscode/vsce
```

5. Log in with your publisher name:

```bash
vsce login <your-publisher-name>
```

- Paste your PAT when prompted.

6. Publish:

```bash
npm run compile
vsce publish
```

Optional version bump while publishing:

```bash
vsce publish patch
vsce publish minor
vsce publish major
```

After publish, your extension should appear on the VS Code Marketplace within a few minutes.
