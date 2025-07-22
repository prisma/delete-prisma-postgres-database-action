# Delete Prisma Postgres Database Action

A GitHub Action to delete Prisma Postgres databases in your CI/CD workflows.

## Usage

### Basic Usage

```yaml
- name: Delete Database
  id: delete
  uses: prisma/delete-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}

- name: Check Result
  run: |
    echo "Database deleted: ${{ steps.delete.outputs.deleted }}"
    echo "Database name: ${{ steps.delete.outputs.database_name }}"
```

### With Custom Database Name

```yaml
- name: Delete Database
  id: delete
  uses: prisma/delete-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}
    database_name: "my-test-db"

- name: Check Result
  run: echo "Database deleted: ${{ steps.delete.outputs.deleted }}"
```

### With Database ID

```yaml
- name: Delete Database
  id: delete
  uses: prisma/delete-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}
    database_id: "db_123456789"

- name: Check Result
  run: echo "Database deleted: ${{ steps.delete.outputs.deleted }}"
```

### Simple Pull Request Cleanup

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

### Complete Example to Provision Prisma Postgres when PR is opened and delete when PR is closed

```yaml
name: Prisma Postgres Database Lifecycle
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

jobs:
  create-database:
    name: Create Database
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Create Database
        id: create
        uses: prisma/create-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}
          database_name: "pr-${{ github.event.pull_request.number }}"

      - name: Verify database creation
        run: |
          echo "✅ Database created successfully!"
          echo "Database ID: ${{ steps.create.outputs.database_id }}"
          echo "Database Name: ${{ steps.create.outputs.database_name }}"
          echo "Database URL is available in steps.create.outputs.database_url"

  cleanup-database:
    name: Cleanup Database  
    if: always() && github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Delete Database
        id: delete
        uses: prisma/delete-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}
          database_name: "pr-${{ github.event.pull_request.number }}"

      - name: Verify database deletion
        run: |
          if [ "${{ steps.delete.outputs.deleted }}" == "true" ]; then
            echo "✅ Database ${{ steps.delete.outputs.database_name }} was deleted"
          else
            echo "ℹ️ No database found to delete"
          fi
```

## Inputs

| Input           | Description                                             | Required | Default        |
| --------------- | ------------------------------------------------------- | -------- | -------------- |
| `service_token` | Prisma Postgres service token                           | ✅       |                |
| `project_id`    | Prisma project ID                                       | ✅       |                |
| `database_name` | Database name to delete                                 | ❌       | Auto-generated |
| `database_id`   | Database ID to delete (alternative to database_name)   | ❌       |                |

**Note:** You can specify either `database_name` or `database_id`. If both are provided, `database_id` takes precedence. If neither is provided, the database name will be auto-generated based on the GitHub context.

## Outputs

| Output          | Description                                          |
| --------------- | ---------------------------------------------------- |
| `deleted`       | Whether the database was deleted (`true` or `false`) |
| `database_name` | The name of the database that was processed          |

## Deletion Methods

This action supports two ways to specify which database to delete:

### 1. By Database Name
- Searches for databases by name within the project
- Supports auto-detection based on GitHub context
- Names are sanitized (special characters replaced with underscores)

### 2. By Database ID
- Directly deletes a database using its unique ID
- Faster deletion as it skips the search step
- Useful when you have the exact database ID from previous actions

## Database Naming

**Auto-generated names:**

- PR context: `pr_{pr_number}_{branch_name}`
- Other contexts: `test_{run_number}`

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

On-demand database cleanup using workflow inputs:

```yaml
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Delete Database
        id: delete
        uses: prisma/delete-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}
          database_name: ${{ github.event.inputs.database_name }}
          database_id: ${{ github.event.inputs.database_id }}
          
      - name: Report cleanup result
        run: |
          if [ "${{ steps.delete.outputs.deleted }}" == "true" ]; then
            echo "✅ Database ${{ steps.delete.outputs.database_name }} was deleted"
          else
            echo "ℹ️ No database found to delete"
          fi
```

## Related Actions

- [Create Prisma Postgres Database Action](https://github.com/prisma/create-prisma-postgres-database-action) - Create Prisma Postgres database

## Support

For issues and questions:

- [GitHub Issues](https://github.com/prisma/delete-prisma-postgres-database-action/issues)
- [Prisma Postgres Documentation](https://www.prisma.io/docs/postgres)

## License

Apache License - see [LICENSE](LICENSE) file for details.
