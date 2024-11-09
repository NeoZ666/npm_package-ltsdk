import { run } from '../src/zoomprocessor';
import * as fs from 'fs';
import * as path from 'path';

test('fetch and process Zoom data', async () => {
  const accountId = "your_account_id";
  const clientId = "your_client_id";
  const clientSecret = "your_client_secret";
  const emailMappingsPath = path.join(__dirname, 'mocks', 'mails.json');
  const emailMappings = fs.readFileSync(emailMappingsPath, 'utf-8');
  const meetingId = 'your_meeting_id';

  const processedData = await run(accountId, clientId, clientSecret, emailMappings, meetingId);
  expect(processedData).toMatchSnapshot();
});