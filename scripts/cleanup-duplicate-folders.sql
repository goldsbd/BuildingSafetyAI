-- Script to identify and clean up duplicate folders in the database
-- This script can be run safely multiple times

-- STEP 1: Show duplicate folders summary
\echo '=== DUPLICATE FOLDERS SUMMARY ==='
WITH duplicate_folders AS (
    SELECT 
        folder_name,
        project_id,
        COUNT(*) as count,
        array_agg(id ORDER BY created_at) as folder_ids,
        array_agg(created_at ORDER BY created_at) as created_dates
    FROM document_folders
    GROUP BY folder_name, project_id
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as unique_folder_names_with_duplicates,
    SUM(count - 1) as total_extra_copies_to_remove
FROM duplicate_folders;

-- STEP 2: Show top 20 duplicate folders with details
\echo ''
\echo '=== TOP 20 DUPLICATE FOLDERS ==='
WITH duplicate_folders AS (
    SELECT 
        folder_name,
        project_id,
        COUNT(*) as duplicate_count,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created,
        array_agg(id ORDER BY created_at) as folder_ids
    FROM document_folders
    GROUP BY folder_name, project_id
    HAVING COUNT(*) > 1
)
SELECT 
    df.folder_name,
    df.duplicate_count,
    p.name as project_name,
    df.first_created::date as first_created_date,
    df.last_created::date as last_created_date
FROM duplicate_folders df
JOIN projects p ON p.id = df.project_id
ORDER BY df.duplicate_count DESC, df.folder_name
LIMIT 20;

-- STEP 3: Check if any duplicate folders have documents
\echo ''
\echo '=== CHECKING FOR DOCUMENTS IN DUPLICATE FOLDERS ==='
WITH duplicate_folders AS (
    SELECT 
        id,
        folder_name,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY folder_name, project_id ORDER BY created_at) as rn
    FROM document_folders
),
folders_to_delete AS (
    SELECT id 
    FROM duplicate_folders 
    WHERE rn > 1
)
SELECT 
    COUNT(DISTINCT d.id) as documents_in_duplicate_folders,
    COUNT(DISTINCT ftd.id) as duplicate_folders_with_documents
FROM folders_to_delete ftd
LEFT JOIN documents d ON d.parent_folder_id = ftd.id;

-- STEP 4: Create a backup table of folders to be deleted (for safety)
\echo ''
\echo '=== CREATING BACKUP TABLE ==='
DROP TABLE IF EXISTS document_folders_backup_before_dedup;
CREATE TABLE document_folders_backup_before_dedup AS
WITH duplicate_folders AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (PARTITION BY folder_name, project_id ORDER BY created_at) as rn
    FROM document_folders
)
SELECT * FROM duplicate_folders WHERE rn > 1;

SELECT COUNT(*) as backed_up_folders FROM document_folders_backup_before_dedup;

-- STEP 5: Move documents from duplicate folders to the original folder
\echo ''
\echo '=== MOVING DOCUMENTS FROM DUPLICATE FOLDERS ==='
WITH duplicate_folders AS (
    SELECT 
        id,
        folder_name,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY folder_name, project_id ORDER BY created_at) as rn
    FROM document_folders
),
folder_mapping AS (
    SELECT 
        dup.id as duplicate_id,
        orig.id as original_id,
        dup.folder_name,
        dup.project_id
    FROM duplicate_folders dup
    JOIN duplicate_folders orig ON 
        orig.folder_name = dup.folder_name 
        AND orig.project_id = dup.project_id 
        AND orig.rn = 1
    WHERE dup.rn > 1
)
UPDATE documents d
SET parent_folder_id = fm.original_id
FROM folder_mapping fm
WHERE d.parent_folder_id = fm.duplicate_id
RETURNING d.id;

-- STEP 6: Delete duplicate folders (keeping the oldest one)
\echo ''
\echo '=== DELETING DUPLICATE FOLDERS ==='
WITH duplicate_folders AS (
    SELECT 
        id,
        folder_name,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY folder_name, project_id ORDER BY created_at) as rn
    FROM document_folders
),
deleted AS (
    DELETE FROM document_folders
    WHERE id IN (
        SELECT id 
        FROM duplicate_folders 
        WHERE rn > 1
    )
    RETURNING id, folder_name
)
SELECT COUNT(*) as deleted_folders FROM deleted;

-- STEP 7: Update folder statistics
\echo ''
\echo '=== UPDATING FOLDER STATISTICS ==='
UPDATE document_folders df
SET 
    document_count = COALESCE((
        SELECT COUNT(*) 
        FROM documents d 
        WHERE d.parent_folder_id = df.id
    ), 0),
    total_size_mb = COALESCE((
        SELECT SUM(file_size / 1024.0 / 1024.0) 
        FROM documents d 
        WHERE d.parent_folder_id = df.id
    ), 0),
    updated_at = CURRENT_TIMESTAMP;

-- STEP 8: Refresh materialized view
\echo ''
\echo '=== REFRESHING MATERIALIZED VIEW ==='
REFRESH MATERIALIZED VIEW folder_stats;

-- STEP 9: Final verification
\echo ''
\echo '=== FINAL VERIFICATION ==='
WITH duplicate_check AS (
    SELECT 
        folder_name,
        project_id,
        COUNT(*) as count
    FROM document_folders
    GROUP BY folder_name, project_id
    HAVING COUNT(*) > 1
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: No duplicate folders remaining!'
        ELSE 'WARNING: ' || COUNT(*) || ' duplicate folders still exist'
    END as status
FROM duplicate_check;

-- Show folder count comparison
SELECT 
    'Folders before cleanup' as description,
    (SELECT COUNT(*) FROM document_folders_backup_before_dedup) + 
    (SELECT COUNT(*) FROM document_folders) as count
UNION ALL
SELECT 
    'Folders after cleanup' as description,
    COUNT(*) as count
FROM document_folders
UNION ALL
SELECT 
    'Folders removed' as description,
    (SELECT COUNT(*) FROM document_folders_backup_before_dedup) as count;

\echo ''
\echo '=== CLEANUP COMPLETE ==='
\echo 'Backup table "document_folders_backup_before_dedup" has been created.'
\echo 'You can drop it after verifying everything is correct:'
\echo 'DROP TABLE document_folders_backup_before_dedup;'