/*

<javascriptresource>
<name>Convert Actions File...</name>
<about>"Convert Actions File" v2.1

Convert an actions file (.atn) into a folder of directly executable scripts (.js) which can be further edited.

Utility script using the "JSON Action Manager" scripting library.
© 2011-2015 Michel MARIANI.
</about>
<menu>automate</menu>
<category>JSON Action Manager Actions Files Utility</category>
</javascriptresource>

*/

//------------------------------------------------------------------------------
// File: Convert Actions File.js
// Version: 2.1
// Release Date: 2015-11-22
// Copyright: © 2011-2015 Michel MARIANI <http://www.tonton-pixel.com/blog/>
// Licence: GPL <http://www.gnu.org/licenses/gpl.html>
//------------------------------------------------------------------------------
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//------------------------------------------------------------------------------
// Version History:
//  2.1:
//  - Used new version 4.4.4 of jamEngine scripting library module.
//  2.0:
//  - Used new version 4.4.1 of scripting library modules.
//  1.9:
//  - Used new version 4.4 of scripting library modules.
//  1.8:
//  - Replaced decodeURI () with File.decode () for the sake of consistency.
//  - Used new version 4.1 of jamActions scripting library module.
//  - Added test for successful opening of output files.
//  1.7:
//  - Used new version 4.0 of scripting library modules.
//  1.6:
//  - Used new version of jamEngine module.
//  1.5:
//  - Replaced \r with \n in dialog text area.
//  1.4:
//  - Used new version of scripting library modules.
//  1.3:
//  - Used new version of scripting library modules.
//  1.2:
//  - Removed the choice of not using a UTF-8 BOM.
//  1.1:
//  - Added 'TEXT' Mac OS type to newly created JavaScript code files.
//  1.0:
//  - Initial release.
//------------------------------------------------------------------------------

//@include "./jamActions-min.jsxinc"
//@include "./jamEngine-min.jsxinc"
//@include "./jamJSON-min.jsxinc"
//@include "./jamUtils-min.jsxinc"

//------------------------------------------------------------------------------

var signature = "json-action-manager-convert-actions-file-options";

var defaultFolderName = "~/Desktop/";

var defaultOptions =
{
	actionsFileName: null,
	allCommands: false,
	meaningfulIds: false,
	parseFriendly: false,
	expandTabs: false,
	destinationName: defaultFolderName,
	openFolder: false
};

var actionsFile = null;
var actionSet = null;
var destination = null;

//------------------------------------------------------------------------------

var playFunctionCall = 'jamEngine.jsonPlay';
var meaningfulIdsOption = 'jamEngine.meaningfulIds';
var parseFriendlyOption = 'jamEngine.parseFriendly';

//------------------------------------------------------------------------------

function ISODateString (d, fsSafe)
{
	const dateSeparator = '-';
	const timeDesignator = (fsSafe) ? '-' : 'T';
	const timeSeparator = (fsSafe) ? '' : ':';
	function pad (n) { return (n < 10) ? '0' + n : n; }
	var minutesOff = -d.getTimezoneOffset ();
	var isMinus = (minutesOff < 0);
	if (isMinus)
	{
		minutesOff = -minutesOff;
	}
	var dateString =
		d.getFullYear () + dateSeparator + pad (d.getMonth () + 1) + dateSeparator + pad (d.getDate ()) +
		timeDesignator +
		pad (d.getHours ()) + timeSeparator + pad (d.getMinutes ()) + timeSeparator + pad (d.getSeconds ()) +
		((fsSafe) ? '' : ((isMinus) ? '-' : '+') + pad (minutesOff / 60) + timeSeparator + pad (minutesOff % 60));
	return dateString;
}

//------------------------------------------------------------------------------

function embedIncludeFile (f, fileName)
{
	var saveCurrent = Folder.current;
	Folder.current = (new File ($.fileName)).parent;
	var includeFile = new File (fileName);
	if (includeFile.open ("r"))
	{
		f.write (includeFile.read ());
		includeFile.close ();
	}
	Folder.current = saveCurrent;
}

