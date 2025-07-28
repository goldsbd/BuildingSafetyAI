import { useState } from "react"
import { 
  LayoutDashboard, 
  FolderOpen, 
  FileText, 
  CheckCircle, 
  Settings,
  ChevronDown,
  Building2,
  LogOut,
  User,
  Upload,
  FolderTree,
  FileSearch,
  Archive,
  Shield,
  HelpCircle,
  Cog,
  Brain,
  BarChart3,
  Database
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Projects", url: "/projects", icon: FolderOpen },
]

const documentItems = [
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Categories", url: "/documents/categories", icon: FolderTree },
]

const evaluationItems = [
  { title: "Assessments", url: "/evaluations/progress", icon: FileSearch },
  { title: "Reports", url: "/evaluations/reports", icon: FileText },
]

const adminItems = [
  { title: "Questions", url: "/admin/questions", icon: HelpCircle },
  { title: "System Prompts", url: "/admin/prompts", icon: Cog },
]

const aiModelItems = [
  { title: "Model Configuration", url: "/ai-models/config", icon: Brain },
  { title: "Token Usage", url: "/ai-models/usage", icon: BarChart3 },
]

const vectorItems = [
  { title: "Vector Databases", url: "/vector-databases", icon: Database },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const { user, logout } = useAuth()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const [expandedGroups, setExpandedGroups] = useState({
    documents: true,
    evaluations: false,
    admin: false,
    aiModels: false,
    vector: false,
  })

  const isActive = (path: string) => currentPath === path
  const isGroupActive = (items: any[]) => items.some(item => isActive(item.url))

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group as keyof typeof prev]
    }))
  }

  const getNavClasses = (path: string) => cn(
    "w-full justify-start transition-colors duration-200",
    isActive(path) 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground"
  )

  const GroupHeader = ({ title, isExpanded, onToggle, hasActiveItem }: {
    title: string
    isExpanded: boolean
    onToggle: () => void
    hasActiveItem: boolean
  }) => (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between px-2 py-2 text-lg font-semibold transition-colors",
        hasActiveItem ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span>{title}</span>
      {!collapsed && (
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isExpanded ? "rotate-180" : ""
        )} />
      )}
    </button>
  )

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-center">
          <img 
            src="/images/bsai_logo.png" 
            alt="Building Safety AI" 
            className={cn(
              "transition-all duration-200",
              collapsed ? "h-24 w-auto" : "h-36 w-auto"
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} className={getNavClasses(item.url)}>
                    <item.icon className="mr-2 h-5 w-5" />
                    {!collapsed && <span className="text-base font-medium">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Documents Group */}
        <SidebarGroup>
          <GroupHeader
            title="Documents"
            isExpanded={expandedGroups.documents}
            onToggle={() => toggleGroup('documents')}
            hasActiveItem={isGroupActive(documentItems)}
          />
          {(expandedGroups.documents || collapsed) && (
            <SidebarGroupContent>
              <SidebarMenu>
                {documentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="text-base">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Evaluations Group */}
        <SidebarGroup>
          <GroupHeader
            title="Compliance"
            isExpanded={expandedGroups.evaluations}
            onToggle={() => toggleGroup('evaluations')}
            hasActiveItem={isGroupActive(evaluationItems)}
          />
          {(expandedGroups.evaluations || collapsed) && (
            <SidebarGroupContent>
              <SidebarMenu>
                {evaluationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="text-base">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Vector Databases Group */}
        <SidebarGroup>
          <GroupHeader
            title="Vector Databases"
            isExpanded={expandedGroups.vector}
            onToggle={() => toggleGroup('vector')}
            hasActiveItem={isGroupActive(vectorItems)}
          />
          {(expandedGroups.vector || collapsed) && (
            <SidebarGroupContent>
              <SidebarMenu>
                {vectorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="text-base">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Admin Group - Only show if user is admin */}
        {user?.role === 'admin' && (
          <SidebarGroup>
            <GroupHeader
              title="Administration"
              isExpanded={expandedGroups.admin}
              onToggle={() => toggleGroup('admin')}
              hasActiveItem={isGroupActive(adminItems)}
            />
            {(expandedGroups.admin || collapsed) && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavClasses(item.url)}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span className="text-base">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* AI Models Group - Only show if user is admin */}
        {user?.role === 'admin' && (
          <SidebarGroup>
            <GroupHeader
              title="AI Models"
              isExpanded={expandedGroups.aiModels}
              onToggle={() => toggleGroup('aiModels')}
              hasActiveItem={isGroupActive(aiModelItems)}
            />
            {(expandedGroups.aiModels || collapsed) && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {aiModelItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavClasses(item.url)}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span className="text-base">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        <div className="space-y-3">
          {user && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-base font-medium">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                    </span>
                    <span className="text-sm text-muted-foreground capitalize">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start"
              >
                <LogOut className="mr-2 h-5 w-5" />
                {!collapsed && <span className="text-base font-medium">Logout</span>}
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}