# ExRoller-Discord-Bot
Discord bot for dice rolls in Exalted RPG

Missing dependencies:  
./players.json - just create an empty json file with this name in the root  
./privatekey.json - google service account private key  
./ini.json - other necessary data:    
  "SPREADSHEET_ID" : ID of the Google Spreadsheet where all character sheets will be stored  
  "DATA_RANGE" : Range of character stats data in each character sheet. Should be two adjacent columns, in stat | statValue form  
  "TEMPLATE_SHEET_ID" : Sheet ID of your template sheet, from which all character sheets will be created  
  "DISCORD_TOKEN" : Discord login token  
