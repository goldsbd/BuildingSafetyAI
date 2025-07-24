import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FolderPlus, FileBarChart, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    {
      title: "Upload Documents",
      description: "Add new compliance documents",
      icon: Upload,
      onClick: () => navigate("/documents/upload"),
      variant: "default" as const
    },
    {
      title: "View Projects",
      description: "Manage your projects",
      icon: FolderPlus,
      onClick: () => navigate("/projects"),
      variant: "outline" as const
    },
    {
      title: "View Reports",
      description: "Access evaluation reports",
      icon: FileBarChart,
      onClick: () => navigate("/evaluations/reports"),
      variant: "outline" as const
    },
    {
      title: "Settings",
      description: "Configure preferences",
      icon: Settings,
      onClick: () => navigate("/settings"),
      variant: "outline" as const
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant={action.variant}
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={action.onClick}
            >
              <div className="flex items-center gap-2">
                <action.icon className="h-4 w-4" />
                <span className="font-medium">{action.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}