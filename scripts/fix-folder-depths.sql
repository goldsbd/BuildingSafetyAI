-- Fix folder depths to be 0-based instead of 1-based
-- This script corrects the depth values that were incorrectly calculated in the ZIP processor

BEGIN;

-- First, let's see the current state
SELECT 'Current depth distribution:' as info;
SELECT depth, COUNT(*) as folder_count 
FROM document_folders 
GROUP BY depth 
ORDER BY depth;

-- Update all folder depths to be 0-based
UPDATE document_folders 
SET depth = depth - 1,
    updated_at = CURRENT_TIMESTAMP
WHERE depth > 0;

-- Show the corrected state
SELECT 'Updated depth distribution:' as info;
SELECT depth, COUNT(*) as folder_count 
FROM document_folders 
GROUP BY depth 
ORDER BY depth;

-- Also update document folder_depth values to match
UPDATE documents 
SET folder_depth = folder_depth - 1,
    updated_at = CURRENT_TIMESTAMP
WHERE folder_depth > 0;

SELECT 'Updated document folder_depth distribution:' as info;
SELECT folder_depth, COUNT(*) as document_count 
FROM documents 
WHERE folder_depth IS NOT NULL
GROUP BY folder_depth 
ORDER BY folder_depth;

COMMIT;