//------------------------------------------------------------------------------

function displayDialog ()
{
	function updateDialog ()
	{
		if (actionSet === null)
		{
			dialog.fileName.text = "<None>";
			dialog.fileName.helpTip = "Click the Choose... button";
			dialog.fileName.enabled = false;
			dialog.actionSetName.text = "";
			dialog.actionNames.text = "";
			okButton.enabled = false;
		}
		else
		{
			dialog.fileName.enabled = true;
			dialog.fileName.text = File.decode (actionsFile.name);
			dialog.fileName.helpTip = actionsFile.fsName;
			dialog.actionSetName.text = actionSet.name;
			var actions = actionSet.actions;
			dialog.actionNames.text = "";
			for (var actionIndex = 0; actionIndex < actions.length; actionIndex++)
			{
				dialog.actionNames.text += (actionIndex > 0 ? "\n" : "") + actions[actionIndex].name;
			}
			okButton.enabled = true;
		}
	}
	var dialog = new Window ('dialog', "Convert Actions File");
	dialog.orientation = "column";
	var fileGroup = dialog.add ('group');
	fileGroup.alignment = "left";
	fileGroup.orientation = "row";
	fileGroup.alignChildren = [ "fill", "center" ];
	fileGroup.add ('statictext', undefined, "Actions File:");
	dialog.fileName = fileGroup.add ('edittext', undefined, "", { readonly: true });
	dialog.fileName.characters = 32;
	var chooseFileButton = fileGroup.add ('button', undefined, "Choose...");
	chooseFileButton.helpTip = "Choose an actions file";
	chooseFileButton.onClick = function ()
	{
		function actionsFileFilter (f)
		{
			return (f instanceof Folder) || jamActions.isActionsFile (f);
		}
		var select = (File.fs === "Macintosh") ? actionsFileFilter : "Actions Files:*.atn,All Files:*";
		var presetFile = (actionsFile !== null) ? actionsFile : new Folder (defaultFolderName);
		var inFile = presetFile.openDlg ("Choose an actions file:", select);
		if (inFile !== null)
		{
			var inFileData = jamActions.dataFromActionsFile (inFile);
			if (typeof inFileData === 'string')
			{
				alert (inFileData + "\n" + "Actions file: “" + File.decode (inFile.name) + "”");
			}
			else
			{
				actionsFile = inFile;
				actionSet = inFileData.actionSet;
				updateDialog ();
			}
		}
	};
	var actionSetGroup = dialog.add ('group');
	actionSetGroup.alignment = "fill";
	actionSetGroup.orientation = "row";
	actionSetGroup.add ('statictext', undefined, "Action Set:");
	dialog.actionSetName = actionSetGroup.add ('edittext', undefined, "", { readonly: true });
	dialog.actionSetName.alignment = [ "fill", "center" ];
	var actionGroup = dialog.add ('group');
	actionGroup.alignment = "fill";
	actionGroup.orientation = "row";
	actionGroup.alignChildren = [ "left", "center" ];
	actionGroup.add ('statictext', undefined, "Actions:");
	dialog.actionNames = actionGroup.add ('edittext', undefined, "", { readonly: true, multiline: true });
	dialog.actionNames.alignment = [ "fill", "center" ];
	dialog.actionNames.text = "\n\n\n\n\n\n\n\n";	// Placeholder (8 lines)
	var optionsGroup = dialog.add ('group');
	optionsGroup.orientation = "row";
	optionsGroup.alignment = [ "left", "center" ];
	dialog.allCommandsCheck = optionsGroup.add ('checkbox', undefined, 'All Commands');
	dialog.allCommandsCheck.helpTip = "Generate all commands, even when disabled (using a boolean test)";
	dialog.meaningfulIdsCheck = optionsGroup.add ('checkbox', undefined, 'Meaningful IDs');
	dialog.meaningfulIdsCheck.helpTip = "Generate as meaningful as possible IDs (instead of canonic IDs)";
	dialog.parseFriendlyCheck = optionsGroup.add ('checkbox', undefined, 'Parse-Friendly');
	dialog.parseFriendlyCheck.helpTip = "Generate parse-friendly JSON compact format (using ordered pairs made of arrays instead of objects)";
	dialog.expandTabsCheck = optionsGroup.add ('checkbox', undefined, 'Expand Tabs');
	dialog.expandTabsCheck.helpTip = "Use tab expansion (convert tabs to 4 spaces)";
	var destinationGroup = dialog.add ('group');
	destinationGroup.alignment = "left";
	destinationGroup.orientation = "row";
	destinationGroup.alignChildren = [ "fill", "center" ];
	destinationGroup.add ('statictext', undefined, "Destination:");
	dialog.destination = destinationGroup.add ('edittext', undefined, "", { readonly: true });
	dialog.destination.characters = 32;
	var chooseDestinationButton = destinationGroup.add ('button', undefined, "Choose...");
	chooseDestinationButton.helpTip = "Choose a destination folder";
	chooseDestinationButton.onClick = function ()
	{
		var presetFolder = destination.exists ? destination : ( destination.parent.exists ? destination.parent : new Folder (defaultFolderName));
		var inFolder = presetFolder.selectDlg ("Choose a destination folder:");
		if (inFolder !== null)
		{
			destination = inFolder;
			dialog.destination.text = File.decode (destination.name);
			dialog.destination.helpTip = destination.fsName;
		}
	};
	dialog.openFolderCheck = dialog.add ('checkbox', undefined, 'Open containing folder');
	dialog.openFolderCheck.helpTip = "Automatically open the resulting action set folder containing the converted actions";
	dialog.openFolderCheck.alignment = "right";
	var buttonsGroup = dialog.add ('group');
	buttonsGroup.alignment = [ "right", "bottom" ];
	buttonsGroup.orientation = "row";
	buttonsGroup.alignChildren = "fill";
	var cancelButton = buttonsGroup.add ('button', undefined, 'Cancel', { name: "cancel" });
	cancelButton.onClick = function ()
	{
		dialog.close (false);
	};
	var okButton = buttonsGroup.add ('button', undefined, 'Convert', { name: "ok" });
	okButton.onClick = function ()
	{
		if (!destination.exists)
		{
			alert ("Please choose a valid destination folder.");
		}
		else
		{
			customOptions.actionsFileName = (actionsFile !== null) ? actionsFile.fsName : null;
			customOptions.allCommands = dialog.allCommandsCheck.value;
			customOptions.meaningfulIds = dialog.meaningfulIdsCheck.value;
			customOptions.parseFriendly = dialog.parseFriendlyCheck.value;
			customOptions.expandTabs = dialog.expandTabsCheck.value;
			customOptions.destinationName = destination.fsName;
			customOptions.openFolder = dialog.openFolderCheck.value;
			dialog.close (true);
		}
	};
	dialog.onShow = function ()
	{
		if (customOptions.actionsFileName)
		{
			var inFile = new File (customOptions.actionsFileName);
			if (inFile.exists && jamActions.isActionsFile (inFile))
			{
				var inFileData = jamActions.dataFromActionsFile (inFile);
				if (typeof inFileData === 'string')
				{
					alert (inFileData + "\n" + "Actions file: “" + File.decode (inFile.name) + "”");
				}
				else
				{
					actionsFile = inFile;
					actionSet = inFileData.actionSet;
				}
			}
		}
		updateDialog ();
		dialog.allCommandsCheck.value = customOptions.allCommands;
		dialog.meaningfulIdsCheck.value = customOptions.meaningfulIds;
		dialog.parseFriendlyCheck.value = customOptions.parseFriendly;
		dialog.expandTabsCheck.value = customOptions.expandTabs;
		destination = Folder (customOptions.destinationName);	// *Not* new Folder, to check if it is an existing File
		if (destination.exists && (destination instanceof File))
		{
			alert ("Invalid destination!\nReverting to default folder...");
			destination = new Folder (defaultFolderName);
		}
		dialog.destination.text = File.decode (destination.name);
		dialog.destination.helpTip = destination.fsName;
		dialog.openFolderCheck.value = customOptions.openFolder;
	};
	return dialog.show ();
}

