import * as vscode from 'vscode';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPasteTypeEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('paste-type');
  return Boolean(config.get<boolean>('enabled', true));
}

function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'paste-type.toggleEnabled';
  statusBarItem.tooltip = 'Toggle Paste Type on/off';
  return statusBarItem;
}

function updateStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
  const enabled = isPasteTypeEnabled();
  statusBarItem.text = enabled ? '$(check) Paste Type: On' : '$(circle-slash) Paste Type: Off';
}

function getPositionAfterInsertedText(
  start: vscode.Position,
  insertedText: string
): vscode.Position {
  const lines = insertedText.split('\n');
  if (lines.length === 1) {
    return start.translate(0, lines[0].length);
  }

  return new vscode.Position(start.line + lines.length - 1, lines[lines.length - 1].length);
}

async function insertLiteralTextAtSelections(
  editor: vscode.TextEditor,
  text: string
): Promise<void> {
  const nextSelections = editor.selections.map((selection) => {
    const nextPosition = getPositionAfterInsertedText(selection.start, text);
    return new vscode.Selection(nextPosition, nextPosition);
  });

  const applied = await editor.edit(
    (editBuilder) => {
      for (const selection of editor.selections) {
        editBuilder.replace(selection, text);
      }
    },
    { undoStopBefore: false, undoStopAfter: false }
  );

  if (applied) {
    editor.selections = nextSelections;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBarItem = createStatusBarItem();
  updateStatusBarItem(statusBarItem);
  statusBarItem.show();

  const pasteCommand = vscode.commands.registerCommand(
    'paste-type.typePasteFromClipboard',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      if (!isPasteTypeEnabled()) {
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        return;
      }

      const clipboardText = await vscode.env.clipboard.readText();
      if (!clipboardText) {
        return;
      }

      const config = vscode.workspace.getConfiguration('paste-type');
      const typingDelayMs = Math.max(0, Number(config.get<number>('typingDelayMs', 0)));
      const normalizedClipboardText = clipboardText.replace(/\r\n?/g, '\n');

      for (const character of normalizedClipboardText) {
        await insertLiteralTextAtSelections(editor, character);

        if (typingDelayMs > 0) {
          await delay(typingDelayMs);
        }
      }
    }
  );

  const toggleCommand = vscode.commands.registerCommand('paste-type.toggleEnabled', async () => {
    const config = vscode.workspace.getConfiguration('paste-type');
    const currentlyEnabled = isPasteTypeEnabled();
    await config.update('enabled', !currentlyEnabled, vscode.ConfigurationTarget.Global);

    const nextState = !currentlyEnabled ? 'enabled' : 'disabled';
    void vscode.window.setStatusBarMessage(`Paste Type ${nextState}.`, 1500);
  });

  const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('paste-type.enabled')) {
      updateStatusBarItem(statusBarItem);
    }
  });

  context.subscriptions.push(pasteCommand, toggleCommand, configWatcher, statusBarItem);
}

export function deactivate(): void {
  // No resources to clean up.
}
