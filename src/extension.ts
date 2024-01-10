import * as vscode from 'vscode';
import * as path from 'path';
import { CCGDocument, CCGNode, SelectionState } from './model';
import { blockRules, ignoreRules } from './configuration';

export function activate(context: vscode.ExtensionContext) {
	CCGTreeEditorProvider.register(context);
	CCGCodeEditorProvider.register(context);
}

export class CCGTreeEditorProvider implements vscode.CustomTextEditorProvider {
	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new CCGTreeEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(CCGTreeEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'ccg.treeEditor';

	sourceName: string = "";
	sourceType: string = "";
	ccgTree: any;
	selectedNodes: CCGNode[] = [];
	coreModule: any;

	constructor(private readonly context: vscode.ExtensionContext) { }

	resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		};

		webviewPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'addMarking':
						let originalJSON = JSON.parse(document.getText());
						console.log(originalJSON.markedCCGNodes[message.id]);
						switch (originalJSON.markedCCGNodes[message.id]) {
							case 'deletion':
								originalJSON.markedCCGNodes[message.id] = 'condition';
								break;
							case 'condition':
								originalJSON.markedCCGNodes[message.id] = 'repetition';
								break;
							case 'repetition':
								originalJSON.markedCCGNodes[message.id] = 'substitution';
								break;
							case 'substitution':
								delete originalJSON.markedCCGNodes[message.id];
								break;
							default:
								originalJSON.markedCCGNodes[message.id] = 'deletion';
						}
						const edit = new vscode.WorkspaceEdit();
						edit.replace(document.uri, new vscode.Range(
							document.positionAt(0),
							document.positionAt(document.getText().length)
						), JSON.stringify(originalJSON));
						vscode.workspace.applyEdit(edit);
						return;
					case 'generate':
						this.generateTemplate();
				}
			},
			undefined,
			this.context.subscriptions
		);

		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.uri.toString() === document.uri.toString()) {
				document = event.document;
				this.getTreeWebviewContent(document.getText(), webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath((this.context as unknown as vscode.ExtensionContext).extensionUri, 'reactflow-visualization', 'dist', 'assets', 'index.js')), webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath((this.context as unknown as vscode.ExtensionContext).extensionUri, 'reactflow-visualization', 'dist', 'assets', 'index.css'))).then((result => {
					webviewPanel.webview.html = result;
				}));
			}
		});

		return this.getTreeWebviewContent(document.getText(), webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath((this.context as unknown as vscode.ExtensionContext).extensionUri, 'reactflow-visualization', 'dist', 'assets', 'index.js')), webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath((this.context as unknown as vscode.ExtensionContext).extensionUri, 'reactflow-visualization', 'dist', 'assets', 'index.css'))).then((result => {
			webviewPanel.webview.html = result;
		}));
	}

	async getTreeWebviewContent(fileContent: string, reactUri: vscode.Uri, reactCss: vscode.Uri) {
		var ccgDocument: CCGDocument | undefined;
		try {
			ccgDocument = JSON.parse(fileContent);
		} catch {
			return 'The JSON could not be parsed 😭';
		}
		if (!ccgDocument?.baseCodePath) {
			return 'It seems there is no baseCodePath 😔';
		} else {
			try {
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders) {
					throw new Error('No workspace folders found.');
				}
				const workspaceFolder = workspaceFolders[0].uri.fsPath;
				const baseCodeUri = vscode.Uri.file(path.join(workspaceFolder, ccgDocument.baseCodePath));
				const extension = baseCodeUri.path.substring(baseCodeUri.path.lastIndexOf('.') + 1);
				this.sourceType = extension;
				this.sourceName = ccgDocument.baseCodePath.substring(ccgDocument.baseCodePath.lastIndexOf('/') + 1).substring(0, ccgDocument.baseCodePath.lastIndexOf('.'));
				const baseCode = Buffer.from(await vscode.workspace.fs.readFile(baseCodeUri)).toString('utf-8');
				if(!this.coreModule) {
					this.coreModule = await import('ccg-core/dist/src/index.js');
				}
				this.ccgTree = this.coreModule.ccgParseString(baseCode, extension);
				this.selectedNodes = ccgDocument?.markedCCGNodes ?? [];
	
				return `<!DOCTYPE html>
					<html lang="en">
						<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-data' vscode-resource:; style-src 'unsafe-inline' vscode-resource:;">
							<link rel="stylesheet" href="${reactCss}">
							<style>
								#legend {
									display: flex;
									flex-direction: column;
									margin-bottom: 15px;
								}

								#legend > span {
									display: block;
								}

								#legend > span::before {
									content: "";
									display: inline-block;
									width: 10px;
									height: 10px;
									margin-right: 5px;
								}

								#legend > span.repetition::before {
									background-color: rgb(79, 134, 236);
								}
								
								#legend > span.condition::before {
									background-color: rgb(220, 230, 82);;
								}

								#legend > span.substitution::before {
									background-color: rgb(142, 236, 79);
								}

								#legend > span.deletion::before {
									background-color: rgb(236, 79, 110);
								}
							</style>
							<title>CCG</title>
						</head>
						<body>
							<div id="root"></div>
							<div id="bottom-elements" style="position: absolute; bottom: 0; right: 0; margin: 25px; display: flex; flex-direction: column;">
								<div id="legend">
									<span class="repetition">Repetition</span>
									<span class="condition">Condition</span>
									<span class="substitution">Substitution</span>
									<span class="deletion">Deletion</span>
								</div>
								<div id="buttons">
									<button id="generate-button" type="button">Generate</button>
								</div>
							</div>
							<script nonce="data">
								const vscode = acquireVsCodeApi();
								const astNodes=${this.ccgTree.toString()}
								const markedCCGNodes=${JSON.stringify(this.selectedNodes)}

								document.getElementById('generate-button').addEventListener('click', () => {
									vscode.postMessage({
										command: 'generate'
									});
								});
							</script>
							<script src="${reactUri}"></script>
						</body>
					</html>`;
			} catch(e) {
				return "Couldn't open or parse the provided baseCodePath 😵‍💫";
			}
		}
	}

	generateTemplate() {
		this.ccgTree = setSelections(this.ccgTree, this.selectedNodes);
		const result = this.coreModule.generateCCGTemplate(this.sourceType, this.ccgTree);

		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			const workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
			const relativeFilePath = vscode.Uri.joinPath(workspaceFolder, 'generators', `${this.sourceName}-generator.mjs`);
			
			const data = Buffer.from(result, 'utf8');
			
			vscode.workspace.fs.writeFile(relativeFilePath, data).then(() => {
				vscode.window.showInformationMessage('Generated successfully!');
			}, err => {
				vscode.window.showErrorMessage('Error writing file: ' + err);
			});
		} else {
			vscode.window.showErrorMessage('No workspace folder found.');
		}
	}
}

