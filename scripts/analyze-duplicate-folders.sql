-- Script to analyze duplicate folders without making any changes
-- Safe to run anytime for reporting purposes

-- Summary of duplicates
\echo '=== DUPLICATE FOLDERS ANALYSIS ==='
\echo ''
WITH duplicate_folders AS (
    SELECT 
        folder_name,
        project_id,
        COUNT(*) as count
    FROM document_folders
    GROUP BY folder_name, project_id
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as unique_folders_with_duplicates,
    SUM(count) as total_duplicate_folders,
    SUM(count - 1) as extra_copies_to_remove
FROM duplicate_folders;

-- Top duplicates by count
\echo ''
\echo '=== TOP 15 MOST DUPLICATED FOLDERS ==='
WITH duplicate_folders AS (
    SELECT 
        folder_name,
        project_id,
        COUNT(*) as duplicate_count,
        array_agg(id ORDER BY created_at) as folder_ids
    FROM document_folders
    GROUP BY folder_name, project_id
    HAVING COUNT(*) > 1
)
SELECT 
    df.folder_name,
    df.duplicate_count as copies,
    p.name as project_name,
    df.folder_ids[1] as keep_folder_id,
    array_length(df.folder_ids, 1) - 1 as folders_to_remove
FROM duplicate_folders df
JOIN projects p ON p.id = df.project_id
ORDER BY df.duplicate_count DESC
LIMIT 15;

-- Check for documents in duplicate folders
\echo ''
\echo '=== DOCUMENTS IN DUPLICATE FOLDERS ==='
WITH duplicate_folders AS (
    SELECT 
        id,
        folder_name,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY folder_name, project_id ORDER BY created_at) as rn
    FROM document_folders
),
duplicate_folder_ids AS (
    SELECT id, folder_name
    FROM duplicate_folders 
    WHERE rn > 1
)
SELECT 
    COUNT(DISTINCT d.id) as total_documents_in_duplicates,
    COUNT(DISTINCT dfi.id) as duplicate_folders_with_documents,
    COALESCE(SUM(d.file_size / 1024.0 / 1024.0), 0)::numeric(10,2) as total_size_mb
FROM duplicate_folder_ids dfi
LEFT JOIN documents d ON d.parent_folder_id = dfi.id;

-- Show some examples of duplicate folders with documents
\echo ''
\echo '=== EXAMPLE DUPLICATE FOLDERS WITH DOCUMENTS ==='
WITH duplicate_folders AS (
    SELECT 
        id,
        folder_name,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY folder_name, project_id ORDER BY created_at) as rn
    FROM document_folders
),
duplicate_with_docs AS (
    SELECT 
        df.id,
        df.folder_name,
        df.project_id,
        COUNT(d.id) as doc_count
    FROM duplicate_folders df
    LEFT JOIN documents d ON d.parent_folder_id = df.id
    WHERE df.rn > 1
    GROUP BY df.id, df.folder_name, df.project_id
    HAVING COUNT(d.id) > 0
)
SELECT 
    dwd.folder_name,
    dwd.doc_count as documents_in_folder,
    p.name as project_name
FROM duplicate_with_docs dwd
JOIN projects p ON p.id = dwd.project_id
ORDER BY dwd.doc_count DESC
LIMIT 10;

-- Project-wise duplicate summary
\echo ''
\echo '=== DUPLICATES BY PROJECT ==='
WITH project_duplicates AS (
    SELECT 
        project_id,
        COUNT(*) as total_folders,
        COUNT(*) - COUNT(DISTINCT folder_name) as duplicate_folders
    FROM document_folders
    GROUP BY project_id
    HAVING COUNT(*) > COUNT(DISTINCT folder_name)
)
SELECT 
    p.name as project_name,
    pd.total_folders,
    pd.duplicate_folders,
    ROUND(pd.duplicate_folders::numeric / pd.total_folders * 100, 1) as duplicate_percentage
FROM project_duplicates pd
JOIN projects p ON p.id = pd.project_id
ORDER BY pd.duplicate_folders DESC;