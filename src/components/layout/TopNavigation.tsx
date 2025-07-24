import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Archive, Clock } from "lucide-react"

// Helper function to get page title from path
const getPageTitle = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0 || segments[0] === 'dashboard') return 'Dashboard';
  
  // Handle company routes
  if (segments[0] === 'companies') {
    if (segments.length === 1) return 'Companies';
    if (segments[2] === 'projects' && segments.length === 3) return 'Company Projects';
    if (segments[4] === 'documents') return 'Project Documents';
    return 'Companies';
  }
  
  // Handle nested routes
  if (segments[0] === 'projects') {
    if (segments[1] === 'active') return 'Active Projects';
    if (segments[1] === 'archived') return 'Archived Projects';
    return 'All Projects';
  }
  
  if (segments[0] === 'documents') {
    if (segments[1] === 'upload') return 'Document Upload';
    if (segments[1] === 'categories') return 'Document Categories';
    return 'Document Library';
  }
  
  if (segments[0] === 'evaluations') {
    if (segments[1] === 'progress') return 'Evaluations In Progress';
    if (segments[1] === 'completed') return 'Completed Evaluations';
    if (segments[1] === 'reports') return 'Evaluation Reports';
    return 'Evaluations';
  }
  
  if (segments[0] === 'settings') {
    if (segments[1] === 'account') return 'Account Settings';
    if (segments[1] === 'team') return 'Team Settings';
    if (segments[1] === 'preferences') return 'Preferences';
    return 'Settings';
  }
  
  if (segments[0] === 'admin') {
    if (segments[1] === 'dashboard') return 'Admin Dashboard';
    if (segments[1] === 'companies') return 'Companies Management';
    if (segments[1] === 'users') return 'Users Management';
    return 'Admin';
  }
  
  // Default: capitalize first letter
  return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
};

export function TopNavigation() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const [activeUploads, setActiveUploads] = useState(0);

  // Check for active uploads across all projects
  useEffect(() => {
    const checkActiveUploads = async () => {
      try {
        // For now, we'll check the current project if we're in a project context
        const pathSegments = location.pathname.split('/').filter(Boolean);
        if (pathSegments[0] === 'companies' && pathSegments[2] === 'projects' && pathSegments[3]) {
          const projectId = pathSegments[3];
          
          const response = await fetch(`/api/projects/${projectId}/bulk-upload/sessions`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          });
          
          if (response.ok) {
            const sessions = await response.json();
            const activeSessions = sessions.filter((session: any) => 
              session.status === 'pending' || session.status === 'processing'
            );
            setActiveUploads(activeSessions.length);
          }
        }
      } catch (error) {
        // Silently ignore errors
      }
    };

    checkActiveUploads();
    const interval = setInterval(checkActiveUploads, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-gradient-to-r from-blue-50 to-green-50 px-4 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger />
        
        {/* Page Title */}
        <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-green-700 bg-clip-text text-transparent">{pageTitle}</h1>
      </div>

      {/* Active Uploads Indicator */}
      {activeUploads > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            <Archive className="h-3 w-3" />
            {activeUploads} ZIP processing
          </Badge>
        </div>
      )}
    </header>
  )
}