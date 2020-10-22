const Discord = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const privatekey = require('./privatekey.json');
const ini = require('./ini.json');

// configure a JWT auth client
const jwtClient = new google.auth.JWT(
	privatekey.client_email,
	null,
	privatekey.private_key,
	['https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/calendar']);

// define sheet specifics
const spreadsheetId = ini.SPREADSHEET_ID;
const sheets = google.sheets('v4');

// create a new Discord client
const client = new Discord.Client();

// when the client is ready, run this
client.once('ready', () => {
	console.log('Ready!');

	// authenticate google request
	jwtClient.authorize(function(err, tokens) {
		if (err) {
			console.log(err);
			return;
		}
		else {
			console.log('Successfully connected to GDrive!');
		}
	});
});

// log the client on Discord
client.login(ini.DISCORD_TOKEN);

// on any message sent to the channel where the bot is running, run this
client.on('message', async message => {
	const input = message.content.split(' ');
	let dice = 0;
	let countZeroesAsOneSuccess = false;

	if (input[0] === '!roll' || input[0] === 'roll' || input[0] === 'r') {
		let result = '';
		const userNick = message.member.displayName;

		// parse the input
		for (let i = 1; i < (input.length); i++) {

			// add any number argument found to the number of dice
			if (!isNaN(input[i])) {
				dice += +input[i];
			}

			// switch for counting zeroes as one success instead of two
			else if (input[i] === 'z') {
				countZeroesAsOneSuccess = true;
			}

			// check the proper player's character sheet on gdrive
			else {
				let playerName = '';
				const rawdata = fs.readFileSync('players.json');
				const players = JSON.parse(rawdata);
				for (const key in players) {
					if (players[key].id == message.author.id) {
						playerName = key;
						break;
					}
				}
				const sheetName = playerName + ini.DATA_RANGE;

				// get stat value for a given stat
				let statValue = await getStatValue(input[i], sheetName);
				if (statValue == 0) { statValue = -2; }
				dice += +statValue;
			}
		}

		if (dice < 1) {
			message.channel.send('`' + userNick + ': 0 or less dice - Automatic failure`');
		}
		else {
			// roll the dice
			const [successes, isBotch, checkResult] = rollDice(dice, countZeroesAsOneSuccess);

			// create proper result prompt
			if (isBotch && successes == 0) { result = 'Botch!'; }
			else if (successes == 0) { result = 'Fail!'; }
			else if (successes == 1) { result = '1 success!'; }
			else { result = successes + ' successes!'; }

			message.channel.send('`' + userNick + ': ' + result + ' [' + checkResult.join(', ') + ']`');
		}
	}
	// user registration (create new sheet and pair it with the user)
	if (input[0] === '!reg') {

		let rawdata = fs.readFileSync('players.json');
		const players = JSON.parse(rawdata);

		players[input[1]] = { 'id' : message.author.id, 'channelid' : message.channel.id };
		rawdata = JSON.stringify(players, null, 2);
		fs.writeFileSync('players.json', rawdata);

		message.channel.send('Player ' + input[1] + ' successfully created. Go to ' +
		'https://docs.google.com/spreadsheets/d/' + ini.SPREADSHEET_ID +
		' and fill the character sheet in your tab.');
		addNewSheet(input[1]);
	}
});

// getting any value from the gdrive sheet based on key
function getStatValue(stat, sheetName) {
	return new Promise ((resolve, reject) => {
		sheets.spreadsheets.values.get({
			auth: jwtClient,
			spreadsheetId: spreadsheetId,
			range: sheetName,
		}, function(err, response) {
			if (err) {
				console.log('The API returned an error: ' + err);
			}
			else {
				for (let j = 0; j < (response.data.values.length - 1); j++) {
					if (response.data.values[j][0] == stat) {
						const statValue = response.data.values[j][1];
						resolve(statValue);
					}
				}
			}
		});
	});
}

// add new sheet by duplicating the base template
function addNewSheet(name) {
	sheets.spreadsheets.batchUpdate({
		auth : jwtClient,
		spreadsheetId : spreadsheetId,
		requestBody : {
			requests : [{
				duplicateSheet : {
					sourceSheetId : ini.TEMPLATE_SHEET_ID,
					insertSheetIndex : 1,
					newSheetName : name,
				},
			}],
		},
	});
}

// roll the required amount of dice and return number of successes/botch state and list of individual roll results
function rollDice(numberOfDice, countZeroesAsOneSuccess) {
	const checkResult = [];
	let successes = 0;
	let isBotch = false;

	for (let i = 0; i < numberOfDice; i++) {
		const rollResult = Math.floor(Math.random() * 10) + 1;
		checkResult.push(rollResult);
		if (rollResult > 6 && rollResult < 10) {
			successes++;
		}
		else if (rollResult == 10 && !countZeroesAsOneSuccess) {
			successes += 2;
		}
		else if (rollResult == 10 && countZeroesAsOneSuccess) {
			successes++;
		}
		else if (rollResult == 1 && !isBotch) {
			isBotch = true;
		}
	}
	return [successes, isBotch, checkResult];
}