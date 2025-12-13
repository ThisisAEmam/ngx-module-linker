const fs = require('fs');
const path = require('path');
const https = require('https');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function httpsRequestJson(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          const err = new Error(`HTTP ${status}: ${data}`);
          err.statusCode = status;
          err.responseBody = data;
          return reject(err);
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function marketplaceHasVersion(publisher, extensionName, version) {
  const body = JSON.stringify({
    filters: [
      {
        criteria: [
          { filterType: 7, value: `${publisher}.${extensionName}` }
        ],
        pageNumber: 1,
        pageSize: 1
      }
    ],
    flags: 0x1 | 0x2 | 0x80
  });

  const json = await httpsRequestJson(
    {
      method: 'POST',
      hostname: 'marketplace.visualstudio.com',
      path: '/_apis/public/gallery/extensionquery?api-version=3.0-preview.1',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;api-version=3.0-preview.1',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    body
  );

  const ext = json?.results?.[0]?.extensions?.[0];
  const versions = ext?.versions;
  if (!Array.isArray(versions)) {
    return false;
  }
  return versions.some(v => v?.version === version);
}

async function openVsxHasVersion(publisher, extensionName, version) {
  let json;
  try {
    json = await httpsRequestJson(
      {
        method: 'GET',
        hostname: 'open-vsx.org',
        path: `/api/${encodeURIComponent(publisher)}/${encodeURIComponent(extensionName)}`,
        headers: {
          'Accept': 'application/json'
        }
      },
      undefined
    );
  } catch (e) {
    if (e && e.statusCode === 404) {
      return false;
    }
    throw e;
  }

  if (json?.version === version) {
    return true;
  }

  const allVersions = json?.allVersions;
  if (allVersions && typeof allVersions === 'object') {
    return Object.prototype.hasOwnProperty.call(allVersions, version);
  }

  return false;
}

async function main() {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = readJson(packageJsonPath);

  const publisher = pkg.publisher;
  const openVsxPublisher =
    process.env.OPEN_VSX_PUBLISHER ||
    pkg.openVsxPublisher ||
    (pkg.openVsx && pkg.openVsx.publisher) ||
    publisher;
  const extensionName = pkg.name;
  const version = pkg.version;

  if (!publisher || !extensionName || !version) {
    console.error('check-published: package.json must contain publisher, name, and version');
    process.exit(1);
  }

  let vsceExists = false;
  let ovsxExists = false;
  const errors = [];

  try {
    vsceExists = await marketplaceHasVersion(publisher, extensionName, version);
  } catch (e) {
    errors.push(`VS Code Marketplace check failed: ${e && e.message ? e.message : String(e)}`);
  }

  try {
    ovsxExists = await openVsxHasVersion(openVsxPublisher, extensionName, version);
  } catch (e) {
    errors.push(`Open VSX check failed: ${e && e.message ? e.message : String(e)}`);
  }

  if (errors.length > 0) {
    console.error('check-published: Unable to verify published versions:');
    for (const msg of errors) {
      console.error(`- ${msg}`);
    }
    console.error('check-published: Refusing to publish because the checks were not reliable.');
    process.exit(1);
  }

  if (vsceExists || ovsxExists) {
    console.error(`check-published: Version ${version} already exists:`);
    console.error(`- VS Code Marketplace: ${vsceExists ? 'YES' : 'NO'}`);
    console.error(`- Open VSX: ${ovsxExists ? 'YES' : 'NO'}`);
    console.error('check-published: You cannot overwrite an existing published version. Bump the version (e.g. npm run publish:patch).');
    process.exit(1);
  }

  console.log(`check-published: OK - version ${version} not found on VS Code Marketplace or Open VSX.`);
}

main().catch(err => {
  console.error(`check-published: Unexpected error: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
