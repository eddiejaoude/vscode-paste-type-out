import * as vscode from 'vscode';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPasteTypeEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('paste-type');
  return Boolean(config.get<boolean>('enabled', true));
}

function getTypingDelayMs(): number {
  const config = vscode.workspace.getConfiguration('paste-type');
  return Math.max(0, Number(config.get<number>('typingDelayMs', 40)));
}

type SpeedOption = {
  label: string;
  description: string;
  delayMs: number;
};

const SPEED_OPTIONS: ReadonlyArray<SpeedOption> = [
  { label: 'Slow', description: '120 ms per character', delayMs: 120 },
  { label: 'Comfortable', description: '80 ms per character', delayMs: 80 },
  { label: 'Balanced', description: '40 ms per character', delayMs: 40 },
  { label: 'Fast', description: '20 ms per character', delayMs: 20 },
  { label: 'Instant', description: '0 ms per character', delayMs: 0 }
];

function getSpeedLabelFromDelay(delayMs: number): string {
  const exactMatch = SPEED_OPTIONS.find((option) => option.delayMs === delayMs);
  if (exactMatch) {
    return exactMatch.label;
  }

  if (delayMs <= 10) {
    return 'Very Fast';
  }
  if (delayMs <= 30) {
    return 'Fast';
  }
  if (delayMs <= 60) {
    return 'Balanced';
  }
  if (delayMs <= 100) {
    return 'Comfortable';
  }

  return 'Slow';
}

function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'paste-type.toggleEnabled';
  statusBarItem.tooltip = 'Toggle Paste Type on/off';
  return statusBarItem;
}

function createSpeedStatusBarItem(): vscode.StatusBarItem {
  const speedStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  speedStatusBarItem.command = 'paste-type.selectSpeed';
  speedStatusBarItem.tooltip = 'Choose Paste Type typing speed';
  return speedStatusBarItem;
}

function updateStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
  const enabled = isPasteTypeEnabled();
  statusBarItem.text = enabled ? '$(check) Paste Type: On' : '$(circle-slash) Paste Type: Off';
}

function updateSpeedStatusBarItem(speedStatusBarItem: vscode.StatusBarItem): void {
  const delayMs = getTypingDelayMs();
  const speedLabel = getSpeedLabelFromDelay(delayMs);
  speedStatusBarItem.text = `$(clock) Paste Speed: ${speedLabel}`;
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
  const speedStatusBarItem = createSpeedStatusBarItem();
  updateStatusBarItem(statusBarItem);
  updateSpeedStatusBarItem(speedStatusBarItem);
  statusBarItem.show();
  speedStatusBarItem.show();

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

      const typingDelayMs = getTypingDelayMs();
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

  const selectSpeedCommand = vscode.commands.registerCommand('paste-type.selectSpeed', async () => {
    const currentDelayMs = getTypingDelayMs();
    const items = SPEED_OPTIONS.map((option) => ({
      label: option.label,
      description: option.description,
      detail: option.delayMs === currentDelayMs ? 'Current' : undefined,
      delayMs: option.delayMs
    }));

    const picked = await vscode.window.showQuickPick(items, {
      title: 'Paste Type Speed',
      placeHolder: 'Choose typing speed from slow to fast',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!picked) {
      return;
    }

    const config = vscode.workspace.getConfiguration('paste-type');
    await config.update('typingDelayMs', picked.delayMs, vscode.ConfigurationTarget.Global);
    void vscode.window.setStatusBarMessage(`Paste Type speed set to ${picked.label}.`, 1500);
  });

  const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('paste-type.enabled')) {
      updateStatusBarItem(statusBarItem);
    }

    if (event.affectsConfiguration('paste-type.typingDelayMs')) {
      updateSpeedStatusBarItem(speedStatusBarItem);
    }
  });

  context.subscriptions.push(
    pasteCommand,
    toggleCommand,
    selectSpeedCommand,
    configWatcher,
    statusBarItem,
    speedStatusBarItem
  );
}

export function deactivate(): void {
  // No resources to clean up.
}
