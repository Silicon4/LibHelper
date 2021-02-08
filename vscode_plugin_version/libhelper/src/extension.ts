// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { create } from 'domain';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { isNumber, isString } from 'util';
import { type } from 'os';
import { stringify } from 'querystring';

var confValues = {
	libConfFilePath: "",
	describeFileFolderName: "",
	describeFileName: "",
	libSrcPath: ""
}

var finalTree = {}
const modelConfigText = [
	'//此为模板，请编辑后删除',
	"//{",
	'//    "libConfFilePath": "填写最终生成头文件的位置",',
	'//    "libSrcPath": "通用库源码路径",',
	'//    "describeFileFolderName": "描述文件的文件夹名",',
	'//    "describeFileName": "描述文件的文件名"',
	'//}',
]

function AddModelToConfigFile(uristr: string) {
	const wsedit = new vscode.WorkspaceEdit();
	const jsonuri = vscode.Uri.file(uristr);
	var str = ""
	for (var i = 0; i < modelConfigText.length; i++) {
		str = str + modelConfigText[i] + "\r\n"
	}
	vscode.workspace.openTextDocument(jsonuri).then((document) => {

		let text = document.getText();
		console.log(text.indexOf(str))
		if (text.indexOf(str) < 0) {
			console.log(str + text)
			wsedit.get(jsonuri)
			wsedit.insert(jsonuri, new vscode.Position(0, 0), str)

			vscode.workspace.applyEdit(wsedit).then(() => {
				vscode.window.showTextDocument(jsonuri);
				vscode.window.showInformationMessage('请按照模板编辑，并且移除模板内容');
			})
		}

	});
	// wsedit.createFile(jsonuri);
	// wsedit.get(jsonuri)
	// // wsedit.replace(jsonuri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(2, 0)), '{\r\n"mcu":"unset"\r\n}')

	// vscode.workspace.applyEdit(wsedit).then(() => {
	// 	vscode.window.showTextDocument(jsonuri);
	// 	vscode.window.showInformationMessage('请先进行路径配置');
	// })
}
function getWsPath() {
	if (vscode.workspace.workspaceFolders) {
		return vscode.workspace.workspaceFolders[0].uri.fsPath;
	} else {
		return ""
	}
}
function checkVscodeFolder() {
	if (vscode.workspace.workspaceFolders) {
		const uristr = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const uri = vscode.Uri.file(uristr);
		return vscode.workspace.fs.readDirectory(uri).then(
			(someArray) => {
				// var hasConfig = false;
				var hasVscodeFolder = false
				for (var i = 0; i < someArray.length; i++) {
					var curArray = someArray[i]
					// console.log(someArray[i])
					if (curArray[1] == 2 && curArray[0] == ".vscode") {
						hasVscodeFolder = true
						break;
					}
				}
				//没找到vscode文件夹，新建文件夹
				if (!hasVscodeFolder) {
					fs.mkdirSync(uristr + "/.vscode");
				}
			})
	}
}
function editSettingFile(uristr: string) {
	const uri = vscode.Uri.file(uristr);

	vscode.workspace.fs.readDirectory(uri).then(
		(someArray) => {
			// var hasConfig = false;
			var hasVscodeFolder = false
			for (var i = 0; i < someArray.length; i++) {
				var curArray = someArray[i]
				// console.log(someArray[i])
				if (curArray[1] == 2 && curArray[0] == ".vscode") {
					hasVscodeFolder = true
					break;
				}
			}
			//没找到vscode文件夹，新建文件夹
			if (!hasVscodeFolder) {
				fs.mkdirSync(uristr + "/.vscode");
			}
			vscode.workspace.fs.readDirectory(vscode.Uri.file(uristr + "/.vscode")).then(
				(someArray) => {
					var hasConfig = false
					for (var i = 0; i < someArray.length; i++) {
						var curArray = someArray[i]
						// console.log(someArray[i])
						if (curArray[1] == 1 && curArray[0] == "libHelperConf.json") {
							hasConfig = true
							console.log("found config json")
							break;
						}
					}
					//没找到配置文件，新建文件
					if (!hasConfig) {
						const wsedit = new vscode.WorkspaceEdit();
						const jsonuri = vscode.Uri.file(uristr + "/.vscode/" + "libHelperConf.json");
						wsedit.createFile(jsonuri);
						// wsedit.get
						// wsedit.replace(jsonuri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(2, 0)), '{\r\n"mcu":"unset"\r\n}')

						vscode.workspace.applyEdit(wsedit).then(() => {
							vscode.window.showTextDocument(jsonuri);
							// vscode.window.showInformationMessage('请先进行路径配置');
							AddModelToConfigFile(uristr + "/.vscode/" + "libHelperConf.json")
						})
					} else {
						AddModelToConfigFile(uristr + "/.vscode/" + "libHelperConf.json")
					}

				})
		}
	)
}
var definelist = [{}]
function findConfInObj(label: string, obj: object) {
	if (typeof obj == 'string') {
		console.log(label, obj)
		// if (Number(obj) == 1) {
		definelist.push({
			label: label,
			value: obj
		})
		return;
	}
	var keys = Object.keys(obj)
	let objAny: any = obj
	// console.log("keys", keys)
	if (keys.length == 0) {
		console.log(label, obj)
		// if (Number(obj) == 1) {
		definelist.push({
			label: label,
			value: obj
		})
		// }
	} else {
		for (var i = 0; i < keys.length; i++) {
			// console.log(objAny[keys[i]])
			// if (objAny[keys[i]] == undefined) {
			// 	console.log(objAny)
			// } else {
			findConfInObj(keys[i], objAny[keys[i]])
			// }
		}
	}
}
async function genHeadFile() {
	await updateSettingsToVar()
	let treenode: any = finalTree
	const jsonuri = vscode.Uri.file(getWsPath() + "/.vscode/" + "libHelperTree.json");
	vscode.workspace.openTextDocument(jsonuri).then((document) => {

		let text = document.getText();
		if (text.match(/^\s*$/)) {
			text = "{}"
		}
		try {
			finalTree = {}
			oldTree = JSON.parse(text)
			definelist = []
			let definelistany: any = definelist
			findConfInObj("", oldTree)
			console.log("definelist", definelist)
			var definestr = ""
			for (var i = 0; i < definelistany.length; i++) {
				definestr = definestr + "#define " + definelistany[i].label.toString() + " " + definelistany[i].value.toString() + "\r\n"
			}
			console.log("definestr", definestr)


			var wsedit = new vscode.WorkspaceEdit();
			const jsonuri = vscode.Uri.file(getWsPath() + "/" + confValues.libConfFilePath);
			console.log("jsonuri", jsonuri)

			vscode.workspace.findFiles(
				jsonuri.path
			).then(
				async result => {
					console.log(result)
					if (result.length == 0) {
						wsedit.createFile(jsonuri);
						await vscode.workspace.applyEdit(wsedit)
					}

					console.log("definestr", definestr)
					vscode.workspace.openTextDocument(jsonuri).then((document) => {
						var firstLine = document.lineAt(0);
						var lastLine = document.lineAt(document.lineCount - 1);
						var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
						wsedit = new vscode.WorkspaceEdit();
						wsedit.get(jsonuri)
						wsedit.delete(jsonuri, textRange)
						wsedit.insert(jsonuri, new vscode.Position(0, 0), definestr)

						vscode.workspace.applyEdit(wsedit).then(() => {
							vscode.window.showTextDocument(jsonuri);
							// vscode.window.showInformationMessage('请按照模板编辑，并且移除模板内容');
						})
					})


				})

		} catch {

		}
	})
}
function updateSettingsToVar() {
	return vscode.workspace.fs.readDirectory(vscode.Uri.file(getWsPath() + "/.vscode")).then(
		(someArray) => {
			var hasConfig = false
			for (var i = 0; i < someArray.length; i++) {
				var curArray = someArray[i]
				// console.log(someArray[i])
				if (curArray[1] == 1 && curArray[0] == "libHelperConf.json") {
					hasConfig = true
					console.log("found config json")
					break;
				}
			}
			//没找到配置文件，新建文件
			if (!hasConfig) {
				vscode.window.showInformationMessage('未配置请先配置');
				return false;
			} else {
				const jsonuri = vscode.Uri.file(getWsPath() + "/.vscode/libHelperConf.json");

				return vscode.workspace.openTextDocument(jsonuri).then((document) => {

					let text = document.getText();
					console.log("text in conf:", text)
					var conf = JSON.parse(text)
					console.log("libConfFilePath:", conf.libConfFilePath)

					if (conf != undefined
						&& conf.libConfFilePath != undefined
						&& conf.libSrcPath != undefined
						&& conf.describeFileName != undefined
						&& conf.describeFileFolderName != undefined
					) {
						confValues.libConfFilePath = conf.libConfFilePath
						confValues.describeFileName = conf.describeFileName
						confValues.describeFileFolderName = conf.describeFileFolderName
						confValues.libSrcPath = conf.libSrcPath
					} else {
						vscode.window.showInformationMessage('未配置完整请先配置');
						return false
					}
					return true;

				})
			}
		}
	)
}
function findFolderInPath(pathstr: string) {
	try {
		const uri = vscode.Uri.file(pathstr);
		vscode.workspace.fs.stat(uri).then(
			result => {
				console.log(result)
			}
		)
		// .then(
		// 	(someArray) => {
		// 		console.log(someArray)
		// 		// var hasConfig = false;
		// 		var hasVscodeFolder = false
		// 		for (var i = 0; i < someArray.length; i++) {
		// 			var curArray = someArray[i]
		// 			// console.log(someArray[i])
		// 			if (curArray[1] == 2 && curArray[0] == ".vscode") {
		// 				hasVscodeFolder = true
		// 				break;
		// 			}
		// 		}
		// 	}
		// )
	} catch (error) {

		console.log(error)
		vscode.window.showInformationMessage('配置的源码路径错误，请修改');
	}



}
let oldTree = {}
function addToFinalTree(arr: string[], labels: string[]) {
	console.log(arr, labels)
	let treenode: any = finalTree
	let oldtreenode: any = oldTree
	for (var a = 0; a < arr.length; a++) {
		if (treenode[arr[a]] == undefined) {
			treenode[arr[a]] = {}
		}
		if (oldtreenode != undefined) {
			oldtreenode = oldtreenode[arr[a]]
		}
		treenode = treenode[arr[a]]
	}
	for (var a = 0; a < labels.length; a++) {
		var label, state
		state = 0
		label = labels[a]
		if (label.indexOf("|") > -1) {
			var set = label.split("|")
			label = set[0]
			state = set[1]
		}
		if (oldtreenode != undefined && oldtreenode[label] != undefined) {
			state = oldtreenode[label]
		}
		// if (treenode[label] == undefined) {
		treenode[label] = state
		// }

	}
	console.log(finalTree)


}
async function handleOnefile(resultCur: vscode.Uri) {
	return vscode.workspace.openTextDocument(resultCur).then((document) => {
		var wsPath = getWsPath().replace(/[\\]/g, "/")
		var str = document.uri.path.replace(wsPath, "")
		str = str.replace(confValues.libSrcPath, "")
		str = str.replace(confValues.describeFileFolderName +
			"/" + confValues.describeFileName, "")
		str.replace(new RegExp('/+', "gm"), "/")

		var arr = str.split("/")
		while (1) {
			var index = arr.indexOf("");
			if (index > -1) {
				arr.splice(index, 1);
			} else {
				break;
			}
		}
		let text = document.getText();
		var labels = text.replace(/[\r]/g, "").split("\n")
		var validLabel = [];
		for (var i = 0; i < labels.length; i++) {
			if (labels[i].replace(/[\\]/g, "/") != "") {
				validLabel.push(labels[i]);
			}
		}
		// console.log(arr)
		addToFinalTree(arr, validLabel)
	})
}
function constructTree() {
	const wsedit = new vscode.WorkspaceEdit();
	const jsonuri = vscode.Uri.file(getWsPath() + "/.vscode/" + "libHelperTree.json");
	vscode.workspace.openTextDocument(jsonuri).then((document) => {

		let text = document.getText();
		if (text.match(/^\s*$/)) {
			text = "{}"
		}
		try {
			finalTree = {}
			oldTree = JSON.parse(text)
			updateSettingsToVar().then((succ) => {
				console.log(succ);
				if (succ) {
					console.log("start gen tree");
					console.log(confValues);
					vscode.workspace.findFiles(
						confValues.libSrcPath + "/**/" +
						confValues.describeFileFolderName +
						"/" + confValues.describeFileName
					).then(
						async result => {
							console.log(result)
							if (result.length > 0) {
								for (var i = 0; i < result.length; i++) {
									var resultCur = result[i]

									await handleOnefile(resultCur)
								}
								var jsonstr = JSON.stringify(finalTree)
								const wsedit = new vscode.WorkspaceEdit();
								const jsonuri = vscode.Uri.file(getWsPath() + "/.vscode/" + "libHelperTree.json");
								vscode.workspace.openTextDocument(jsonuri).then((document) => {
									var firstLine = document.lineAt(0);
									var lastLine = document.lineAt(document.lineCount - 1);
									var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
									wsedit.delete(jsonuri, textRange)
									wsedit.insert(jsonuri, new vscode.Position(0, 0), jsonstr)

									vscode.workspace.applyEdit(wsedit).then(() => {
										vscode.window.showTextDocument(jsonuri).then(
											() => {
												vscode.commands.executeCommand("editor.action.formatDocument")
											}
										)
										vscode.window.showInformationMessage('树已生成，请配置外设状态');

									})
								})

							} else {
								vscode.window.showInformationMessage('没有找到描述文件，请检查配置');
							}
						}
					)
					// findFolderInPath(getWsPath() + '/' + confValues.libSrcPath)
				}
			});
		} catch (error) {
			vscode.window.showInformationMessage('json树配置文件中有格式错误，以至于无法解析，请检查！');
		}

		// console.log(text.indexOf(str))
		// if (text.indexOf(str) < 0) {
		// 	console.log(str + text)
		// 	wsedit.get(jsonuri)
		// 	wsedit.insert(jsonuri, new vscode.Position(0, 0), str)

		// 	vscode.workspace.applyEdit(wsedit).then(() => {
		// 		vscode.window.showTextDocument(jsonuri);
		// 		vscode.window.showInformationMessage('请按照模板编辑，并且移除模板内容');
		// 	})
		// }

	});

}
//生成配置树
function genTree() {
	var oldTree = {}
	checkVscodeFolder()?.then(
		_ => {
			vscode.workspace.fs.readDirectory(vscode.Uri.file(getWsPath() + "/.vscode")).then(
				(someArray) => {
					var hasTree = false
					for (var i = 0; i < someArray.length; i++) {
						var curArray = someArray[i]
						// console.log(someArray[i])
						if (curArray[1] == 1 && curArray[0] == "libHelperTree.json") {
							hasTree = true
							console.log("found tree json")
							break;
						}
					}
					if (!hasTree) {
						const wsedit = new vscode.WorkspaceEdit();
						const jsonuri = vscode.Uri.file(getWsPath() + "/.vscode/" + "libHelperTree.json");
						wsedit.createFile(jsonuri);
						// wsedit.get
						// wsedit.replace(jsonuri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(2, 0)), '{\r\n"mcu":"unset"\r\n}')

						vscode.workspace.applyEdit(wsedit).then(() => {
							// vscode.window.showTextDocument(jsonuri);
							// vscode.window.showInformationMessage('请先进行路径配置');
							constructTree()
						})
					} else {
						constructTree()
					}
				})
		})
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "libhelper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('libhelper.editConf', () => {
		// The code you place here will be executed every time your command is executed
		if (vscode.workspace.workspaceFolders) {
			const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
			console.log("项目目录:", wsPath)
			editSettingFile(wsPath)
		}
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from LibHelper!');
	});
	let disposable2 = vscode.commands.registerCommand('libhelper.genJsonTree', () => {
		// The code you place here will be executed every time your command is executed
		if (vscode.workspace.workspaceFolders) {
			genTree()
		}
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from LibHelper!');
	});
	let disposable3 = vscode.commands.registerCommand('libhelper.genConfHead', () => {
		// The code you place here will be executed every time your command is executed
		if (vscode.workspace.workspaceFolders) {
			genHeadFile()
			console.log("genConfHead")
		}
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from LibHelper!');
	});
	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable3);
}

// this method is called when your extension is deactivated
export function deactivate() { }
