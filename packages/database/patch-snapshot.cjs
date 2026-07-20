const fs = require('fs');
const path = './migrations/meta/0002_snapshot.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Delete creator_id, title, state, version, updated_at, deleted_at, previous_state, has_state_drift
const pCols = data.tables['public.projects'].columns;
delete pCols['creator_id'];
delete pCols['title'];
delete pCols['state'];
delete pCols['version'];
delete pCols['updated_at'];
delete pCols['deleted_at'];
delete pCols['previous_state'];
delete pCols['has_state_drift'];

// Delete the old foreign key for creator_id
delete data.tables['public.projects'].foreignKeys['projects_creator_id_creators_id_fk'];

// Add new columns: workspace_id, name, description, status, created_at
pCols['workspace_id'] = {
  name: 'workspace_id',
  type: 'uuid',
  primaryKey: false,
  notNull: true
};
pCols['name'] = {
  name: 'name',
  type: 'text',
  primaryKey: false,
  notNull: true
};
pCols['description'] = {
  name: 'description',
  type: 'text',
  primaryKey: false,
  notNull: false
};
pCols['status'] = {
  name: 'status',
  type: 'text',
  primaryKey: false,
  notNull: true,
  default: "'draft'"
};
// created_at already exists, but ensure it's there
pCols['created_at'] = {
  name: 'created_at',
  type: 'timestamp',
  primaryKey: false,
  notNull: true,
  default: 'now()'
};

data.tables['public.projects'].foreignKeys['projects_workspace_id_workspaces_id_fk'] = {
  name: 'projects_workspace_id_workspaces_id_fk',
  tableFrom: 'projects',
  tableTo: 'workspaces',
  columnsFrom: ['workspace_id'],
  columnsTo: ['id'],
  onDelete: 'cascade',
  onUpdate: 'no action'
};

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Snapshot patched successfully.');
