### Starting the bot locally

1. Install dependencies: `npm install`
2. Create `.env.local` in the root folder and fill the required env variables (see `.env.example`).
3. Start the app locally, run `node src\debug\index.ts` in the root folder.
4. That's it. Bot is automatically registered in the telegram and uses long-polling to communicate.


### Registering bot deployed on AWS Lambda

For deployment instructions see `README.md` in the `./infra` folder.

After deployment, you need to set the webhook, run the following command:

`npm run set-webhook -- -t $BOT_TOKEN -D '{ "url": $FULL_URL_TO_FUNCTION }'`