export class CCGCodeEditorProvider implements vscode.CustomTextEditorProvider {
	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new CCGCodeEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(CCGCodeEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'ccg.codeEditor';

	sourceName: string = "";
	sourceType: string = "";
	ccgTree: any;
	selectedNodes: CCGNode[] = [];
	coreModule: any;

	constructor(private readonly context: vscode.ExtensionContext) { }

	resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		};

		webviewPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'addMarking':
						let originalJSON = JSON.parse(document.getText());
						switch (originalJSON.markedCCGNodes[message.id]) {
							case 'deletion':
								originalJSON.markedCCGNodes[message.id] = 'condition';
								break;
							case 'condition':
								originalJSON.markedCCGNodes[message.id] = 'repetition';
								break;
							case 'repetition':
								originalJSON.markedCCGNodes[message.id] = 'substitution';
								break;
							case 'substitution':
								delete originalJSON.markedCCGNodes[message.id];
								break;
							default:
								originalJSON.markedCCGNodes[message.id] = 'deletion';
						}
						const edit = new vscode.WorkspaceEdit();
						edit.replace(document.uri, new vscode.Range(
							document.positionAt(0),
							document.positionAt(document.getText().length)
						), JSON.stringify(originalJSON));
						vscode.workspace.applyEdit(edit);
						return;
					case 'generate':
						this.generateTemplate();
				}
			},
			undefined,
			this.context.subscriptions
		);

		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.uri.toString() === document.uri.toString()) {
				document = event.document;
				this.getCodeWebviewContent(document.getText()).then((result => {
					webviewPanel.webview.html = result;
				}));
			}
		});

		return this.getCodeWebviewContent(document.getText()).then((result => {
			webviewPanel.webview.html = result;
		}));
	}

	buildCodeContent(tree: any): string {
		if(ignoreRules[this.sourceType]?.includes(tree.ruleName)) {
			return '';
		}
		const isBlockRule = blockRules[this.sourceType]?.includes(tree.ruleName);
		if(!tree.content && tree.children.length < 2 && !isBlockRule) {
			return tree.children.map((child: any) => this.buildCodeContent(child)).join("") + tree.content;
		} else {
			return this.wrapContentInHtmlTag(tree.id, isBlockRule, tree.children.map((child: any) => this.buildCodeContent(child)).join("") + tree.content);
		}
	}

	wrapContentInHtmlTag(id: string, isBlockRule: boolean, content: string): string {
		let selection = "";
		for (const selectedNode in this.selectedNodes) {
			if(selectedNode === id) {
				selection = this.selectedNodes[selectedNode] as unknown as string;
				break;
			}
		}

		return `<ccgnode node-id="${id}" selection="${selection}" ${isBlockRule ? 'block-rule' : ''}>${content}</ccgnode>`;
	}

	async getCodeWebviewContent(fileContent: string) {
		var ccgDocument: CCGDocument | undefined;
		try {
			ccgDocument = JSON.parse(fileContent);
		} catch {
			return 'The JSON could not be parsed 😭';
		}
		if (!ccgDocument?.baseCodePath) {
			return 'It seems there is no baseCodePath 😔';
		} else {
			try {
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders) {
					throw new Error('No workspace folders found.');
				}
				const workspaceFolder = workspaceFolders[0].uri.fsPath;
				const baseCodeUri = vscode.Uri.file(path.join(workspaceFolder, ccgDocument.baseCodePath));
				const extension = baseCodeUri.path.substring(baseCodeUri.path.lastIndexOf('.') + 1);
				this.sourceType = extension;
				this.sourceName = ccgDocument.baseCodePath.substring(ccgDocument.baseCodePath.lastIndexOf('/') + 1).substring(0, ccgDocument.baseCodePath.lastIndexOf('.'));
				const baseCode = Buffer.from(await vscode.workspace.fs.readFile(baseCodeUri)).toString('utf-8');
				if(!this.coreModule) {
					this.coreModule = await import('ccg-core/dist/src/index.js');
				}
				this.ccgTree = this.coreModule.ccgParseString(baseCode, extension);
				this.selectedNodes = ccgDocument?.markedCCGNodes ?? [];

				const codeContent = this.buildCodeContent(this.ccgTree);
	
				return `<!DOCTYPE html>
					<html lang="en">
						<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' vscode-resource:; style-src 'unsafe-inline' vscode-resource:;">
							<style>
								#legend {
									display: flex;
									flex-direction: column;
									margin-bottom: 15px;
								}

								#legend > span {
									display: block;
								}

								#legend > span::before {
									content: "";
									display: inline-block;
									width: 10px;
									height: 10px;
									margin-right: 5px;
								}

								#legend > span.repetition::before {
									background-color: rgb(79, 134, 236);
								}
								
								#legend > span.condition::before {
									background-color: rgb(220, 230, 82);
								}

								#legend > span.substitution::before {
									background-color: rgb(142, 236, 79);
								}

								#legend > span.deletion::before {
									background-color: rgb(236, 79, 110);
								}

								ccgnode {
									display: inline-block;
									padding-left: 5px;
								}

								ccgnode[block-rule] {
									display: block;
								}

								ccgnode[selection="repetition"] {
									border: 1px solid rgb(79, 134, 236);
									border-left-width: 4px;
								}

								ccgnode[selection="condition"] {
									border: 1px solid rgb(220, 230, 82);
									border-left-width: 4px;
								}

								ccgnode[selection="substitution"] {
									border: 1px solid rgb(142, 236, 79);
									border-left-width: 4px;
								}

								ccgnode[selection="deletion"] {
									border: 1px solid rgb(236, 79, 110);
									border-left-width: 4px;
								}
							</style>
							<title>CCG</title>
						</head>
						<body>
							<div id="root">
								<div id="content">
									${codeContent}
								</div>
							</div>
							<div id="bottom-elements" style="position: absolute; bottom: 0; right: 0; margin: 25px; display: flex; flex-direction: column;">
								<div id="legend">
									<span class="repetition">Repetition</span>
									<span class="condition">Condition</span>
									<span class="substitution">Substitution</span>
									<span class="deletion">Deletion</span>
								</div>
								<div id="buttons">
									<button id="generate-button" type="button">Generate</button>
								</div>
							</div>
							<script nonce="data">
								const vscode = acquireVsCodeApi();
								const astNodes=${this.ccgTree.toString()}
								const markedCCGNodes=${JSON.stringify(this.selectedNodes)}

								document.getElementById('generate-button').addEventListener('click', () => {
									vscode.postMessage({
										command: 'generate'
									});
								});

								[...document.getElementsByTagName("ccgnode")].forEach((ccgnode) => {
									ccgnode.addEventListener("click", e => {
										vscode.postMessage({
											command: "addMarking",
											id: ccgnode.getAttribute("node-id")
										});
										e.stopPropagation();
									});
								});
							</script>
						</body>
					</html>`;
			} catch {
				return "Couldn't open or parse the provided baseCodePath 😵‍💫";
			}
		}
	}

	generateTemplate() {
		this.ccgTree = setSelections(this.ccgTree, this.selectedNodes);
		const result = this.coreModule.generateCCGTemplate(this.sourceType, this.ccgTree);

		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			const workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
			const relativeFilePath = vscode.Uri.joinPath(workspaceFolder, 'generators', `${this.sourceName}-generator.mjs`);
			
			const data = Buffer.from(result, 'utf8');
			
			vscode.workspace.fs.writeFile(relativeFilePath, data).then(() => {
				vscode.window.showInformationMessage('Generated successfully!');
			}, err => {
				vscode.window.showErrorMessage('Error writing file: ' + err);
			});
		} else {
			vscode.window.showErrorMessage('No workspace folder found.');
		}
	}

}

function setSelections(ccgTree: any, selections: any) {
	const setSelection = (tree: any, id: string, selection: SelectionState): boolean => {
		if(tree && (tree.id === id || tree.fullId === id)) {
			tree.selection = selection;
			return true;
		} else {
			for(const child of tree.children) {
				setSelection(child, id, selection);
			}
		}
		return false;
	};
	for(const selectionKey in selections) {
		setSelection(ccgTree, selectionKey, selections[selectionKey] as SelectionState);
	}
	return ccgTree;
}

// This method is called when your extension is deactivated
export function deactivate() { }
