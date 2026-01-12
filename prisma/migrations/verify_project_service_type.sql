-- Verify that projectServiceType column exists and all projects have a value
SELECT 
  COUNT(*) as total_projects,
  COUNT(projectServiceType) as projects_with_type,
  COUNT(CASE WHEN projectServiceType = 'EPC_PROJECT' THEN 1 END) as epc_projects
FROM projects;