//------------------------------------------------------------------------------

// Assume Folder.current is already set to a proper location
function getUniqueNameFile (name, versionSeparator, extensionSuffix)
{
	var fileName = name.replace (/^[\.\s]+|[\s]+$/g, '');	// Strip leading dot(s), and leading and trailing space(s)
	fileName = fileName.replace (/["\*\/:<>\?\\\|¨]/g, '-');	// Replace file-system-unsafe characters with a hyphen-minus
	var versionIndex = 0;
	do
	{
		if (extensionSuffix)
		{
			var file = new File (fileName + ((versionIndex > 0) ? versionSeparator + versionIndex : "") + extensionSuffix);
		}
		else
		{
			var file = new Folder (fileName + ((versionIndex > 0) ? versionSeparator + versionIndex : ""));
		}
		versionIndex++;
	}
	while (file.exists);
	return file;
}

//------------------------------------------------------------------------------

var appVersion = parseInt (app.version);
if (appVersion >= 10)	// CS3
{
	var customOptions = jamUtils.getCustomOptions (signature, defaultOptions);
	if (displayDialog ())
	{
		jamUtils.putCustomOptions (signature, customOptions, true);
		var tab = (customOptions.expandTabs) ? '    ' : '\t';
		var indentLevel = 0;
		function tabs ()
		{
			var tabsString = "";
			for (var index = 0; index < indentLevel; index++)
			{
				tabsString += tab;
			}
			return tabsString;
		}
		Folder.current = destination;
		var actionSetFolder = getUniqueNameFile (actionSet.name, ' ');
		if (actionSetFolder.create ())
		{
			Folder.current = actionSetFolder;
			for (var actionIndex = 0; actionIndex < actionSet.actions.length; actionIndex++)
			{
				var action = actionSet.actions[actionIndex];
				var f = getUniqueNameFile (action.name, '-', '.js');
				if (f.open ('w', 'TEXT'))
				{
					f.encoding = 'UTF-8';
					f.lineFeed = 'unix';
					f.write ('\uFEFF');	// Byte Order Mark
					var appName = app.path.fsName;
					f.writeln ('// Application: ' + appName.substring (appName.lastIndexOf ('/') + 1) + ' (' + app.version + ')');
					f.writeln ('// Date: ' + ISODateString (new Date ()));
					f.writeln ('// Actions file: ' + actionsFile.fsName);
					f.writeln ('// Action set: ' + actionSet.name);
					f.writeln ();
					embedIncludeFile (f, "jamEngine-min.jsxinc");
					f.writeln ();
					jamEngine.meaningfulIds = customOptions.meaningfulIds;
					jamEngine.parseFriendly = customOptions.parseFriendly;
					f.writeln (meaningfulIdsOption + ' = ' + (jamEngine.meaningfulIds ? 'true' : 'false') + ';');
					f.writeln (parseFriendlyOption + ' = ' + (jamEngine.parseFriendly ? 'true' : 'false') + ';');
					f.writeln ();
					f.writeln ('// Action “' + action.name + '”');
					f.writeln ('try');
					f.writeln ('{');
					indentLevel++;
					function logCommand (command)
					{
						if (customOptions.allCommands || command.enabled)
						{
							var localPlayCommand = jamActions.isLocalPlayCommand (command, actionSet.name);
							if (localPlayCommand !== null)
							{
								if (customOptions.allCommands)
								{
									f.write (tabs () + '// ');
									if (typeof localPlayCommand[1] !== 'undefined')
									{
										f.write ('Command ' + localPlayCommand[1] + ' of ');
									}
									f.write ('Action “' + localPlayCommand[0] + '”');
									if (typeof localPlayCommand[2] !== 'undefined')
									{
										f.write ((localPlayCommand[2] ? ' with ' : ' without ') + 'Continue');
									}
									f.writeln ();
									f.writeln (tabs () + 'if (' + (command.enabled ? 'true' : 'false') + ')');
									f.writeln (tabs () + '{');
									indentLevel++;
								}
								jamActions.traverseAction (actionSet, localPlayCommand[0], localPlayCommand[1], localPlayCommand[2]);
								if (customOptions.allCommands)
								{
									indentLevel--;
									f.writeln (tabs () + '}');
								}
							}
							else
							{
								f.writeln (tabs () + ('// ' + command.dictionaryName));
								if (customOptions.allCommands)
								{
									f.writeln (tabs () + 'if (' + (command.enabled ? 'true' : 'false') + ')');
									f.writeln (tabs () + '{');
									indentLevel++;
								}
								var playObj = jamEngine.eventIdAndActionDescriptorToJson (command.eventId, command.actionDescriptor);
								f.writeln (tabs () + playFunctionCall);
								f.writeln (tabs () + '(');
								indentLevel++;
								f.writeln (jamJSON.stringify (playObj["<event>"], tab, tabs ()) + ',');
								f.writeln (jamJSON.stringify (playObj["<descriptor>"], tab, tabs ()) + ',');
								f.writeln (tabs () + jamActions.determineDialogMode (command));
								indentLevel--;
								f.writeln (tabs () + ');');
								if (customOptions.allCommands)
								{
									indentLevel--;
									f.writeln (tabs () + '}');
								}
							}
						}
					}
					jamActions.setCommandHandler (logCommand);
					jamActions.traverseAction (actionSet, actionIndex);
					indentLevel--;
					f.writeln ('}');
					f.writeln ('catch (e)');
					f.writeln ('{');
					indentLevel++;
					f.writeln (tabs () + 'if (e.number !== 8007)  // Not a user cancel error');
					f.writeln (tabs () + '{');
					indentLevel++;
					f.writeln (tabs () + 'try');
					f.writeln (tabs () + '{');
					indentLevel++;
					var desc = new ActionDescriptor ();
					desc.putString (app.stringIDToTypeID ("message"), "<<< PLACEHOLDER >>>");
					var playObj = jamEngine.eventIdAndActionDescriptorToJson (app.stringIDToTypeID ("stop"), desc);
					f.writeln (tabs () + playFunctionCall)
					f.writeln (tabs () + '(');
					indentLevel++;
					f.writeln (jamJSON.stringify (playObj["<event>"], tab, tabs ()) + ',');
					var jsonDesc = jamJSON.stringify (playObj["<descriptor>"], tab, tabs ());
					f.writeln (jsonDesc.replace (/"<<< PLACEHOLDER >>>"/, 'e.message.replace (/^.*\\n- /, "")') + ',');
					f.writeln (tabs () + 'DialogModes.ALL');
					indentLevel--;
					f.writeln (tabs () + ');');
					indentLevel--;
					f.writeln (tabs () + '}');
					f.writeln (tabs () + 'catch (e)');
					f.writeln (tabs () + '{');
					f.writeln (tabs () + '}');
					indentLevel--;
					f.writeln (tabs () + '}');
					indentLevel--;
					f.writeln ('}');
					f.close ();
				}
			}
			if (customOptions.openFolder)
			{
				actionSetFolder.execute ();
			}
		}
		else
		{
			alert ("Cannot create action set folder in destination:\n" + destination.fsName);
		}
	}
}
else
{
	alert ("Sorry, this script requires Photoshop CS3 or later.");
}

//------------------------------------------------------------------------------

