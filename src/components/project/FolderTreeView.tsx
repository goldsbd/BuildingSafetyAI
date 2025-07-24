import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { foldersApi } from '@/lib/api/folders';
import type { DocumentFolder } from '@/lib/api/types';

interface FolderTreeNode extends DocumentFolder {
  children?: FolderTreeNode[];
}

interface FolderTreeViewProps {
  projectId: string;
  selectedFolderId?: string;
  selectedRoot?: boolean;
  onFolderSelectCallback: (folderId: string | null, rootOnly?: boolean) => void;
}

const FolderTreeItem: React.FC<{
  folder: FolderTreeNode;
  level: number;
  selectedFolderId?: string;
  onFolderSelectCallback: (folderId: string | null, rootOnly?: boolean) => void;
}> = ({ folder, level, selectedFolderId, onFolderSelectCallback }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = folder.id === selectedFolderId;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onFolderSelectCallback(folder.id, false);
  };

  return (
    <div>
      <div
        className={cn(
          "w-full flex items-center h-7 px-2 hover:bg-gray-100 cursor-pointer text-sm",
          isSelected && "bg-blue-50 text-blue-700"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <button
          onClick={handleToggle}
          className="p-0.5 hover:bg-muted rounded mr-1"
          type="button"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}
        </button>
        <div
          className="flex items-center flex-1 min-w-0"
          onClick={handleSelect}
        >
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 mr-1.5 text-blue-500 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-gray-700">
            {folder.folder_name}
          </span>
          {folder.document_count > 0 && (
            <span className="ml-auto text-xs text-gray-500 font-medium mr-2">
              {folder.document_count}
            </span>
          )}
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onFolderSelectCallback={onFolderSelectCallback}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderTreeView: React.FC<FolderTreeViewProps> = ({
  projectId,
  selectedFolderId,
  selectedRoot = false,
  onFolderSelectCallback = () => console.log('Default callback called'),
}) => {
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoading(true);
        const folderTree = await foldersApi.getFolderTree(projectId);
        setFolders(folderTree);
      } catch (error) {
        console.error('Error fetching folders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, [projectId]);


  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {/* All Documents option */}
        <div
          className={cn(
            "flex items-center h-7 px-3 hover:bg-gray-100 cursor-pointer text-sm",
            !selectedFolderId && !selectedRoot && "bg-blue-50 text-blue-700"
          )}
          onClick={() => onFolderSelectCallback(null, false)}
        >
          <File className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
          <span className="font-medium text-gray-700">All Documents</span>
        </div>

        {/* Root Documents option */}
        <div
          className={cn(
            "flex items-center h-7 px-3 hover:bg-gray-100 cursor-pointer text-sm",
            selectedRoot && "bg-blue-50 text-blue-700"
          )}
          onClick={() => onFolderSelectCallback(null, true)}
        >
          <Folder className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
          <span className="font-medium text-gray-700">Root</span>
        </div>

          {/* Folder tree */}
          {loading ? (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              Loading folders...
            </div>
          ) : folders.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              No folders found
            </div>
          ) : (
            folders.map((folder) => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                level={0}
                selectedFolderId={selectedFolderId}
                onFolderSelectCallback={onFolderSelectCallback}
              />
            ))
          )}
      </div>
    </ScrollArea>
  );
};