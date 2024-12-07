const vscode = require('vscode');
const path = require('path');
const {exec} = require('child_process');
const fs = require('fs');

function activate(context) {
  let disposable =
      vscode.commands.registerCommand('symasm.translateAsm', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    const originalFile = editor.document.fileName;
    const originalDir = path.dirname(originalFile);

    const originalBasename =
        path.basename(originalFile, path.extname(originalFile));

    const inputFile =
        path.join(originalDir, originalBasename + '.input');

    const outputFile =
        path.join(originalDir, originalBasename + '.symasm');

    fs.writeFileSync(inputFile, text);

    const symasmPath =
        path.join(__dirname, '..', 'symasm',
            'symasm_original_project', 'symasm.py');

    exec(`python3 ${symasmPath} ${inputFile}`, (err, stdout, stderr) => {
      if (err) {
        vscode.window.showErrorMessage(`Error: ${stderr}`);
        return;
      }
      const simcode = stdout.split('\n').map((line, index) => {
        const parts = line.split(';');
        const originalLine = text.split('\n')[index] || '';
        const match = originalLine.match(/^\s*/);
        const indentation = match ? match[0] : '';
        if (parts.length > 1) {
          return indentation + parts[1].trim();
        } else {
          return originalLine;
        }
      }).join('\n');

      fs.writeFileSync(outputFile, simcode);

      vscode.workspace.openTextDocument(outputFile).then(doc => {
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      });

      fs.unlink(inputFile, (err) => {
        if (err) {
          console.error(`Failed to delete input file: ${err.message}`);
        }
      });
    });
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
