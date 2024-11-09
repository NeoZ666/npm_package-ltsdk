import { run } from '../src/zoomprocessor';
import * as fs from 'fs';
import * as path from 'path';

test('fetch and process Zoom data', async () => {
  const accountId = "jhDLkKe-RJqw1vD47uwb_w";
  const clientId = "bRBgBSlHRTO8i7YPFcwBfw";
  const clientSecret = "ta9IM3h5y6rStE5UgVFKxD1DS9O5Z50A";
  const meetingId = '82339006452';

  const processedData = await run(accountId, clientId, clientSecret, meetingId);
  expect(processedData).toMatchSnapshot();
});