# Delete Prisma Postgres Database Action

A GitHub Action to delete Prisma Postgres databases in your CI/CD workflows.

## Usage

### Basic Usage

```yaml
- name: Delete Database
  uses: prisma/delete-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}
```

### With Custom Database Name

```yaml
- name: Delete Database
  uses: prisma/delete-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}
    database_name: "my-test-db"
```

### Complete Example for Pull Request Cleanup

```yaml
name: PR Database Cleanup
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Delete Database
        id: delete
        uses: prisma/delete-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}

      - name: Report Results
        run: |
          if [ "${{ steps.delete.outputs.deleted }}" == "true" ]; then
            echo "✅ Database ${{ steps.delete.outputs.database_name }} was deleted"
          else
            echo "ℹ️ No database found to delete"
          fi
```

### Combined with Provision Action

```yaml
name: Database Lifecycle Management
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

jobs:
  provision:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Provision Database
        uses: prisma/create-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}
      # Your tests here...

  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Cleanup Database
        uses: prisma/delete-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}
```

## Inputs

| Input           | Description                                             | Required | Default       |
| --------------- | ------------------------------------------------------- | -------- | ------------- |
| `service_token` | Prisma Postgres service token                           | ✅       |               |
| `project_id`    | Prisma project ID                                       | ✅       |               |
| `database_name` | Database name to delete (auto-detected if not provided) | ❌       | Auto-detected |

## Outputs

| Output          | Description                                          |
| --------------- | ---------------------------------------------------- |
| `deleted`       | Whether the database was deleted (`true` or `false`) |
| `database_name` | The name of the database that was processed          |

## Setup

### 1. Get Prisma Postgres Credentials

1. Sign up for [Prisma Postgres](https://www.prisma.io/postgres)
2. Generate a service token

### 2. Create a Dedicated Project for CI

To avoid conflicts with your development databases, create a dedicated project specifically for CI workflows. Use the following curl command to create a new Prisma Postgres project:

```bash
curl -X POST https://api.prisma.io/v1/projects \
  -H "Authorization: Bearer $PRISMA_POSTGRES_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"region\": \"us-east-1\", \"name\": \"$PROJECT_NAME\"}"
```

Note the project ID from the response.

### 3. Add Repository Secrets

Go to your repository settings → Secrets and variables → Actions, and add:

- `PRISMA_POSTGRES_SERVICE_TOKEN`: Your Prisma Postgres service token
- `PRISMA_PROJECT_ID`: Your Prisma project ID

### 4. Use in Your Workflow

Add the action to your workflow as shown in the examples above.

## Database Naming

**Auto-detected names:**

- PR context: `pr_{pr_number}_{branch_name}`
- Other contexts: `test_{run_number}`

## Behavior

### When Database Exists

- Finds the database by name
- Deletes the database
- Returns `deleted: true`
- Logs success message

### When Database Doesn't Exist

- Searches for database by name
- Finds no matching database
- Returns `deleted: false`
- Logs informational message
- Does not fail the workflow

## Use Cases

### 1. Pull Request Cleanup

Automatically clean up databases when PRs are closed:

```yaml
on:
  pull_request:
    types: [closed]
```

### 2. Branch Cleanup

Clean up databases when feature branches are deleted:

```yaml
on:
  delete:
    branches: ["feature/*"]
```

### 3. Scheduled Cleanup

Regular cleanup of old test databases:

```yaml
on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
```

### 4. Manual Cleanup

On-demand database cleanup:

```yaml
on:
  workflow_dispatch:
    inputs:
      database_name:
        description: "Database name to delete"
        required: true
```

## Related Actions

- [Create Prisma Postgres Database Action](https://github.com/prisma/create-prisma-postgres-database-action) - Create Prisma Postgres database

## Support

For issues and questions:

- [GitHub Issues](https://github.com/prisma/delete-prisma-postgres-database-action/issues)
- [Prisma Postgres Documentation](https://www.prisma.io/docs/postgres)

## License

Apache License - see [LICENSE](LICENSE) file for details.
