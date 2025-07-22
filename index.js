const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const serviceToken = core.getInput('service_token');
    const projectId = core.getInput('project_id');
    const databaseName = core.getInput('database_name');
    const databaseId = core.getInput('database_id');

    if (!serviceToken || !projectId) {
      throw new Error('service_token and project_id are required');
    }

    let targetDatabase = null;
    let deletionMethod = '';

    if (databaseId) {
      if (databaseName) {
        core.info(
          'Both database_id and database_name provided. Using database_id for deletion.'
        );
      }
      // Delete by database ID
      core.info(`Deleting database by ID: ${databaseId}`);
      deletionMethod = 'id';
      targetDatabase = { id: databaseId, name: `database-${databaseId}` };
    } else {
      // Delete by database name
      const context = github.context;
      let sanitizedDbName;

      if (databaseName) {
        sanitizedDbName = sanitizeDatabaseName(databaseName);
      } else {
        if (context.payload.pull_request) {
          const prNumber = context.payload.pull_request.number;
          const branchName = context.payload.pull_request.head.ref;
          sanitizedDbName = sanitizeDatabaseName(
            `pr-${prNumber}-${branchName}`
          );
        } else {
          sanitizedDbName = sanitizeDatabaseName(`test-${context.runNumber}`);
        }
      }

      core.info(`Looking for database to cleanup: ${sanitizedDbName}`);
      deletionMethod = 'name';
      targetDatabase = await checkDatabaseExists(
        serviceToken,
        projectId,
        sanitizedDbName
      );

      if (targetDatabase) {
        targetDatabase.name = sanitizedDbName;
      }
    }

    if (targetDatabase) {
      core.info(
        `Database ${targetDatabase.name} exists with ID: ${targetDatabase.id}. Deleting...`
      );
      await deleteDatabase(serviceToken, targetDatabase.id);

      core.setOutput('deleted', 'true');
      core.setOutput('database_name', targetDatabase.name);

      core.info('✅ Database deleted successfully!');
    } else {
      const identifier =
        deletionMethod === 'id'
          ? `ID: ${databaseId}`
          : `name: ${sanitizedDbName}`;
      core.info(`No database found with ${identifier}`);
      core.setOutput('deleted', 'false');
      core.setOutput(
        'database_name',
        deletionMethod === 'id' ? `database-${databaseId}` : sanitizedDbName
      );
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
        Authorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch databases: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.data?.find((db) => db.name === dbName);
}

async function deleteDatabase(serviceToken, databaseId) {
  const response = await fetch(
    `https://api.prisma.io/v1/databases/${databaseId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete database: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Delete API error: ${data.message || 'Unknown error'}`);
  }
}

run();
