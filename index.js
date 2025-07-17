const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const serviceToken = core.getInput('service_token');
    const projectId = core.getInput('project_id');
    const databaseName = core.getInput('database_name');

    if (!serviceToken || !projectId) {
      throw new Error('service_token and project_id are required');
    }

    const context = github.context;
    let sanitizedDbName;

    if (databaseName) {
      sanitizedDbName = sanitizeDatabaseName(databaseName);
    } else {
      if (context.payload.pull_request) {
        const prNumber = context.payload.pull_request.number;
        const branchName = context.payload.pull_request.head.ref;
        sanitizedDbName = sanitizeDatabaseName(`pr-${prNumber}-${branchName}`);
      } else {
        sanitizedDbName = sanitizeDatabaseName(`test-${context.runNumber}`);
      }
    }

    core.info(`Looking for database to cleanup: ${sanitizedDbName}`);

    const existingDb = await checkDatabaseExists(serviceToken, projectId, sanitizedDbName);
    
    if (existingDb) {
      core.info(`Database ${sanitizedDbName} exists with ID: ${existingDb.id}. Deleting...`);
      await deleteDatabase(serviceToken, existingDb.id);
      
      core.setOutput('deleted', 'true');
      core.setOutput('database_name', sanitizedDbName);
      
      core.info('✅ Database deleted successfully!');
    } else {
      core.info(`No database found with name: ${sanitizedDbName}`);
      core.setOutput('deleted', 'false');
      core.setOutput('database_name', sanitizedDbName);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

function sanitizeDatabaseName(name) {
  return name
    .replace(/[\/\-]/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

async function checkDatabaseExists(serviceToken, projectId, dbName) {
  const response = await fetch(
    `https://api.prisma.io/v1/projects/${projectId}/databases`,
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch databases: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.find(db => db.name === dbName);
}

async function deleteDatabase(serviceToken, databaseId) {
  const response = await fetch(
    `https://api.prisma.io/v1/databases/${databaseId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete database: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Delete API error: ${data.message || 'Unknown error'}`);
  }
}

run();