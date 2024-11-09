# ltsdk-1

This package provides functions to interact with the Zoom API, fetch participant and poll data, process this data, and return the processed results.

## Installation

To install the package, use the following command:

```sh
npm install ltsdk-1
```

## Usage
Here is an example of how to use the run function from the ltsdk-1 package:

```typescript
import { run } from 'ltsdk-1';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  const accountId = "YOUR_ACCOUNT_ID";
  const clientId = "YOUR_CLIENT_ID";
  const clientSecret = "YOUR_CLIENT_SECRET";
  const emailMappingsPath = path.join(__dirname, 'mails.json');
  const emailMappings = fs.readFileSync(emailMappingsPath, 'utf-8');
  const meetingId = 'YOUR_MEETING_ID';

  try {
    const processedData = await run(accountId, clientId, clientSecret, emailMappings, meetingId);
    console.log(processedData);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

Run the script: 

```bash
tsc .\index.ts
node .\index.js
```

## Parameters
accountId (string): The Zoom account ID.
clientId (string): The Zoom client ID.
clientSecret (string): The Zoom client secret.
emailMappings (string): A JSON string containing email mappings.
meetingId (string): The ID of the Zoom meeting.

## Returns
A promise that resolves to the processed data.

## License
