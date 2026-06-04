import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Bell, Users, Cpu } from "lucide-react";

const sections = [
  {
    title: "AI Engine",
    description: "Configure your LLM provider for privacy policy analysis.",
    icon: Cpu,
    status: "Requires API Key",
    statusVariant: "outline" as const,
  },
  {
    title: "API Keys",
    description:
      "Manage secrets for Cloud Scheduler, worker authentication, and webhook security.",
    icon: KeyRound,
    status: "Configured",
    statusVariant: "default" as const,
  },
  {
    title: "Notifications",
    description:
      "Set up email or Slack alerts when new violations are detected.",
    icon: Bell,
    status: "Coming Soon",
    statusVariant: "secondary" as const,
  },
  {
    title: "Team Members",
    description:
      "Invite team members and manage roles within your organization.",
    icon: Users,
    status: "Coming Soon",
    statusVariant: "secondary" as const,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization, integrations, and scanning preferences.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <Card key={section.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <section.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={section.statusVariant}>{section.status}</Badge>
              </div>
            </CardHeader>
            {i < sections.length - 1 && <Separator />}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            Current deployment configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">Runtime</span>
            <span>Next.js on Cloud Run</span>
            <span className="text-muted-foreground">Database</span>
            <span>PostgreSQL (Prisma ORM)</span>
            <span className="text-muted-foreground">Scanner</span>
            <span>Playwright (Chromium)</span>
            <span className="text-muted-foreground">Task Queue</span>
            <span>GCP Cloud Tasks</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
