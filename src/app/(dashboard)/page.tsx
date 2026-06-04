import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const stats = [
  {
    title: "Monitored Websites",
    value: "—",
    description: "Add your first website to begin",
    icon: Globe,
  },
  {
    title: "Total Scans",
    value: "—",
    description: "No scans yet",
    icon: ScanSearch,
  },
  {
    title: "Open Violations",
    value: "—",
    description: "Run a scan to detect violations",
    icon: ShieldAlert,
  },
  {
    title: "Avg Health Score",
    value: "—",
    description: "Calculated after first scan",
    icon: ShieldCheck,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your privacy compliance across all web properties.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>
            Your latest compliance scan results will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ScanSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">No scans yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Add a website and run your first scan to see privacy compliance
              results here.
            </p>
            <Badge variant="outline" className="mt-4">
              Get started &rarr; Websites
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
